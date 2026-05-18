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

## Tampermonkey Standards

- **Auto-update headers required:** The `.user.js` file must include `@updateURL` and `@downloadURL` pointing at the hosted copy. Without these, Tampermonkey cannot detect updates.
- **Bump `@version`** on every change so Tampermonkey detects the update.
- **Ship with debug/verbose logging disabled.** Use boolean constants (e.g., `const DEBUG = false`) and gate console output behind them. Never commit with debug flags enabled.
- **Install page:** When updating this script, update the entry in `~/repos/browser-agent/tm-scripts/index.html` and the source mapping in `sync-tm-scripts.sh`, then run `sync-tm-scripts.sh` to deploy.
