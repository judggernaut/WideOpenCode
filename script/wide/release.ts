#!/usr/bin/env bun
import { appendFile } from "node:fs/promises"

export function releasePlan(version: unknown, tags: string[], tag?: string) {
  if (typeof version !== "string" || !/^2\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Expected a stable 2.x version, received ${JSON.stringify(version)}`)
  }

  const name = tag || `v${version}-wide`
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
    throw new Error(`Invalid release tag: ${JSON.stringify(name)}`)
  }

  return { version, tag: name, release: !tags.includes(name) }
}

if (import.meta.main) {
  const version = process.env.WIDE_VERSION || (await Bun.file("package.json").json()).version
  const repo = process.env.GITHUB_REPOSITORY
  if (!repo) throw new Error("GITHUB_REPOSITORY is required")

  const result = Bun.spawnSync(
    ["gh", "api", "--paginate", `repos/${repo}/releases?per_page=100`, "--jq", ".[].tag_name"],
    { stdout: "pipe", stderr: "pipe" },
  )
  if (result.exitCode !== 0) throw new Error(`Could not list releases: ${result.stderr.toString()}`)

  const plan = releasePlan(version, result.stdout.toString().trim().split("\n"), process.env.WIDE_TAG)
  console.log(JSON.stringify(plan))
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      Object.entries(plan)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
    )
  }
}
