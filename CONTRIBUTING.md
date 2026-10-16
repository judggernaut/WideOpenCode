# Contributing to WideOpenCode

First off, thank you. People like you make open source worth doing. 💙

WideOpenCode is a **fork of [opencode](https://github.com/anomalyco/opencode)**. That shapes how
contributions work here, so please skim this page before opening a PR.

## The one rule that matters

Every change we make on top of upstream lives in **one place**:
[`script/wide/apply.ts`](./script/wide/apply.ts).

If your change is a *WideOpenCode customization* (a rebrand, a prompt tweak, a new default), add it
there instead of editing the upstream file directly, so our sync workflow keeps it applied forever.
See [MAINTENANCE.md](./MAINTENANCE.md) for the full model.

If your change is a *bug fix or feature that belongs in opencode itself*, please consider sending it
upstream too. We'd rather carry as little as possible.

## Getting set up

```sh
bun install
bun run dev            # run the TUI from source
```

Build the CLI:

```sh
bun run ./packages/cli/script/build.ts --single --skip-web-ui
```

## Before you open a PR

```sh
bun run check                              # lint and typecheck (must pass)
bun run script/wide/apply.ts               # if you touched apply.ts or overlays
bun run script/wide/verify.ts              # must pass
```

- Keep PRs **small and focused**. One idea per PR.
- Use conventional commit-style titles: `feat(cli): ...`, `fix(desktop): ...`, `docs: ...`.
- Branch names should be short and hyphenated, with no `feat/` prefixes (for example `wider-logo`).
- Be kind in reviews. Assume good intent.

## Adding a customization

1. Add a `find`/`replace` pair (or a whole-file overlay) to `script/wide/apply.ts`.
2. Run `bun run script/wide/apply.ts` and `bun run script/wide/verify.ts`.
3. Commit both the change and the script update.

## Reporting bugs and security issues

- Bugs and features: [open an issue](https://github.com/judggernaut/WideOpenCode/issues).
- Security: [SECURITY.md](./SECURITY.md) (please, not a public issue).

## Code of Conduct

By participating, you agree to our [Code of Conduct](./CODE_OF_CONDUCT.md). Be excellent to each
other.

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
