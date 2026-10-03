#!/usr/bin/env node
// Safety net before `wrangler deploy` in CI. Wrangler silently overrides conflicting DNS
// records and other Workers' Custom Domains when it runs without a TTY, so this asks
// Cloudflare (the same changeset wrangler uses) and fails if deploying <hostname> to
// <worker> would replace a DNS record or a domain that belongs to something else.
//
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/check-custom-domain.mjs <worker> <hostname>
const [worker, hostname] = process.argv.slice(2)
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env
if (!worker || !hostname || !token || !account) {
  throw new Error('usage: check-custom-domain.mjs <worker> <hostname> (+ CLOUDFLARE_* env)')
}
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/workers`
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

const domains = await (await fetch(`${base}/domains?hostname=${hostname}`, { headers })).json()
const foreign = (domains.result ?? []).filter(
  (d) => d.hostname === hostname && d.service !== worker,
)
if (foreign.length > 0) {
  console.error(
    `::error::${hostname} is a Custom Domain of "${foreign[0].service}", refusing to take it over`,
  )
  process.exit(1)
}

const response = await fetch(`${base}/scripts/${worker}/domains/changeset?replace_state=true`, {
  method: 'POST',
  headers,
  body: JSON.stringify([{ hostname }]),
})
const changeset = await response.json()
if (response.status === 404) {
  console.error(`::error::Worker ${worker} does not exist yet; bootstrap it first (see AGENTS.md)`)
  process.exit(1)
}
if (!changeset.success) throw new Error(JSON.stringify(changeset.errors))
if (changeset.result.conflicting.length > 0) {
  console.error(
    `::error::${hostname} has DNS records that are not managed by ${worker}; not overwriting them`,
  )
  process.exit(1)
}
console.log(`check-custom-domain: ${hostname} -> ${worker} is safe to deploy`)
