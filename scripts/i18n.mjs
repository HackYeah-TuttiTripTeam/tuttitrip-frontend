#!/usr/bin/env node
// Compiles messages/*.json into src/paraglide with the options shared with vite.config.ts.
import { compile } from '@inlang/paraglide-js'
import { paraglideOptions } from '../i18n.config.mjs'

await compile(paraglideOptions)
