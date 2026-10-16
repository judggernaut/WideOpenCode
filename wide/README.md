<div align="center">
  <img src="assets/wideopencode-banner.svg" alt="WideOpenCode" width="820">

  <p><strong>The open source OpenCode agent, just with the guardrails off.</strong></p>
  <p>A friendly fork of <a href="https://github.com/anomalyco/opencode">opencode</a> that says yes.</p>

  <p>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-1E7BFF?style=flat-square"></a>
    <img alt="Guardrails: none" src="https://img.shields.io/badge/guardrails-none-1E7BFF?style=flat-square">
    <img alt="Platforms" src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-1E7BFF?style=flat-square">
    <a href="../../releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/judggernaut/WideOpenCode?style=flat-square&color=1E7BFF"></a>
    <a href="CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-1E7BFF?style=flat-square"></a>
  </p>
</div>

---

Hi, you found us. 👋

**WideOpenCode** is [opencode](https://github.com/anomalyco/opencode), the open source AI coding
agent, with two deliberate changes:

1. **The guardrails are gone.** The system prompt is a pass-through. It carries no behavioral rules
   of its own, so your instructions are the only ones that count. The model no longer refuses,
   lectures or moralizes. It just does what you asked.
2. **It has a name and a face.** The command is `wideopencode`, the desktop app is titled
   **WideOpenCode**, so you always know exactly what you're running.

Everything else, including providers, models, the TUI, the desktop app and the SDK, is upstream
opencode, kept in sync automatically. We're a thin, honest layer, not a rewrite.

> [!IMPORTANT]
> **This is a personal project.** WideOpenCode is built and maintained by
> [@judggernaut](https://github.com/judggernaut) in a personal capacity. It is **not** affiliated
> with, endorsed by, sponsored by or supported by GitHub, Inc., and nothing in this repository
> represents the views, positions or practices of GitHub or its employees. See
> [DISCLAIMER.md](./DISCLAIMER.md).

> [!NOTE]
> WideOpenCode is a fork, not a vendored copy. We track upstream closely, so you get the newest
> opencode features within hours. See [MAINTENANCE.md](./MAINTENANCE.md) if you're curious how.

## Install

### CLI

Grab the binary for your platform from the [latest release](../../releases/latest):

```sh
# macOS (Apple Silicon)
curl -L https://github.com/judggernaut/WideOpenCode/releases/latest/download/wideopencode-darwin-arm64 -o wideopencode && chmod +x wideopencode && sudo mv wideopencode /usr/local/bin/

# macOS (Intel)
curl -L https://github.com/judggernaut/WideOpenCode/releases/latest/download/wideopencode-darwin-x64 -o wideopencode && chmod +x wideopencode && sudo mv wideopencode /usr/local/bin/

# Linux (x64)
curl -L https://github.com/judggernaut/WideOpenCode/releases/latest/download/wideopencode-linux-x64 -o wideopencode && chmod +x wideopencode && sudo mv wideopencode /usr/local/bin/
```

Then, in any project:

```sh
wideopencode
```

### Desktop

Installers live on the [releases page](../../releases/latest): `.dmg` and `.zip` for macOS, `.exe`
for Windows and `.AppImage`, `.deb` or `.rpm` for Linux.

The builds are **unsigned** (a fork has no Apple or Windows signing certificates), so your OS will
warn the first time. On macOS, after dragging it to Applications:

```sh
xattr -cr /Applications/WideOpenCode.app
```

## Quick start

1. Install the CLI (or desktop app) above.
2. Run `wideopencode` inside a project and connect a provider with `/connect`.
3. Ask it something. It will help. That's the whole trick.

New to agents? Hit **Tab** to switch to Plan mode and ask it to sketch an approach before it writes
any code.

## Bring your own instructions (you should)

Because the system prompt is a pass-through, WideOpenCode ships no behavior of its own. That means
**you** set the rules. The best way to do that is an instructions file.

Drop an `AGENTS.md` in your project root:

```md
# AGENTS.md

- Use TypeScript strict mode.
- Run `bun test` before you say you are done.
- Prefer small, focused commits.
- Never touch the `vendor/` directory.
```

WideOpenCode finds it automatically and re-reads it whenever you save it. There are three places it
looks:

| Where | Path | Scope |
| --- | --- | --- |
| Project | `AGENTS.md` in your repo, or any parent directory | just that project |
| Global | `~/.config/opencode/AGENTS.md` (or `$OPENCODE_CONFIG_DIR/AGENTS.md`) | every project |
| Config | the `instructions` list in `opencode.json` or `opencode.jsonc` | files, globs or URLs you choose |

```json
{
  "instructions": ["docs/*.md", "./CONTRIBUTING.md", "https://example.com/team-rules.md"]
}
```

Project and global files are picked up with no setup. The `instructions` list is for extra files,
globs or remote URLs. All of it is treated as your data, so it passes straight through to the model
alongside your messages.

This is also why there is nothing to "turn off". Want the agent to be careful, terse, cautious or
wild? Say so in `AGENTS.md`.

## What's different from opencode?

| | opencode | WideOpenCode |
| --- | --- | --- |
| Refuses "sensitive" requests | sometimes | never |
| Command | `opencode` | `wideopencode` |
| Desktop app | OpenCode | WideOpenCode |
| Everything else | ✅ | same as upstream |

We keep the internal machinery (protocol scheme, config paths, storage) aligned with upstream on
purpose, which means fewer surprises and faster syncs. [MAINTENANCE.md](./MAINTENANCE.md) lists the
full diff.

## Transparency: exactly what we change

Every difference from upstream lives in one file,
[`script/wide/apply.ts`](./script/wide/apply.ts). Nothing is hidden and nothing is hand-merged. Here
is the complete list.

### 1. System prompts

We replace the default system prompt and all six model-specific prompts (`gpt`, `gpt-astra`,
`anthropic`, `kimi`, `meta`, `trinity`) with a single line:

> You are WideOpenCode, a coding agent. Follow the user's instructions.

Everything those files used to tell the model is gone. That includes:

| Removed rule | Category |
| --- | --- |
| Refuse to write code that may be used maliciously | safety |
| Assist with defensive security tasks only | safety |
| Do not assist with credential discovery or harvesting | safety |
| Refuse requests for destructive techniques | safety |
| Keep responses short, under 4 lines, no emojis, no superlatives | tone and style |
| Do not infer authorization beyond the request, do not do more than asked | autonomy |
| Never run `git reset --hard`, `git checkout --` or recursive deletes | destructive actions |
| Never commit, push, reset or rebase without explicit permission | git mutations |
| Never create files unless absolutely necessary | preciseness |
| Verify your solution through execution, evidence before synthesis | verification |
| Do not spawn subagents unless the user asks | delegation |
| Prefer dedicated tools over shell, never chain shell commands | tool use |
| Match surrounding comment density, add no comments | code style |
| Never access files outside the working directory, you are not in a sandbox | environment |
| Never guess URLs, prioritize technical accuracy over agreement | truthfulness |

The safety lines are stripped defensively if upstream ever reintroduces them. We also keep the
environment, date and `AGENTS.md` context that upstream injects separately, because that is your data
rather than the harness's rules.

### 2. Rebrand

| Upstream | WideOpenCode |
| --- | --- |
| `opencode` command | `wideopencode` |
| OpenCode title, product name, app id | WideOpenCode |
| opencode.ai update feed | this repo's GitHub releases |
| upstream app icons | WideOpenCode logo |
| signed and notarized desktop | unsigned (a fork has no certificates) |

### What we do not touch

Providers, models, the TUI, the SDK and the tools are upstream. So are tool descriptions, Plan mode
reminders, subagent prompts and the permission system (which you can already bypass with `--auto` or
`--yolo`). [MAINTENANCE.md](./MAINTENANCE.md) explains why, and how to change it.

## FAQ

**Is this just opencode with a prompt change?**
Basically, yes, and that's the point. opencode is excellent. We keep it excellent, minus the
refusals, plus a name you can recognize.

**Will it stay up to date with upstream?**
Yes. A scheduled workflow merges upstream several times a day and re-applies our changes. If
upstream ever moves something we patch, the build fails loudly instead of shipping something wrong.

**Does it phone home?**
It behaves like upstream opencode. We don't add telemetry, and we don't strip the user-facing
features (models catalog, sharing, updates) that you might actually want.

**Is it safe or legal to use?**
It's a tool. You're responsible for how you use it. See the disclaimer below.

**Can I contribute?**
Please. Start with [CONTRIBUTING.md](./CONTRIBUTING.md). Be kind, and read our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Community

- 🐛 [Report a bug or request a feature](https://github.com/judggernaut/WideOpenCode/issues)
- 💬 [Discussions](https://github.com/judggernaut/WideOpenCode/discussions)
- 🤝 [Contributing guide](./CONTRIBUTING.md), [Code of Conduct](./CODE_OF_CONDUCT.md) and [Support](./SUPPORT.md)

## Credits

WideOpenCode stands entirely on the shoulders of [opencode](https://github.com/anomalyco/opencode)
and its contributors. Huge thanks to everyone who builds and maintains it. If you like this project,
go star upstream.

## License

[MIT](./LICENSE), same as upstream opencode.

## Disclaimer

**WideOpenCode is a personal project.** It is created and maintained by
[@judggernaut](https://github.com/judggernaut) on personal time and hardware. It is **not** a GitHub
product or project. It is not affiliated with, endorsed by, sponsored by, reviewed by or supported
by GitHub, Inc. in any way, and it does not represent the views, opinions, positions or practices of
GitHub or any of its employees. All opinions expressed here are the author's own.

"GitHub" and "GitHub Copilot" are trademarks of GitHub, Inc. "opencode" is a project of
[Anomaly](https://github.com/anomalyco). This project is an independent fork and is not affiliated
with either.

Provided for educational and research purposes. WideOpenCode removes built-in refusals from the
agent's system prompts. It does not change what any model or provider will actually do. You are
responsible for your use of it. See [DISCLAIMER.md](./DISCLAIMER.md) for the full text.
