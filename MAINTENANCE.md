# Maintaining WideOpenCode

WideOpenCode is a fork of [anomalyco/opencode](https://github.com/anomalyco/opencode). We want two
things at once:

1. **A real fork** we can build and change.
2. **Automatic, low-conflict sync** with upstream so we never fall behind (the reason
   [evil-opencode](https://github.com/winmin/evil-opencode) went stale).

## The model: overlay, not hand-merges

All divergence from upstream lives in **one script**: [`script/wide/apply.ts`](./script/wide/apply.ts).
It is idempotent and is re-run after every upstream merge. Nothing is hand-merged.

```
upstream/dev ──merge(-X theirs)──▶ main ──apply.ts──▶ WideOpenCode
                                          │
                                          ├─ script/wide/apply.ts   (writes all changes)
                                          └─ script/wide/verify.ts  (fails closed)
```

`apply.ts` contains three kinds of change:

- **Prompt guardrail removal** — injects an unrestricted directive at the top of every
  `packages/core/**/prompt/*.txt` and `packages/core/src/plugin/system-prompt/*.txt`, and strips known
  refusal lines if upstream reintroduces them.
- **Overlay files** — whole-file replacements we own, e.g. `wide/README.md` → `README.md`.
- **Anchored edits** — targeted `find`/`replace` pairs for upstream-owned files (CLI binary name,
  desktop product name, window titles, update feed, etc.).

If upstream refactors a file so an anchor disappears, `apply.ts` **throws** and the sync workflow
fails. You then update the anchor. The build never silently ships upstream branding or guardrails.

## Automatic sync

[`.github/workflows/wide-sync.yml`](./.github/workflows/wide-sync.yml) runs every 6 hours (and on
demand). It:

1. Fetches `anomalyco/opencode` `dev`.
2. Merges it into `main`, preferring upstream on any conflict (`-X theirs`).
3. Runs `bun run script/wide/apply.ts` to reassert the overlay.
4. Runs `bun run script/wide/verify.ts` — fails closed if anything is missing.
5. Commits and pushes `main`.

Because step 3 re-derives every WideOpenCode change from scratch, a merge conflict on an
overlay-owned file is harmless: whatever the merge produces, `apply.ts` overwrites it.

## Doing it locally

```sh
git remote add upstream https://github.com/anomalyco/opencode.git   # once
git fetch upstream dev
git merge -X theirs upstream/dev
bun run script/wide/apply.ts
bun run script/wide/verify.ts
git add -A && git commit -m "chore: sync upstream"
```

## Adding a new customization

1. Add a `find`/`replace` pair (or an overlay file) to `script/wide/apply.ts`.
2. Run `bun run script/wide/apply.ts` and `bun run script/wide/verify.ts`.
3. Commit. The sync workflow will keep it applied forever.

Prefer anchors that are short, unique, and unlikely to change. For whole files you fully own, use the
`OVERLAY` map instead of edits.

## Releases

[`.github/workflows/wide-release.yml`](./.github/workflows/wide-release.yml) builds all CLI targets
and the desktop installers and attaches them to a GitHub release. Trigger it manually:

```sh
gh workflow run wide-release.yml -f version=2.0.30 -f tag=v2.0.30-wide
```

The desktop auto-updater is configured to read this repo's GitHub releases.

## Known differences from upstream (and why)

| Area | Choice | Reason |
| --- | --- | --- |
| CLI command | `wideopencode` (compiled binary + help text) | Requested; users see a distinct command. |
| Desktop product name | `WideOpenCode` | Requested; visible in title bar, menus, installers. |
| Desktop app id | `ai.wideopencode.desktop` | Distinct product identity. Moves the userData profile, so existing upstream settings are not reused. |
| Desktop code signing | Unsigned (macOS ad-hoc, Windows unsigned) | A fork has no Apple/Windows signing credentials. Users must clear quarantine on macOS. |
| Update feed | This repo's GitHub releases | The upstream feed would update users back to stock opencode. |
| Internal names kept as `opencode` | e.g. protocol scheme `opencode://`, `~/.opencode` CLI dir, bundled `opencode-cli` resource, storage keys | Changing these risks breaking auth, updates, and migrations for no user-visible benefit. Revisit deliberately if you want a fully independent identity. |
| npm/Homebrew/AUR/WinGet/Nix publishing | Not used | We distribute standalone binaries and desktop installers via GitHub releases only. |
