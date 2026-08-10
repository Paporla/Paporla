---
name: paporla-project
description: Use when working on the Paporla project (Next.js 14 + Supabase). Provides architecture, conventions, folder structure, and key development rules. Triggered by mentions of Paporla, the project name, or when editing files in this workspace.
---

# Paporla Project

Paporla is a food rescue platform (like "Too Good To Go") connecting shops with surplus food to consumers.

## Stack

- **Framework**: Next.js 14 App Router
- **Language**: TypeScript 5 (strict mode)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Styling**: Tailwind CSS 3 (dark-first with neon green `#00ff88` primary)
- **State**: React Query (`@tanstack/react-query`) for server state
- **Forms**: react-hook-form + zod
- **Auth**: Supabase Auth with custom `user_profiles` — roles: `user`, `comercio`, `admin`, `super_admin`
- **Email**: Resend
- **Monitoring**: Sentry (production only)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Hosting**: Vercel

## Folder Structure (Next.js App Router)

```
src/
├── app/
│   ├── (public)/        # Public pages: /packs, /shops, /about, /faq, /contacto, /legal
│   ├── (auth)/          # Auth pages: /login, /register, /forgot-password, /callback
│   ├── (dashboard)/     # User dashboard: /dashboard, /reservations, /favorites, /profile
│   ├── (business)/      # Shop dashboard
│   ├── (admin)/         # Admin panel
│   └── api/             # API routes: auth, cron, email, health, notifications, packs, reservations, search
├── components/          # Organized by domain + ui/
├── hooks/               # React hooks — one concern per file
├── lib/
│   ├── supabase/        # client.ts (browser), server.ts (server), admin.ts (service_role)
│   ├── services/        # Business logic (reservationService, etc.)
│   ├── middleware/       # rateLimit.ts
│   ├── constants/       # roles.ts, etc.
│   ├── email/           # templates.ts, index.ts
│   ├── notifications/   # sendNotification.ts
│   ├── query/           # React Query provider
│   └── utils/           # cn.ts, formatPrice.ts, validations.ts, etc.
├── context/             # ThemeContext.tsx
└── types/               # TypeScript interfaces
```

## Key Conventions

- **Spanish UI**: All user-facing text in Spanish. Code/comments in English or Spanish — stay consistent per file.
- **Dark-first design**: Base theme is dark (`#0a0a1a` background). CSS variables in `globals.css` control light/dark.
- **Price handling**: Store prices in `price_cents` (integer). Use `formatPrice()` from `@/lib/utils/formatPrice`.
- **Error boundaries**: Use `<ErrorBoundary>` component for client errors. `error.tsx` and `global-error.tsx` for route-level errors.
- **Form validation**: Zod schemas in `@/lib/utils/validations.ts` — reuse them; don't redefine.
- **API responses**: Always wrap in `{ success: boolean, ...data | error: string }`.
- **No `any`**: Avoid `any` types. Use `unknown` or generated types from `@/types/database`.

## NPM Scripts

| Script                  | Purpose                        |
| ----------------------- | ------------------------------ |
| `npm run dev`           | Start dev server               |
| `npm run build`         | Production build               |
| `npm run lint`          | ESLint                         |
| `npm run format`        | Prettier write                 |
| `npm run typecheck`     | TypeScript check               |
| `npm test`              | Vitest watch                   |
| `npm run test:run`      | Vitest single run              |
| `npm run test:coverage` | Vitest with coverage (min 60%) |
| `npm run test:e2e`      | Playwright tests               |
