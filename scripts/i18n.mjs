#!/usr/bin/env node
// Compiles messages/*.json into src/paraglide with the options shared with vite.config.ts.
import { compile } from '@inlang/paraglide-js'
import { paraglideOptions } from '../i18n.config.mjs'

await compile(paraglideOptions)
// compile() takes ~2 s, but leaves a handle open that keeps Node alive for ~30 s more
// (measured on the CI runners). Every install, build and typecheck runs this script.
process.exit(0)
