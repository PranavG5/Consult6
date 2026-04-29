# Consult6 – Claude Instructions

## Deployment
After every push, always attempt to deploy via `npx vercel deploy --yes`.
The Vercel CLI may not have internet access in the sandbox environment; if it
fails to authenticate, note that pushing to the git branch triggers an
automatic Vercel preview deployment via the GitHub git integration.
Production deploys happen when a Vercel preview is manually promoted — NOT
automatically on merge to `main`.

## CRITICAL: True Production Baseline
**`main` is NOT the production baseline.** The live Vercel production deployment
runs from `claude/deploy-consult6-production-ku4Od`, which is ahead of `main`
by a large set of commits including a complete PDF rewrite (`lib/pdfGenerator.ts`),
admin panel, billing history, contact page, and more.

Before starting any new task:
1. Run `git fetch origin claude/deploy-consult6-production-ku4Od`
2. Check `git log --oneline origin/claude/deploy-consult6-production-ku4Od -5`
   to confirm you are building on the right base
3. Always branch off `origin/claude/deploy-consult6-production-ku4Od`, never off `main`
4. Never read files from the local working tree without first confirming which
   branch is checked out — the default checkout may be `main`, which is stale

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + inline styles (dark theme, primary orange #CC5500)
- Anthropic Claude SDK for AI analysis
- jsPDF for client-side PDF generation

## Branch
Feature branches follow the pattern `claude/<feature>-<id>`.
Always develop on the designated branch and push when done.
