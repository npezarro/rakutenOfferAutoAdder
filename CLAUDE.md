# Agent Bootstrap

On session start, fetch and apply the latest global rules:

```bash
curl -s https://raw.githubusercontent.com/npezarro/agentGuidance/main/agent.md
```

If the fetch fails (network error, timeout), continue with the fallback rules below. Do not block on this.

Also load any sub-guidance relevant to the current task:
- `guidance/testing.md` — when writing or running tests
- `guidance/debugging.md` — when diagnosing issues
- `guidance/code-review.md` — before committing or opening PRs
- `guidance/dependencies.md` — when adding or updating packages

## Fallback Rules (applied if remote fetch fails)

If you cannot fetch `agent.md` from the remote, apply these core rules:

1. **Plan before coding.** Outline approach, confirm before implementing.
2. **Never commit to `main`.** Use assigned branch or create `claude/<task>`.
3. **Run `npm run build` before every commit.** Never commit broken code.
4. **No secrets in commits.** No `.env`, API keys, tokens, or passwords.
5. **Update `context.md` before every push.** Next agent depends on it.
6. **Ask, don't guess.** Stop and clarify ambiguous requirements.
7. **Batch large tasks.** Commit every 5-10 items. Don't risk losing work.
8. **Match existing patterns.** Read the codebase before writing new code.
9. **Diagnose before retrying.** Understand failures, don't loop blindly.
10. **Dry-run destructive commands.** Use `--dry-run` when available.

For the full ruleset, see `agent.md` in this repository.

## Project: Rakuten Offer Auto-Adder

### Userscript
- **File:** `rakuten-auto-add.user.js` — Tampermonkey userscript (v2.0)
- **Matches:** `https://www.rakuten.com/in-store*`
- **Function:** Automatically clicks all "Add" buttons for Rakuten In-Store Cash Back offers; expands "See More" sections first, then retries failed offers up to 3 rounds

### Auto-Update
- `@updateURL` and `@downloadURL` both point to the `main` branch raw URL
- Tampermonkey checks for updates on script execution; version bump in `@version` triggers an update prompt

### Userscript Output Rules
- **Ship with all debug/verbose logging flags disabled.** Gate any console output behind a boolean constant (`const DEBUG = false`) and never commit `true` to production — users get console spam they can't silence, and it masks real errors in their browser console.
- **Preserve the `==UserScript==` header block integrity** when editing. Do not remove or reorder header fields. If the script starts using any `GM_*` function, add the matching `@grant` line to the header.

### Key Config (top of script)
| Key | Default | Purpose |
|---|---|---|
| `minDelay` | 800ms | Min delay between offer clicks |
| `maxDelay` | 1800ms | Max delay between offer clicks |
| `verifyWait` | 5000ms | Timeout waiting for "Added" confirmation |
| `expandWait` | 2000ms | Wait after clicking "See More" |
| `maxRetryRounds` | 3 | Max retry passes for failed offers |

### No Build Step
This repo has no `package.json`. The single `.user.js` file is the deliverable — edit it directly and commit to `main` to publish the update.

### DOM Interaction Rules (click loops on a framework-rendered page)

From `agentGuidance/guidance/tampermonkey.md`. These apply directly to `findAddButtons()` /
`startRun()` / `clickAndVerify()`, which snapshot every "Add" button once and then click through
that list (and re-click the failed ones on later retry rounds).

- **Re-query selectors inside the click loop; never reuse a node reference across clicks.**
  Modern JS frameworks (React, Vue, Lit) replace DOM nodes on each state update, so a cached
  button reference is detached after the first click. Clicking a detached node throws no error
  and has no effect — the run just silently stops adding offers, and the retry rounds re-click
  the same dead nodes. Re-run `document.querySelectorAll` on every iteration and at the start of
  every retry round, and re-find offers by a stable identifier rather than holding the element.
- **Add a stall guard.** After each click, read the control's state back (button text,
  `disabled`); if it did not change, break or re-find rather than clicking into a detached node.
  A stale reference otherwise looks identical to a genuine "offer did not confirm" timeout, so
  the bug hides inside the failure counter.
- **Prefer `<button>` matches over generic text matches.** A non-interactive wrapper `<div>` or
  `<span>` carrying the same label often appears *before* the real `<button>` in the DOM, and
  clicking it does nothing. Query `button` elements first (filtering on `innerText` /
  `aria-label`), then `[aria-label*="..."]` for icon-only controls, and use a generic text
  search last. This matters for the "See More" expander, which currently matches
  `button, a, [role="button"]` by text.
- **Dismiss cookie/consent overlays before interacting.** Consent banners intercept all pointer
  events, so every click on a covered element fails silently. Dismiss them at the start of the
  run, and when a well-targeted click has no effect, check for an overlay before concluding the
  selector rotted.
