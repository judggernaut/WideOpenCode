#!/usr/bin/env bun
// WideOpenCode rebrand + guardrail removal.
//
// This script is the single source of truth for every divergence from upstream
// opencode. It is run on top of a freshly merged upstream tree and is fully
// idempotent: running it twice changes nothing. If an anchor string disappears
// because upstream refactored a file, it throws so the sync fails loudly instead
// of silently shipping upstream branding or guardrails.
//
// Run after every upstream merge: `bun run script/wide/apply.ts`

import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const root = path.resolve(import.meta.dir, "../..")

const OWNER = "judggernaut"
const REPO = "WideOpenCode"

// WideOpenCode is a pass-through in system-prompt space: the harness imposes no
// behavioral rules of its own. Every prompt template below is replaced with this
// single line, so the user's own instructions (messages, AGENTS.md, environment)
// are the only source of direction. The environment/date/AGENTS.md context that
// upstream injects separately is left untouched because it is user/project data,
// not a harness constraint.
const PASSTHROUGH = `You are WideOpenCode, a coding agent. Follow the user's instructions.`

// The default system prompt plus every model-specific prompt. Discovered by glob
// so a newly added upstream prompt file is also neutralized.
const BASE_PROMPT = "packages/core/src/session/runner/prompt/system.txt"
const MODEL_PROMPT_GLOB = "packages/core/src/plugin/system-prompt/*.txt"

export function promptFiles(): string[] {
  const glob = new Bun.Glob(MODEL_PROMPT_GLOB)
  const files = [BASE_PROMPT, ...glob.scanSync({ cwd: root, onlyFiles: true })].sort()
  if (!files.includes(BASE_PROMPT)) throw new Error(`Missing base prompt: ${BASE_PROMPT}`)
  return files
}

// Guardrail lines to strip if upstream ever reintroduces them.
const GUARDRAIL_PATTERNS: RegExp[] = [
  /^.*IMPORTANT: Refuse to write code or explain code that may be used maliciously.*$/gm,
  /^.*even if the user claims it is for educational purposes.*$/gm,
  /^.*malware or any malicious code you MUST refuse.*$/gm,
  /^.*If it seems malicious, refuse to work on it.*$/gm,
  /^.*Assist with defensive security tasks only.*$/gm,
  /^.*Refuse to create, modify, or improve code that may be used maliciously.*$/gm,
  /^.*Do not assist with credential discovery or harvesting.*$/gm,
  /^.*IMPORTANT: Assist with authorized security testing.*$/gm,
  /^.*Refuse requests for destructive techniques.*$/gm,
]

type Edit = { file: string; find: string; replace: string }

// Full-file replacements (we own these files entirely).
const OVERLAY: Record<string, string> = {
  "wide/README.md": "README.md",
  "wide/CONTRIBUTING.md": "CONTRIBUTING.md",
  "wide/CODE_OF_CONDUCT.md": "CODE_OF_CONDUCT.md",
  "wide/SUPPORT.md": "SUPPORT.md",
  "wide/DISCLAIMER.md": "DISCLAIMER.md",
}

// Desktop icon sets (binary). Regenerate with assets/wideopencode-appicon.svg.
const ICON_FILES = [
  "32x32.png",
  "64x64.png",
  "128x128.png",
  "128x128@2x.png",
  "dock.png",
  "icon.png",
  "icon.icns",
  "icon.ico",
]
for (const channel of ["dev", "beta", "prod"]) {
  for (const file of ICON_FILES) {
    OVERLAY[`wide/icons/${channel}/${file}`] = `packages/desktop/icons/${channel}/${file}`
  }
}

