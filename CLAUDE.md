# Consult6 – Claude Instructions

## Rule: every change goes straight to production

Production = `rebrand-work` branch. Pushing to it triggers an automatic Vercel
production deploy. Do this after every task, no exceptions.

```
git add <files>
git commit -m "..."
git push origin rebrand-work
```

`main` does not exist for our purposes. Never read it, branch from it, or push to it.

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
