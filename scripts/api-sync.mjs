#!/usr/bin/env node
// Regenerates src/api/schema.d.ts from the backend OpenAPI document.
//
// Source, first match wins:
//   1. --url <url-or-file>         pnpm run api:sync --url https://tuttitrip-api-develop.gburek.app/openapi.json
//   2. API_SCHEMA_URL env var
//   3. VITE_API_URL env var + /openapi.json (also read from .env.local / .env)
//   4. http://localhost:8000/openapi.json
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

const OUTPUT = 'src/api/schema.d.ts'
const LOCAL_DEFAULT = 'http://localhost:8000/openapi.json'

const { values } = parseArgs({ options: { url: { type: 'string' } }, strict: true })

function readDotenv(name) {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue
    const line = readFileSync(file, 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${name}=`))
    const value = line?.slice(name.length + 1).trim()
    if (value) return value
  }
  return undefined
}

const apiUrl = process.env.VITE_API_URL || readDotenv('VITE_API_URL')
const source =
  values.url ||
  process.env.API_SCHEMA_URL ||
  (apiUrl ? `${apiUrl.replace(/\/+$/, '')}/openapi.json` : LOCAL_DEFAULT)

console.log(`api:sync: ${source} -> ${OUTPUT}`)

execFileSync(resolve('node_modules/.bin/openapi-typescript'), [source, '--output', OUTPUT], {
  stdio: 'inherit',
})