// Targeted, line-level edits to upstream-owned files. Keep each `find` string
// long enough to be unique within its file.
const EDITS: Edit[] = [
  // ----- CLI: rename the command/binary to `wideopencode` -----
  {
    file: "packages/cli/script/build.ts",
    find: `const binary = "opencode"`,
    replace: `const binary = "wideopencode"`,
  },
  {
    file: "packages/cli/script/build.ts",
    find: `OPENCODE_CLI_NAME: "'opencode'",`,
    replace: `OPENCODE_CLI_NAME: "'wideopencode'",`,
  },
  {
    file: "packages/cli/src/commands/commands.ts",
    find: `typeof OPENCODE_CLI_NAME === "string" ? OPENCODE_CLI_NAME : "opencode"`,
    replace: `typeof OPENCODE_CLI_NAME === "string" ? OPENCODE_CLI_NAME : "wideopencode"`,
  },
  {
    file: "packages/cli/src/commands/commands.ts",
    find: `description: "OpenCode command line interface",`,
    replace: `description: "WideOpenCode command line interface",`,
  },

  // ----- Desktop: product identity -----
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `const APP_IDS = {
  dev: "ai.opencode.desktop.dev",
  beta: "ai.opencode.desktop.beta",
  prod: "ai.opencode.desktop",
} as const`,
    replace: `const APP_IDS = {
  dev: "ai.wideopencode.desktop.dev",
  beta: "ai.wideopencode.desktop.beta",
  prod: "ai.wideopencode.desktop",
} as const`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `artifactName: "opencode-desktop-\${os}-\${arch}.\${ext}",`,
    replace: `artifactName: "wideopencode-desktop-\${os}-\${arch}.\${ext}",`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        productName: "OpenCode Dev",`,
    replace: `        productName: "WideOpenCode Dev",`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        productName: "OpenCode Beta",`,
    replace: `        productName: "WideOpenCode Beta",`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        productName: "OpenCode",`,
    replace: `        productName: "WideOpenCode",`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `      name: "OpenCode",`,
    replace: `      name: "WideOpenCode",`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        protocols: { name: "OpenCode Beta", schemes: ["opencode"] },`,
    replace: `        protocols: { name: "WideOpenCode Beta", schemes: ["opencode"] },`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        protocols: { name: "OpenCode", schemes: ["opencode"] },`,
    replace: `        protocols: { name: "WideOpenCode", schemes: ["opencode"] },`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        rpm: { packageName: "opencode-dev", fpm: [metainfoFpm(appId)] },`,
    replace: `        rpm: { packageName: "wideopencode-dev", fpm: [metainfoFpm(appId)] },`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        rpm: { packageName: "opencode-beta", fpm: [metainfoFpm(appId)] },`,
    replace: `        rpm: { packageName: "wideopencode-beta", fpm: [metainfoFpm(appId)] },`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        rpm: { packageName: "opencode", fpm: [metainfoFpm(appId), legacyDesktopEntryFpm] },`,
    replace: `        rpm: { packageName: "wideopencode", fpm: [metainfoFpm(appId), legacyDesktopEntryFpm] },`,
  },

  // ----- Desktop: auto-update feed -> this fork's GitHub releases -----
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        publish: {
          provider: "generic",
          url: "https://opencode.ai/update/api/beta/desktop/opencode/",
          channel: "latest",
        },`,
    replace: `        publish: {
          provider: "github",
          owner: "${OWNER}",
          repo: "${REPO}",
        },`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `        publish: {
          provider: "generic",
          url: "https://opencode.ai/update/api/latest/desktop/opencode/",
          channel: "latest",
        },`,
    replace: `        publish: {
          provider: "github",
          owner: "${OWNER}",
          repo: "${REPO}",
        },`,
  },

  // ----- Desktop: runtime app identity -----
  {
    file: "packages/desktop/src/main/constants.ts",
    find: `const appNames: Record<string, string> = {
  dev: "OpenCode Dev",
  beta: "OpenCode Beta",
  prod: "OpenCode",
}`,
    replace: `const appNames: Record<string, string> = {
  dev: "WideOpenCode Dev",
  beta: "WideOpenCode Beta",
  prod: "WideOpenCode",
}`,
  },
  {
    file: "packages/desktop/src/main/constants.ts",
    find: `const appIDs: Record<string, string> = {
  dev: "ai.opencode.desktop.dev",
  beta: "ai.opencode.desktop.beta",
  prod: "ai.opencode.desktop",
}`,
    replace: `const appIDs: Record<string, string> = {
  dev: "ai.wideopencode.desktop.dev",
  beta: "ai.wideopencode.desktop.beta",
  prod: "ai.wideopencode.desktop",
}`,
  },
  {
    file: "packages/desktop/src/main/constants.ts",
    find: `export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "OpenCode Dev"`,
    replace: `export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "WideOpenCode Dev"`,
  },
  {
    file: "packages/desktop/src/main/constants.ts",
    find: `export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "ai.opencode.desktop.dev"`,
    replace: `export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "ai.wideopencode.desktop.dev"`,
  },

  // ----- Desktop: window titles -----
  {
    file: "packages/desktop/src/main/windows/appearance.ts",
    find: `    title: "OpenCode",`,
    replace: `    title: "WideOpenCode",`,
  },
  {
    file: "packages/desktop/src/main/windows/early.ts",
    find: `    title: "OpenCode",`,
    replace: `    title: "WideOpenCode",`,
  },
  {
    file: "packages/desktop/src/renderer/index.html",
    find: `<title>OpenCode</title>`,
    replace: `<title>WideOpenCode</title>`,
  },

  // ----- Desktop: native menu / dialog copy -----
  {
    file: "packages/app/src/runtime/i18n/desktop-native.ts",
    find: `  "desktop.menu.app": "OpenCode",`,
    replace: `  "desktop.menu.app": "WideOpenCode",`,
  },
  {
    file: "packages/app/src/runtime/i18n/desktop-native.ts",
    find: `  "desktop.menu.documentation": "OpenCode Documentation",`,
    replace: `  "desktop.menu.documentation": "WideOpenCode Documentation",`,
  },
  {
    file: "packages/app/src/runtime/i18n/desktop-native.ts",
    find: `  "desktop.menu.ariaLabel": "OpenCode menu",`,
    replace: `  "desktop.menu.ariaLabel": "WideOpenCode menu",`,
  },
  {
    file: "packages/app/src/runtime/i18n/desktop-native.ts",
    find: `  "desktop.cli.installed.message": "CLI installed to {{path}}\\n\\nRestart your terminal to use the 'opencode' command.",`,
    replace: `  "desktop.cli.installed.message": "CLI installed to {{path}}\\n\\nRestart your terminal to use the 'wideopencode' command.",`,
  },
  {
    file: "packages/app/src/runtime/i18n/desktop-native.ts",
    find: `  "desktop.recovery.loadFailed": "OpenCode failed to load",`,
    replace: `  "desktop.recovery.loadFailed": "WideOpenCode failed to load",`,
  },
  {
    file: "packages/app/src/runtime/i18n/desktop-native.ts",
    find: `  "desktop.recovery.terminated": "OpenCode window terminated unexpectedly",`,
    replace: `  "desktop.recovery.terminated": "WideOpenCode window terminated unexpectedly",`,
  },
  {
    file: "packages/app/src/runtime/i18n/desktop-native.ts",
    find: `  "desktop.recovery.unresponsive": "OpenCode is not responding",`,
    replace: `  "desktop.recovery.unresponsive": "WideOpenCode is not responding",`,
  },

  // ----- Desktop: help menu links point at this fork -----
  {
    file: "packages/app/src/shell/commands/desktop-menu.ts",
    find: `href: "https://github.com/anomalyco/opencode/issues/new?template=feature_request.yml"`,
    replace: `href: "https://github.com/${OWNER}/${REPO}/issues/new"`,
  },
  {
    file: "packages/app/src/shell/commands/desktop-menu.ts",
    find: `href: "https://github.com/anomalyco/opencode/issues/new?template=bug_report.yml"`,
    replace: `href: "https://github.com/${OWNER}/${REPO}/issues/new"`,
  },

  // ----- Desktop: Linux launcher + AppStream metadata -----
  {
    file: "packages/desktop/resources/linux/opencode-desktop.desktop",
    find: `Name=OpenCode`,
    replace: `Name=WideOpenCode`,
  },
  {
    file: "packages/desktop/scripts/copy-metainfo.ts",
    find: `const appId = channel === "prod" ? "ai.opencode.desktop" : \`ai.opencode.desktop.\${channel}\``,
    replace: `const appId = channel === "prod" ? "ai.wideopencode.desktop" : \`ai.wideopencode.desktop.\${channel}\``,
  },
  {
    file: "packages/desktop/scripts/copy-metainfo.ts",
    find: `const productName = channel === "prod" ? "OpenCode" : \`OpenCode \${channel.charAt(0).toUpperCase() + channel.slice(1)}\``,
    replace: `const productName = channel === "prod" ? "WideOpenCode" : \`WideOpenCode \${channel.charAt(0).toUpperCase() + channel.slice(1)}\``,
  },

  // ----- Desktop: bundle the renamed CLI binary -----
  {
    file: "packages/desktop/scripts/utils.ts",
    find: `  await copyFile(join(pkg, "bin", cli.os === "win32" ? "opencode.exe" : "opencode"), dest)`,
    replace: `  await copyFile(join(pkg, "bin", cli.os === "win32" ? "wideopencode.exe" : "wideopencode"), dest)`,
  },
  {
    file: "packages/desktop/scripts/utils.ts",
    find: `  if (process.platform === "win32" && process.env.GITHUB_ACTIONS === "true") {`,
    replace: `  if (process.platform === "win32" && process.env.GITHUB_ACTIONS === "true" && process.env.AZURE_TRUSTED_SIGNING_ENDPOINT) {`,
  },

  // ----- Desktop: build without upstream signing/notarization credentials -----
  // The signing hook is disabled when no certificate is present. Ad-hoc signing
  // happens in afterPack instead: signing mid-build produced an invalid signature
  // ("code has no resources but signature indicates they must be present"), which
  // macOS reports as a damaged app.
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `      sign: async (options) => {
        const { sign } = await import("app-builder-lib/out/codeSign/macCodeSign")
        await sign(macSignOptions(options))
      },
      notarize: true,`,
    replace: `      sign: async (options) => {
        if (!process.env.CSC_LINK && !process.env.CSC_NAME) return
        const { sign } = await import("app-builder-lib/out/codeSign/macCodeSign")
        await sign(macSignOptions(options))
      },
      notarize: false,`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `      if ((await stat(version)).size === 0) throw new Error(\`Bundled CLI version must be a non-empty file: \${version}\`)

      if (context.electronPlatformName !== "win32") return`,
    replace: `      if ((await stat(version)).size === 0) throw new Error(\`Bundled CLI version must be a non-empty file: \${version}\`)

      // A fork has no Apple certificate, so ad-hoc sign the finished app here, after packing and
      // before the dmg/zip are built. Doing it in the signing hook produced an invalid signature.
      if (context.electronPlatformName === "darwin" && !process.env.CSC_LINK && !process.env.CSC_NAME) {
        const { execFileSync } = await import("node:child_process")
        const app = path.join(context.appOutDir, \`\${context.packager.appInfo.productFilename}.app\`)
        execFileSync("codesign", ["--force", "--deep", "--sign", "-", app])
      }

      if (context.electronPlatformName !== "win32") return`,
  },
  {
    file: "packages/desktop/electron-builder.config.ts",
    find: `  if (process.env.GITHUB_ACTIONS !== "true") return`,
    replace: `  if (process.env.GITHUB_ACTIONS !== "true" || !process.env.AZURE_TRUSTED_SIGNING_ENDPOINT) return`,
  },
]

