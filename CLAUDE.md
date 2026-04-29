# Consult6 – Claude Instructions

## Deployment
After every push, always attempt to deploy via `npx vercel deploy --yes`.
The Vercel CLI may not have internet access in the sandbox environment; if it
fails to authenticate, note that pushing to the git branch triggers an
automatic Vercel preview deployment via the GitHub git integration.
Production deploys happen when a Vercel preview is manually promoted — NOT
automatically on merge to `main`.

## CRITICAL: True Production Baseline
**`main` is NOT the production baseline.** Vercel production is promoted manually
from feature branches and is frequently ahead of `main` by many commits.

Before starting any new task:
1. Use the Vercel MCP tool (`list_deployments` on project `prj_H9rT3aVqyGOlYOxJa6LH8ZSduqm2`,
   team `team_pcgvm8jSr6idsK3koFYztW1G`) to find the most recent deployment
   with `"target": "production"` and read its `meta.githubCommitRef` — that is
   the true production branch.
2. Run `git fetch origin <that-branch>` and branch off it for your work.
3. Never read files from the local working tree without first confirming which
   branch is checked out — the default checkout may be `main`, which is stale.
4. Never branch off `main` without first verifying that it matches the current
   production deployment.

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + inline styles (dark theme, primary orange #CC5500)
- Anthropic Claude SDK for AI analysis
- jsPDF for client-side PDF generation

## Branch
Feature branches follow the pattern `claude/<feature>-<id>`.
Always develop on the designated branch and push when done.
