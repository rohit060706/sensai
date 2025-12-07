# Full Stack AI Career Coach with Next JS, Neon DB, Tailwind, Prisma, Inngest, Shadcn UI Tutorial 🔥🔥
# AI Career Coach (Sensai)

## Features
- Sign in with Clerk (authentication)
- Resume builder with markdown editor + PDF download
- AI-generated cover letters (Google Gemini) with fallback
- Industry insights (salary ranges, trends) — auto-generated weekly via Inngest cron
- Practice quizzes and assessments stored to user profile
- Alumni directory with filters
- PostgreSQL (Neon) + Prisma ORM
- Deployed on Vercel

## Tech stack
- Frontend: Next.js (App Router), React, Tailwind CSS
- Auth: Clerk
- DB: PostgreSQL (Neon) via Prisma
- AI: Google Gemini (Generative API)
- Background jobs: Inngest + Redis
- Deploy: Vercel

## Setup (local)
1. Clone repo
2. Copy `.env.example` to `.env` and fill keys (DATABASE_URL, GEMINI_API_KEY, Clerk keys)
3. `npm install`
4. `npx prisma generate`
5. `npx prisma db push` (or run migrations if you use them)
6. `npx inngest dev` (for local background jobs)
7. `npm run dev`

## Deployment
- Add env variables in Vercel (DATABASE_URL, GEMINI_API_KEY, Clerk keys)
- Push to GitHub → Vercel will auto-deploy

## Troubleshooting
- Prisma DB connect errors → check `DATABASE_URL`, DB network allow-list, and role permissions.
- Gemini 404/429 → check model availability and API quotas.
- Inngest socket errors on Windows → close other processes using ports 50052/50053.

## Contributing & Notes
- Keep API keys secret.
- Use the provided mock-fallbacks if running without AI keys.
