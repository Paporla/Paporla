### 2. `C:\Users\nvarg\Desktop\Paporla\ESTADO_DEL_PROYECTO.md` (sustituir completo)

````md
# Paporla — Estado del Proyecto

**Última actualización: 2026-09-03** (tras el ensayo general local del flujo de reserva)

Este documento es la foto estable del repo. El estado operativo del día a día
(qué se está ejecutando, pendientes inmediatos) vive en el workspace del
asistente: `ESTADO_SESION_BLOQUE_E.md` y `entregas/PLAN_BLOQUE_E_CUTOVER.md`.

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
- **CSP y cabeceras:** dinámicas con nonces en `src/middleware.ts`
  (`src/lib/middleware/csp.ts`); CSRF en `src/lib/middleware/csrf.ts`.
- **Emails:** Resend (`src/lib/email/`); los correos de Supabase Auth en local
  caen en Mailpit (127.0.0.1:54324), los de la app van al buzón real.

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
  corregidos en el camino (0042 coordenadas, id de localidad del seed,
  imágenes locales en dev, IP privada en next/image, cuenta atrás horaria).

## Qué queda por delante

- **Bloque E (en curso):** pasos 1.2 y 1.6 de la Fase 1 (documentación y
  ensayo de fusión), versión final del plan de cutover y ejecución del día D
  (fusión fast-forward a `master` + reconstrucción de la base de producción).
- **Bloque F:** MercadoPago (pagos reales), emails de reserva y entrega del
  código de recogida al cliente, notificaciones al comercio (la tabla existe
  pero aún no la alimenta ningún consumidor), liquidaciones. Requiere empresa
  constituida, cuenta de MercadoPago y Vercel Pro (ToS del plan Hobby).
- **Bloque G:** app móvil con Capacitor + lector/validador de códigos QR.
- **Lanzamiento público:** solo con Supabase Pro contratado (decisión D1).

## Cómo retomar el trabajo local

```bash
# 1. Docker Desktop encendido
npx supabase start        # base local + Mailpit + Studio
npm run dev               # web en http://localhost:3000
```
````
