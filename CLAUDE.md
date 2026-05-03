# Consult6 – Claude Instructions

## Rule: every change goes straight to production

Production = `rebrand-work` branch. Pushing to it triggers an automatic Vercel
production deploy. Do this after every task, no exceptions.

```
git add <files>
git commit -m "..."
git push origin rebrand-work
git push origin rebrand-work:main
```

Always push to both so `main` stays in sync with production.
Always develop on `rebrand-work` (or a feature branch cut from it), never branch off `main`.

## Start of every session
The SessionStart hook checks out `rebrand-work` and pulls automatically.
If for any reason the working tree is not on `rebrand-work`, run:
```
git fetch origin && git checkout rebrand-work && git pull origin rebrand-work
```

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + inline styles (dark theme, primary orange #CC5500)
- Anthropic Claude SDK for AI analysis
- jsPDF for client-side PDF generation
