#!/usr/bin/env node
// Architecture rules dependency-cruiser cannot express (it sees imports, not files or syntax).
// Run through `pnpm test:arch`.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = 'src'
const failures = []

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

const files = walk(SRC).map((path) => relative('.', path))

for (const file of files) {
  // Rule 3: hooks contain no JSX. A .ts file cannot contain JSX syntax, so ban .tsx
  // and hand-written element factories.
  if (file.startsWith('src/hooks/')) {
    if (file.endsWith('.tsx'))
      failures.push(`${file}: hooks/ must not contain .tsx files (rule 3: no JSX in hooks)`)
    if (/\bcreateElement\s*\(|jsx-runtime/.test(readFileSync(file, 'utf8'))) {
      failures.push(`${file}: hooks/ must not create React elements (rule 3: no JSX in hooks)`)
    }
  }
  // Rule 4: route files are plain wiring. .ts only, so no JSX can sneak in.
  if (file.startsWith('src/routes/') && !file.endsWith('.ts')) {
    failures.push(`${file}: route files must be .ts (rule 4: no JSX in routes, put UI in a view)`)
  }
  // Folder layout: only the agreed top-level folders exist in src/.
  const top = file.split('/')[1]
  const allowedTop = [
    'routes',
    'views',
    'components',
    'hooks',
    'stores',
    'api',
    'loaders',
    'lib',
    'styles',
  ]
  const allowedRootFiles = ['main.tsx', 'router.tsx', 'routeTree.gen.ts', 'vite-env.d.ts']
  if (file.split('/').length === 2 ? !allowedRootFiles.includes(top) : !allowedTop.includes(top)) {
    failures.push(`${file}: unexpected location; see "Folders" in AGENTS.md`)
  }
}

if (failures.length > 0) {
  console.error(
    `check-arch: ${failures.length} violation(s)\n${failures.map((f) => `  ✗ ${f}`).join('\n')}`,
  )
  process.exit(1)
}
console.log(`check-arch: ${files.length} files OK`)
