#!/usr/bin/env node
/**
 * Checagem rápida de regras mobile (tasks 0.4):
 * - Proíbe `vh` em alturas de tela cheia (usar dvh)
 * - Proíbe font-size 12/13/14px no mobile
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const VH_PATTERN = /height\s*:\s*[^;]*\b\d+vh\b/g
const SMALL_FONT_PATTERN = /font-size\s*:\s*(12|13|14)px/g

function walk (dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const e of entries) {
    if (e.startsWith('.') || e === 'node_modules' || e === '.nuxt') continue
    const full = join(dir, e)
    const st = statSync(full)
    if (st.isDirectory()) files.push(...walk(full))
    else if (['.vue', '.css', '.scss'].includes(extname(e))) files.push(full)
  }
  return files
}

const root = new URL('..', import.meta.url).pathname
const files = walk(root)
let errors = 0

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(VH_PATTERN)) {
    console.error(`[vh] ${file}: "${m[0].trim()}"`)
    errors++
  }
  for (const m of src.matchAll(SMALL_FONT_PATTERN)) {
    console.error(`[font] ${file}: "${m[0].trim()}"`)
    errors++
  }
}

if (errors) {
  console.error(`\n${errors} violation(s) found.`)
  process.exit(1)
} else {
  console.log('Style check passed.')
}
