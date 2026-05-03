# Consult6 – Claude Instructions

## CRITICAL: Production Branch is `rebrand-work` — NEVER touch `main`

The live Vercel production deployment tracks `rebrand-work`. Every push to
`rebrand-work` triggers an automatic Vercel production deploy. `main` is stale
and must never be committed to, merged into, or pushed.

A SessionStart hook (`.claude/settings.json`) automatically runs
`git checkout rebrand-work && git pull origin rebrand-work` at the start of
every session. A pre-push git hook blocks any push to `main`.

### Workflow for every task
1. Confirm you are on `rebrand-work`: `git branch --show-current`
2. Make all edits directly on `rebrand-work` (small changes) or on a feature
   branch cut from `rebrand-work` (larger changes)
3. Commit, then push to `rebrand-work`:
   `git push origin rebrand-work`
4. That push deploys to production automatically via Vercel's GitHub integration

### Never do these
- `git checkout main`
- `git merge <anything> main`
- `git push origin main`
- Branch off `main` for new work

## Deployment
`git push origin rebrand-work` = production deploy. No other step needed.
`npx vercel deploy --prod --yes` will fail to authenticate in the sandbox —
ignore it, the git push is sufficient.

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + inline styles (dark theme, primary orange #CC5500)
- Anthropic Claude SDK for AI analysis
- jsPDF for client-side PDF generation

## Branch
Feature branches follow the pattern `claude/<feature>-<id>`.
Always cut from `rebrand-work`. Always merge back into `rebrand-work`.
