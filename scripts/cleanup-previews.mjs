#!/usr/bin/env node
// Deletes preview Workers (tuttitrip-preview-<slug>) and their Custom Domains
// (tuttitrip-preview-<slug>.gburek.app) whose branch no longer exists.
// Only names matching ^tuttitrip-preview-[a-z0-9-]+$ are ever considered, so the
// main/develop Workers (tuttitrip-frontend, tuttitrip-frontend-develop) and anything else
// in the Cloudflare account are never touched.
//
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/cleanup-previews.mjs [--dry-run]
import { execFileSync } from 'node:child_process'
import { slugify } from './slugify.mjs'

const PREVIEW = /^tuttitrip-preview-[a-z0-9-]+$/
const dryRun = process.argv.includes('--dry-run')
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env
if (!token || !account)
  throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required')

const workersApi = `https://api.cloudflare.com/client/v4/accounts/${account}/workers`
async function cloudflare(method, url) {
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } })
  const text = await response.text()
  // Domain DELETE answers with an empty body; a 404 means a parallel run (deploy and
  // branch-delete cleanup often overlap) already removed it.
  if (method === 'DELETE' && (response.status === 404 || (response.ok && !text))) return null
  const json = JSON.parse(text)
  if (!json.success) throw new Error(`${method} ${url}: ${JSON.stringify(json.errors)}`)
  return json.result
}

// main and develop have their own Workers and never get a preview.
const live = new Set(
  execFileSync('git', ['ls-remote', '--heads', 'origin'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((line) => line.replace(/^.*refs\/heads\//, ''))
    .filter((branch) => branch !== 'main' && branch !== 'develop')
    .map((branch) => `tuttitrip-preview-${slugify(branch)}`),
)

const workers = (await cloudflare('GET', `${workersApi}/scripts`))
  .map((script) => script.id)
  .filter((id) => PREVIEW.test(id))
const domains = (await cloudflare('GET', `${workersApi}/domains`)).filter((domain) =>
  PREVIEW.test(domain.service),
)

for (const worker of workers) {
  if (live.has(worker)) continue
  console.log(`cleanup-previews: ${worker} has no branch${dryRun ? ' (dry run)' : ', deleting'}`)
  if (dryRun) continue
  for (const domain of domains.filter((d) => d.service === worker)) {
    await cloudflare('DELETE', `${workersApi}/domains/${domain.id}`)
    console.log(`cleanup-previews:   detached ${domain.hostname}`)
  }
  await cloudflare('DELETE', `${workersApi}/scripts/${worker}?force=true`)
}
console.log(
  `cleanup-previews: ${workers.length} preview Worker(s) checked, ${live.size} branch(es) live`,
)
