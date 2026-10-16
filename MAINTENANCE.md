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

- **System-prompt pass-through** — replaces the default prompt and every model-specific prompt under
  `packages/core/src/plugin/system-prompt/*.txt` with a single neutral line, so the harness imposes
  no behavioral rules of its own. The environment, date and AGENTS.md context that upstream injects
  separately is left alone because it is user/project data, not a harness constraint. The list of
  prompt files is discovered by glob, so a newly added upstream prompt is neutralized automatically.
- **Overlay files** — whole-file replacements we own, e.g. `wide/README.md` → `README.md`.
- **Anchored edits** — targeted `find`/`replace` pairs for upstream-owned files (CLI binary name,
  desktop product name, window titles, update feed, etc.).

If upstream refactors a file so an anchor disappears, `apply.ts` **throws** and the sync workflow
fails. You then update the anchor. The build never silently ships upstream branding or guardrails.

### What is intentionally *not* touched

The pass-through covers the agent's persona and behavioral rules. A few remaining constraints are
feature-scoped rather than persona-level, so they are left in place on purpose:

- **Tool descriptions** (e.g. "do not poll for completion") describe how to use a tool correctly.
- **Plan mode** reminders, which only apply while the user has selected Plan mode.
- **Subagent prompts** (the read-only Explore agent, the title/summary generators), which define what
  those helpers do.
- **Permissions** (the `ask`/`deny` policy in `packages/core/src/plugin/agent.ts`), which the user can
  already bypass at runtime with `--auto`/`--yolo`.

If you want any of these removed too, add an edit to `apply.ts` and document it here.

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

## Why upstream prompt changes can never come back

This is the question that matters most for the pass-through, so here is the chain of guarantees.

1. **The merge cannot keep upstream's prompt.** The sync merges with `-X theirs`, so any conflict on a
   prompt file resolves to upstream's version. That is intentional: we do not try to win the merge.
2. **`apply.ts` overwrites every prompt file afterwards.** It replaces the default prompt and every
   file matched by the glob `packages/core/src/plugin/system-prompt/*.txt` with the single
   pass-through line. Upstream's content, whether merged or not, is discarded.
3. **The glob covers new files.** If upstream adds a new model prompt, the glob finds it and
   neutralizes it without any change to our script.
4. **`verify.ts` fails closed.** It re-reads the whole prompt directories and fails if any `.txt` file
   is not exactly the pass-through line, or if any guardrail pattern appears in any file. A release
   cannot ship if this fails.
5. **The release workflow re-runs `verify.ts` before building**, so even a hand-edited `main` cannot
   publish a build with upstream prompts restored.

So an upstream change to these files can land in the merge, but it is overwritten by `apply.ts` and,
if that ever failed, the sync and the release both stop instead of shipping it.

The one case this does not cover: a brand-new mechanism that injects behavioral text somewhere other
than these prompt files (for example a new plugin that appends to `event.system`). Nothing can catch
that automatically. If upstream adds one, add an edit to `apply.ts` and a check to `verify.ts`. The
`Transparency` section of the README is the list to keep in sync with reality.

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

### Optional: signed and notarized macOS builds

By default macOS builds are ad-hoc signed, so users must run `xattr -cr` once. If you have an Apple
Developer account, add these repository secrets and the release workflow will sign with your
Developer ID and notarize automatically (no `xattr` needed):

| Secret | What it is |
| --- | --- |
| `APPLE_CERTIFICATE` | base64 of your Developer ID Application `.p12` (`base64 -i cert.p12 \| pbcopy`) |
| `APPLE_CERTIFICATE_PASSWORD` | the `.p12` password |
| `APPLE_API_KEY_P8` | contents of your App Store Connect API key (`.p8`) |
| `APPLE_API_KEY_ID` | the API key ID |
| `APPLE_API_ISSUER` | the API issuer ID |

When `APPLE_CERTIFICATE` is present, the workflow sets `WIDE_SIGN_MAC=1`, imports the certificate,
and passes the notarization key to electron-builder. The config in `electron-builder.config.ts`
reads `WIDE_SIGN_MAC` to decide between real signing (and `notarize: true`) and the ad-hoc fallback.
Without the secret, nothing changes and the ad-hoc build is produced.

Windows signing is separate: it is skipped unless the `AZURE_TRUSTED_SIGNING_*` secrets are set.

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
