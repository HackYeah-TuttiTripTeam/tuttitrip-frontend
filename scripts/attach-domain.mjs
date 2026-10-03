#!/usr/bin/env node
// Attaches a Custom Domain to a Worker without ever overwriting someone else's DNS
// record or domain (override_existing_dns_record/origin = false; Cloudflare refuses
// instead). Used for preview Workers: tuttitrip-preview-<slug>.gburek.app.
//
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/attach-domain.mjs <worker> <hostname>
const [worker, hostname] = process.argv.slice(2)
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env
if (!worker || !hostname || !token || !account) {
  throw new Error('usage: attach-domain.mjs <worker> <hostname> (+ CLOUDFLARE_* env)')
}
const api = 'https://api.cloudflare.com/client/v4'
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

const zoneName = hostname.split('.').slice(-2).join('.')
const zones = await (await fetch(`${api}/zones?name=${zoneName}`, { headers })).json()
const zoneId = zones.result?.[0]?.id
if (!zoneId) throw new Error(`zone ${zoneName} not found: ${JSON.stringify(zones.errors)}`)

const response = await fetch(`${api}/accounts/${account}/workers/domains`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({
    hostname,
    service: worker,
    environment: 'production',
    zone_id: zoneId,
    override_existing_dns_record: false,
    override_existing_origin: false,
  }),
})
const result = await response.json()
if (!result.success) {
  console.error(
    `::error::Could not attach ${hostname} to ${worker}: ${JSON.stringify(result.errors)}`,
  )
  process.exit(1)
}
console.log(`attach-domain: ${hostname} -> ${worker}`)
