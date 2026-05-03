# Consult6 – Claude Instructions

## CRITICAL: Production Branch is `rebrand-work`
**`main` is NOT production. Do not touch `main`.**

The live Vercel production deployment always tracks the `rebrand-work` branch.
- ALL changes must be developed on a feature branch cut from `rebrand-work`
- ALL merges to deploy go into `rebrand-work`, never `main`
- Before starting any task, run `git fetch origin && git checkout rebrand-work && git pull origin rebrand-work` to ensure you are on the correct, up-to-date production baseline
- Never read files or make edits without first confirming `git branch --show-current` returns `rebrand-work` (or a feature branch cut from it)

## Deployment
After completing changes:
1. Commit on your feature branch
2. Merge to `rebrand-work` and push: `git checkout rebrand-work && git merge <feature-branch> && git push origin rebrand-work`
3. That push triggers the automatic Vercel production deployment via the GitHub git integration
4. Also attempt `npx vercel deploy --prod --yes`; it will likely fail to authenticate in the sandbox — the push to `rebrand-work` is what actually deploys

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + inline styles (dark theme, primary orange #CC5500)
- Anthropic Claude SDK for AI analysis
- jsPDF for client-side PDF generation

## Branch
Feature branches follow the pattern `claude/<feature>-<id>`.
Always cut feature branches from `rebrand-work`, not `main`.
Merge back into `rebrand-work` to deploy.