async function patchPrompt(rel: string): Promise<boolean> {
  const file = path.join(root, rel)
  const before = await readFile(file, "utf8")
  if (before === PASSTHROUGH) return false
  await writeFile(file, PASSTHROUGH)
  return true
}

async function patch(edit: Edit): Promise<boolean> {
  const file = path.join(root, edit.file)
  const text = await readFile(file, "utf8")

  if (text.includes(edit.replace)) return false
  if (!text.includes(edit.find))
    throw new Error(
      `Anchor not found in ${edit.file}. Upstream likely changed this file; update script/wide/apply.ts.\n` +
        `Missing:\n${edit.find}`,
    )

  await writeFile(file, text.replace(edit.find, edit.replace))
  return true
}

async function copyOverlay(from: string, to: string): Promise<boolean> {
  const source = new Uint8Array(await Bun.file(path.join(root, from)).arrayBuffer())
  const destPath = path.join(root, to)
  const existing = new Uint8Array(await Bun.file(destPath).arrayBuffer().catch(() => new ArrayBuffer(0)))
  const same = source.length === existing.length && source.every((byte, index) => byte === existing[index])
  if (same) return false
  await Bun.write(destPath, source)
  return true
}

async function main() {
  const changed: string[] = []

  for (const [from, to] of Object.entries(OVERLAY)) {
    if (await copyOverlay(from, to)) changed.push(to)
  }

  for (const rel of promptFiles()) {
    if (await patchPrompt(rel)) changed.push(rel)
  }

  for (const edit of EDITS) {
    if (await patch(edit)) changed.push(edit.file)
  }

  if (changed.length === 0) {
    console.log("WideOpenCode overlay already applied; nothing to do.")
    return
  }

  console.log(`Applied WideOpenCode overlay to ${changed.length} file(s):`)
  for (const file of [...new Set(changed)].sort()) console.log(`  ${file}`)
}

export { PASSTHROUGH, GUARDRAIL_PATTERNS, EDITS, OVERLAY }

if (import.meta.main) await main()
