import { expect, test } from "bun:test"
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { EDITS, OVERLAY, promptFiles } from "./apply"

const root = path.resolve(import.meta.dir, "../..")

test("overlay preserves packaging options, updates each feed and is idempotent", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "wide-overlay-"))
  const files = new Set([
    "script/wide/apply.ts",
    "script/wide/verify.ts",
    ".github/release/entitlements/desktop.plist",
    ".github/release/entitlements/desktop-cli.plist",
    ...EDITS.map((edit) => edit.file),
    ...Object.keys(OVERLAY),
    ...Object.values(OVERLAY),
    ...promptFiles(),
  ])
  const configFile = "packages/desktop/electron-builder.config.ts"
  const titleFile = "packages/desktop/src/renderer/index.html"

  try {
    for (const file of files) {
      await mkdir(path.dirname(path.join(dir, file)), { recursive: true })
      await cp(path.join(root, file), path.join(dir, file))
    }

    const original = await Bun.file(path.join(dir, configFile)).text()
    let config = original.replaceAll('packageName: "wideopencode', 'packageName: "opencode')
    for (const [channel, feed] of [
      ["dev", "dev"],
      ["beta", "beta"],
      ["prod", "latest"],
    ]) {
      config = config.replace(
        new RegExp(`(case "${channel}":[\\s\\S]*?publish: )\\{[\\s\\S]*?\\}`),
        `$1{
          provider: "generic",
          url: "https://opencode.ai/update/api/${feed}/desktop/opencode/",
          channel: "latest",
        }`,
      )
    }
    await Bun.write(path.join(dir, configFile), config)
    const title = (await Bun.file(path.join(dir, titleFile)).text()).replace(
      ">WideOpenCode</title>",
      ">OpenCode</title>",
    )
    await Bun.write(path.join(dir, titleFile), title)

    for (const script of ["apply", "verify"]) {
      const result = Bun.spawnSync([process.execPath, `script/wide/${script}.ts`], { cwd: dir })
      expect(result.stderr.toString()).toBe("")
      expect(result.exitCode).toBe(0)
    }

    const updated = await Bun.file(path.join(dir, configFile)).text()
    expect(updated.match(/provider: "github"/g)).toHaveLength(3)
    expect(updated).not.toContain("https://opencode.ai/update/api/")
    expect(updated.match(/packageName: "wideopencode(?:-dev|-beta)?",/g)).toHaveLength(3)
    expect(updated.match(/fpm: \[[\s\S]*?\]/g)).toEqual(original.match(/fpm: \[[\s\S]*?\]/g))
    expect(await Bun.file(path.join(dir, titleFile)).text()).toContain("<title data-sm>WideOpenCode</title>")

    const snapshot = await Promise.all([...files].map((file) => Bun.file(path.join(dir, file)).arrayBuffer()))
    const repeated = Bun.spawnSync([process.execPath, "script/wide/apply.ts"], { cwd: dir })
    expect(repeated.stderr.toString()).toBe("")
    expect(repeated.exitCode).toBe(0)
    expect(repeated.stdout.toString()).toContain("already applied")
    const after = await Promise.all([...files].map((file) => Bun.file(path.join(dir, file)).arrayBuffer()))
    expect(after).toEqual(snapshot)

    await Bun.write(path.join(dir, titleFile), title.replace(">OpenCode</title>", ">Changed upstream title</title>"))
    const missing = Bun.spawnSync([process.execPath, "script/wide/apply.ts"], { cwd: dir })
    expect(missing.exitCode).not.toBe(0)
    expect(missing.stderr.toString()).toContain(`Anchor not found in ${titleFile}`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
