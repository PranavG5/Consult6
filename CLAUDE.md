# Consult6 – Claude Instructions

## Deployment
After every push, always attempt to deploy via `npx vercel deploy --yes`.
The Vercel CLI may not have internet access in the sandbox environment; if it
fails to authenticate, note that pushing to the git branch triggers an
automatic Vercel preview deployment via the GitHub git integration.
Production deploys happen when changes are merged to `main`.

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + inline styles (dark theme, primary orange #CC5500)
- Anthropic Claude SDK for AI analysis
- jsPDF for client-side PDF generation

## Branch
Feature branches follow the pattern `claude/<feature>-<id>`.
Always develop on the designated branch and push when done.
