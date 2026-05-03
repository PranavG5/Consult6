# Consult6 – Claude Instructions

## Deployment
After every push, always deploy to production by merging to `main` and pushing.
The user has granted permission to merge feature branches to `main` for production deploys.
Also attempt `npx vercel deploy --prod --yes`; if the Vercel CLI fails to authenticate
in the sandbox, the merge to `main` triggers an automatic Vercel production deployment
via the GitHub git integration.

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + inline styles (dark theme, primary orange #CC5500)
- Anthropic Claude SDK for AI analysis
- jsPDF for client-side PDF generation

## Branch
Feature branches follow the pattern `claude/<feature>-<id>`.
Always develop on the designated branch and push when done.
