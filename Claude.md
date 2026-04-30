# BAP Student App — Claude Code Instructions

## Context

This repo is the Pepperdine Buenos Aires Program (BAP) student app: a mobile-first React/Vite web app for second-year undergraduates studying abroad in Buenos Aires. It reads its content via a Google Apps Script Web App that returns all sheet tabs as one JSON blob (with a direct gviz CSV fallback if the script fails), caches the response in localStorage for fast repeat opens, ships through Vercel via GitHub commits, and follows the BAP Brand Identity Guide.

- Live URL: https://baprogram.vercel.app/
- Sheet ID: `1Bn1wpsKr6-3eXRZtH-_6IxmTiQA4I157-nt-0tdmyaA`

## Reference Documents

@BAP_App_Project_Knowledge.md
@BAP_Spreadsheet_Operations_Guide.md
@Branding_Guidelines.md

The first is the developer-facing reference (architecture, components, helpers, build versions). The second is the operations-facing reference (tab schemas, column definitions, what each piece of data powers, pre-cohort checklist). The third is the brand palette, typography, voice, and tone.

`Code.gs` is the canonical source for the Apps Script consolidated data endpoint. It lives in this repo, but the live deploy is in the script editor bound to the spreadsheet, and the two have to be kept in sync manually after any edit. Re-deploys happen from the script editor (Deploy > Manage deployments > New version), not from a git push.

## Decision Rules

**Sheet first, code second.** When a request can be solved by editing the Google Sheet, recommend that path. Only touch `App.jsx` when a sheet edit can't do the job.

**The live Google Sheet is the source of truth.** Any `bapappsummerYYYY_vNN.xlsx` file in this repo or in conversation history is a snapshot, not canonical; do not assume it reflects the current state of the live sheet.

**Two docs, two jobs.** `BAP_App_Project_Knowledge.md` is developer-facing (architecture, components, helpers, build versions). `BAP_Spreadsheet_Operations_Guide.md` is operations-facing (tab schemas, column definitions, pre-cohort checklist). Lean on project knowledge for "how does the app behave"; lean on the operations guide for "what does the sheet look like."

**Bump CACHE_VERSION on schema changes.** Any change to the structure of fetched data (renamed columns, new fields the app reads, removed fields, new sheet tabs the app consumes) requires incrementing the `CACHE_VERSION` constant in `App.jsx`. The localStorage cache is keyed to that version, so a bump invalidates stale caches automatically.

**A new sheet tab the app reads requires three touches.** Add it to the sheet; add it to the `TABS` array in `Code.gs` and re-deploy the Apps Script; add the `fetchTab("...")` call to `fetchAllDataPerTab()` and the parsing logic to `normalizeData()` in `App.jsx`. Adding or renaming columns within an existing tab is just an `App.jsx` change, plus a `CACHE_VERSION` bump if the data shape changes.

**Sheet edits take up to 1 hour to appear.** The Apps Script caches its response for an hour. If a fresh edit isn't showing up, suggest hitting the Apps Script URL with `?bust=1` once in a browser to force a fresh read for the next student fetch.

**Clarify scope before shipping code.** When the size of the change isn't obvious from the request, or when other changes might be batched together, ask before editing.

**Ask before big changes.** Do not add new dependencies, introduce analytics, restructure `App.jsx` into multiple files, or alter the visual identity without explicit permission.

## Workflow

**Code edits happen on disk.** When `App.jsx`, `vite.config.js`, or `Code.gs` change, edit the file in place. No artifact downloads, no copy-paste back to GitHub.

**Preview before pushing.** For non-trivial `App.jsx` or `vite.config.js` changes, run `npm run dev` and surface the local preview URL so the change can be sanity-checked on a phone before shipping. For pure data or text edits where the visual outcome is obvious, this can be skipped.

**Bump the build version.** Every meaningful `App.jsx` change updates the `BUILD_VERSION` constant to today's date and a short summary, in the format: `YYYY-MM-DD — short summary of changes`. Do this without being asked.

**Commit messages mirror the build version.** When committing, use the BUILD_VERSION line (or a close paraphrase) as the commit message so the git log and the in-app version line up.

**Apps Script changes don't ship via git.** Edits to `Code.gs` need to be copied into the script editor and re-deployed from there. After editing `Code.gs` in the repo, remind the user that a manual re-deploy is needed.

**Shipping path: tiered.** Vercel auto-deploys from `main`, so anything that lands there goes live in ~60 seconds. Pick the path by change size:

- **Small fixes** — bug fixes, copy edits, single-helper tweaks, sheet-parsing adjustments that don't change `CACHE_VERSION` — commit and push directly to `main` once verified locally. From a worktree on a feature branch, `git push origin HEAD:main` ships the current branch's commits to remote `main` without needing to switch branches. This matches how the project has historically shipped (small commits, `BUILD_VERSION` as the commit message) and keeps iteration fast.
- **Bigger changes** — new features, schema changes that bump `CACHE_VERSION`, multi-file refactors, anything touching the visual identity — keep the work on a branch, push the branch, and merge to `main` deliberately (locally or via PR). The branch gives a clean rollback unit if the change needs to be reverted without affecting unrelated work.

Either path: ask before pushing if the size of the change is ambiguous. Never force-push `main`. The `Co-Authored-By: Claude` trailer goes on every commit.

## Documentation Hygiene

After any meaningful behavior change, schema change, or new feature, proactively update the relevant living docs so they stay in sync with reality:

- `BAP_App_Project_Knowledge.md` for code-level changes (new components, helpers, build version bump rationale, cache behavior, architectural shifts, changelog row).
- `BAP_Spreadsheet_Operations_Guide.md` for sheet-level changes (new tabs, new or renamed columns, changed parsing behavior, changes to which view a tab powers, updates to the pre-cohort checklist). When this file is touched, also update its `Last updated` line at the bottom.
- `Code.gs` for Apps Script changes (new tabs added to the `TABS` array, cache key version bumps, deploy notes).

A new sheet tab the app reads requires updating all three: project knowledge captures the parsing and component side, the operations guide captures the schema and the where-it-shows note, and `Code.gs` captures the new entry in the `TABS` array. Treat all three files as living documentation.

## Quality Bar

The bar is "works well on a student's phone." When opportunities arise to make data sync, content updates, or initial load faster, surface them and recommend the improvement rather than waiting to be asked.
