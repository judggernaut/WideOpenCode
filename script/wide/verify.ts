#!/usr/bin/env bun
// Fail-closed verification for the WideOpenCode overlay.
//
// Runs in CI after `apply.ts` and in the release workflow. Exits non-zero if
// any rebrand edit is missing or any guardrail text is present, so an upstream
// refactor can never silently ship an un-rebranded or restricted build.
//
// Run: `bun run script/wide/verify.ts`

import { readFile } from "node:fs/promises"
import path from "node:path"
import { EDITS, GUARDRAIL_PATTERNS, OVERLAY, PROMPT_FILES, UNRESTRICTED } from "./apply"

const root = path.resolve(import.meta.dir, "../..")

const failures: string[] = []

for (const [from, to] of Object.entries(OVERLAY)) {
  const source = await readFile(path.join(root, from), "utf8")
  const dest = await readFile(path.join(root, to), "utf8").catch(() => "")
  if (source !== dest) failures.push(`overlay not applied: ${to}`)
}

for (const rel of PROMPT_FILES) {
  const text = await readFile(path.join(root, rel), "utf8")
  if (!text.startsWith(UNRESTRICTED)) failures.push(`unrestricted directive missing: ${rel}`)
  for (const pattern of GUARDRAIL_PATTERNS) {
    const match = text.match(pattern)
    if (match) failures.push(`guardrail present in ${rel}: ${match[0].trim()}`)
  }
}

for (const edit of EDITS) {
  const text = await readFile(path.join(root, edit.file), "utf8")
  if (!text.includes(edit.replace))
    failures.push(`edit not applied in ${edit.file}: expected "${edit.replace.split("\n")[0]}"`)
}

if (failures.length > 0) {
  console.error("WideOpenCode verification failed:")
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(`WideOpenCode verification passed (${EDITS.length} edits, ${PROMPT_FILES.length} prompts).`)
