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
