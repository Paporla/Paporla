# 🥗 Paporla — Rescate Alimentario

[![CI](https://github.com/paporla/paporla/actions/workflows/ci.yml/badge.svg)](https://github.com/paporla/paporla/actions/workflows/ci.yml)

**Conectamos comercios con excedentes de comida con personas que necesitan alimentarse.**
Reduce el desperdicio, ayuda a tu comunidad. Como Too Good To Go, pero para Latinoamérica.

---

## 🚀 Arranque rápido

```bash
git clone https://github.com/paporla/paporla.git
cd paporla
npm install
cp .env.example .env.local   # edita con tus claves de Supabase y Resend
npm run dev
```

Luego ejecuta `sql/00_master_schema.sql` en Supabase Dashboard → SQL Editor.

Abre [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Stack

| Capa            | Tecnología                                        |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js 14 (App Router)                           |
| Lenguaje        | TypeScript 5 (strict)                             |
| Backend         | Supabase (PostgreSQL + Auth + RLS)                |
| Estilos         | Tailwind CSS 3 — dark-first, neón verde `#00ff88` |
| Estado servidor | React Query (`@tanstack/react-query`)             |
| Forms           | react-hook-form + Zod                             |
| Email           | Resend                                            |
| Animaciones     | Framer Motion                                     |
| Iconos          | Lucide React                                      |
| Tests           | Vitest + Playwright                               |
| Monitoreo       | Sentry (producción)                               |
| Hosting         | Vercel                                            |

---

## 📂 Estructura del proyecto

```
src/
├── app/                     # Next.js App Router
│   ├── (public)/            # Landing, /packs, /shops, /about, /faq, /contacto
│   ├── (auth)/              # /login, /register, /callback
│   ├── (dashboard)/         # Panel de usuario
│   ├── (business)/          # Panel del comercio
│   ├── (admin)/             # Panel de administración
│   └── api/                 # API REST (auth, packs, reservations, cron…)
├── components/              # Componentes React por dominio
│   ├── ui/                  # Botones, modales, toast, skeletons…
│   ├── landing/             # Hero, stats, CTA, benefits
│   ├── packs/               # Tarjetas, filtros, detalle
│   ├── reservations/        # Historial, estado
│   └── ...
├── hooks/                   # Custom hooks (useAuth, useReservations, usePacks…)
├── lib/
│   ├── supabase/            # Clientes: client.ts (browser), server.ts, admin.ts
│   ├── services/            # Lógica de negocio
│   ├── middleware/           # rateLimit.ts, csrf.ts
│   ├── email/               # Plantillas y envío
│   ├── notifications/       # Notificaciones push/in-app
│   └── utils/               # cn, formatPrice, validations, api-client
├── context/                 # ThemeContext (dark/light)
└── types/                   # Tipos TypeScript
```

---

## 🧪 Tests

```bash
npm run test:run        # Unit tests (Vitest)
npm run test:coverage   # Con cobertura (mín 60%)
npm run test:e2e        # E2E (Playwright)
npm run typecheck       # TypeScript
npm run lint            # ESLint
npm run format:check    # Prettier
```

---

## 🔒 Seguridad

- **CSP con nonces dinámicos** — sin `'unsafe-inline'`, generado por request
- **CSRF protection** — double-submit cookie en todas las mutaciones API
- **Row-Level Security** — cada tabla protegida con políticas granulares
- **Rate limiting** — dos capas: memoria + Supabase
- **HSTS** — activo en producción
- **Roles** — `user`, `comercio`, `admin`, `super_admin` con triggers anti-escalación

---

## 📧 Email

Para que los emails no lleguen a spam necesitas SPF + DKIM + DMARC.
Guía completa en [`docs/EMAIL_DNS_CONFIG.md`](docs/EMAIL_DNS_CONFIG.md).

---

## 📦 Deploy

El proyecto está listo para **Vercel**. Cada push a `master` dispara el CI:

1. Lint + TypeScript
2. Tests + cobertura
3. Security audit
4. Build de producción

Ver [`skills/paporla-deploy/SKILL.md`](skills/paporla-deploy/SKILL.md) para el checklist completo pre-lanzamiento.

---

## 🤝 Contribuir

Revisa los skills del proyecto en [`skills/`](skills/) para las convenciones, reglas de Supabase y seguridad.

---

Hecho con 💚 por Paporla — [paporla.com](https://paporla.com)
