#!/usr/bin/env node
// Deletes preview Workers (tuttitrip-preview-<slug>) whose branch no longer exists.
// Only Worker names matching ^tuttitrip-preview-[a-z0-9-]+$ are ever considered, so the
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

const scripts = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts`
async function cloudflare(method, url) {
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } })
  const json = await response.json()
  if (!json.success) throw new Error(`${method} ${url}: ${JSON.stringify(json.errors)}`)
  return json.result
}

const live = new Set(
  execFileSync('git', ['ls-remote', '--heads', 'origin'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((line) => slugify(line.replace(/^.*refs\/heads\//, ''))),
)

const workers = (await cloudflare('GET', scripts))
  .map((script) => script.id)
  .filter((id) => PREVIEW.test(id))
for (const worker of workers) {
  if (live.has(worker.slice('tuttitrip-preview-'.length))) continue
  console.log(`cleanup-previews: ${worker} has no branch${dryRun ? ' (dry run)' : ', deleting'}`)
  if (!dryRun) await cloudflare('DELETE', `${scripts}/${worker}?force=true`)
}
console.log(
  `cleanup-previews: ${workers.length} preview Worker(s) checked, ${live.size} branch(es) live`,
)
