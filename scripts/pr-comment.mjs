#!/usr/bin/env node
// Creates or updates the single preview comment on pull requests (no comment spam).
// The comment is found by the marker <!-- tuttitrip-preview --> at the start of its body.
//
//   node scripts/pr-comment.mjs --pr 12 --body comment.md
//   node scripts/pr-comment.mjs --branch feature/x --body comment.md --update-only
//
// Env: GH_TOKEN, GITHUB_REPOSITORY (owner/repo), GITHUB_API_URL (optional).
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const MARKER = '<!-- tuttitrip-preview -->'
const { values } = parseArgs({
  options: {
    pr: { type: 'string' },
    branch: { type: 'string' },
    body: { type: 'string' },
    'update-only': { type: 'boolean', default: false },
  },
})
const repo = process.env.GITHUB_REPOSITORY
const api = process.env.GITHUB_API_URL ?? 'https://api.github.com'
if (!repo || !process.env.GH_TOKEN || !values.body) {
  throw new Error('GH_TOKEN, GITHUB_REPOSITORY and --body are required')
}

async function github(method, path, payload) {
  const response = await fetch(`${api}/repos/${repo}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`)
  return response.json()
}

const body = `${MARKER}\n${readFileSync(values.body, 'utf8')}`
const owner = repo.split('/')[0]
const prs = values.pr
  ? [Number(values.pr)]
  : (
      await github(
        'GET',
        `/pulls?state=all&per_page=100&head=${owner}:${encodeURIComponent(values.branch ?? '')}`,
      )
    ).map((pr) => pr.number)

for (const pr of prs) {
  const comments = await github('GET', `/issues/${pr}/comments?per_page=100`)
  const existing = comments.find((comment) => comment.body?.startsWith(MARKER))
  if (existing) {
    await github('PATCH', `/issues/comments/${existing.id}`, { body })
    console.log(`pr-comment: updated comment on #${pr}`)
  } else if (!values['update-only']) {
    await github('POST', `/issues/${pr}/comments`, { body })
    console.log(`pr-comment: created comment on #${pr}`)
  }
}
