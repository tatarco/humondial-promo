# Agent git workflow (repository default)

When work targets **`main`** and the user did **not** ask for a git worktree, feature-branch-only workflow, or “no git”, the default sequence is:

1. **Review** the diff (sanity, scope, no secrets).
2. **Commit** with an accurate message.
3. **Push** to the tracked remote branch (usually `origin/main`).
4. **Test** — for this repo: **`npm test`** (Vitest). Add **`npm run build`** when the change affects bundling.

Do not wait for a separate “please commit” prompt in that situation.

**Safety (unchanged):** never force-push `main` without an explicit request; no destructive git without an explicit ask; no `--no-verify` without an explicit ask; never commit `.env`, keys, or credentials.
