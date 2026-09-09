# Paporla — Estado del Proyecto

**Última actualización: 2026-09-09** (día D ejecutado + lote de hardening post-auditoría)

Este documento es la foto estable del repo. El estado operativo del día a día
(qué se está ejecutando, pendientes inmediatos, reglas de sesión) vive en el
workspace del asistente; el documento maestro actual es
`ESTADO_SESION_POST_DIA_D.md` (los anteriores, `ESTADO_SESION_BLOQUE_E.md` y
`entregas/PLAN_*`, quedan como historia).

## Arquitectura y fuente de verdad

- **Esquema de base de datos:** `supabase/migrations/` (42 migraciones,
  0001–0042). No existe `sql/00_master_schema.sql` ni ficheros `01_*.sql`
  sueltos: cualquier cambio de esquema entra como migración nueva con su
  `REVOKE ... FROM PUBLIC` + `GRANT` correspondiente.
- **Seed canónico:** `supabase/seed.sql` (mercado Chile, Región Metropolitana,
  comuna Santiago), activado en `config.toml` con `[db.seed] enabled = true`.
  Toda base nueva (local, CI o producción) nace con geografía operativa.
- **Tipos generados:** `src/types/database.generated.ts` (canónico).
- **Seguridad:** 24 tablas con RLS, ~42 funciones para `authenticated`,
  funciones `service_*` para el servidor, helpers en `app_private`.
  Tests pgTAP en `supabase/tests/` (27 tests) — pasan en local
  (`supabase test db --local`) y en CI (workflow `pgtap.yml`, se dispara al
  cambiar `supabase/**`).
- **Tests de aplicación:** 97 archivos / 727 tests con Vitest + React Testing
  Library; umbral de cobertura 60 %; lint ESLint + Prettier obligatorios.
- **CSP y cabeceras:** dinámicas con nonces en `middleware.ts` (raíz del repo)
  con `src/lib/middleware/csp.ts`; CSRF en `src/lib/middleware/csrf.ts`.
- **Emails:** Resend (`src/lib/email/`); los correos de Supabase Auth en local
  caen en Mailpit (127.0.0.1:54324), los de la app van al buzón real.
- **Crons:** los 4 endpoints `/api/cron/*` se disparan desde cron-job.org
  (no desde Vercel): cleanup-pending 5 min, lifecycle 15 min,
  cleanup-rate-limits diario, pickup-reminders diario; todos con cabecera
  `Authorization: Bearer <CRON_SECRET>`.

## Qué está terminado

- Bloques A–D del rebuild: flujo core, geolocalización, robustez, imágenes y
  storage, panel admin, permisos y auditoría de seguridad cerrada
  (hallazgo de `EXECUTE` a PUBLIC resuelto en 0041).
- Infraestructura de producción lista: dominio `www.paporla.com` canónico
  (apex 308), DNS en los CNAME recomendados de Vercel, certificado gestionado
  por Vercel, correo por Resend/SES con SPF/DKIM/DMARC configurados.
- CI completo en GitHub Actions: lint+typecheck, tests con cobertura,
  security audit, build y job pgTAP sobre base efímera con Docker.
- **Ensayo general del flujo de reserva APROBADO (2026-09-03)** en local de
  punta a punta: registro → comercio → términos → aprobación admin → pack →
  reserva → confirmación → código `P4P-`. Cinco bugs reales cazados y
  corregidos en el camino.
- **DÍA D EJECUTADO (2026-09-09):** fusión fast-forward de
  `feat/supabase-rebuild-v0-2` a `master`; producción sirve la app nueva en
  `www.paporla.com` contra el proyecto Supabase `mqdauy...`; Site URL y SMTP
  de Resend configurados; primer registro real y primera reserva real de
  producción verificados de punta a cabo; crons repuntados y verificados con
  ejecuciones manuales en 200. El proyecto Supabase viejo (`ayxonuj...`) queda
  congelado como respaldo, sin borrar; sus crons viejos, pausados.
- **Hardening post-auditoría (2026-09-09):** dependencias parcheadas (Next
  16.3.4 por RCE crítico), cookie de sesión con flag `secure` en producción,
  HSTS emitido también en modo mantenimiento, service worker sin cachear HTML
  de zonas privadas, sitemap con regeneración horaria y fechas estables.

## Qué queda por delante

- **Lote F1 (cabeza del Bloque F):** favoritos rotos en runtime (migración
  `0043_list_my_favorites` + hook por RPC), N+1 del directorio de comercios,
  datos fabricados en UI pública (`verified`/stock), bug de zona horaria +1 h
  (Chile en horario de verano), código `P4P-` visible para el cliente,
  consumidor del outbox de notificaciones, etiquetas de estado honestas.
- **Bloque F (resto):** MercadoPago (pagos reales), emails de reserva,
  liquidaciones. Requiere empresa constituida, cuenta de MercadoPago y
  Vercel Pro (ToS del plan Hobby).
- **Bloque G:** app móvil con Capacitor + lector/validador de códigos QR.
- **Pre-anuncio público:** Supabase Pro contratado (decisión D1), limpieza de
  datos de prueba, captcha Turnstile, decisiones sobre RPCs sin consumidor
  (ver backlog en `ESTADO_SESION_POST_DIA_D.md`, sección 3B).
- **Lanzamiento público:** solo con Supabase Pro contratado.

## Cómo retomar el trabajo local

```bash
# 1. Docker Desktop encendido
npx supabase start        # base local + Mailpit + Studio
npm run dev               # web en http://localhost:3000
```
