# 🥗 Auditoría Post-Cutover — Paporla

**Fecha**: 2026-09-09
**Rama auditada**: `feat/supabase-rebuild-v0-2` (working tree limpio)
**Alcance**: 492 archivos trackeados (396 en `src/`, 46 en `supabase/`, configs raíz, `public/`, `e2e/`, docs)
**Excluido por regla explícita**: pasarela de pagos (no se reporta como riesgo ni P0/P1)

---

## Resumen ejecutivo

La arquitectura central está **sólida**: RBAC de doble capa (middleware edge + `requireAuth` en layouts de grupo), CSRF centralizado con comparación en tiempo constante, CSP con nonces sin `'unsafe-inline'`, RLS 24/24 tablas, y el incidente de `EXECUTE a PUBLIC` (0027–0039) está **cerrado por 0041** y verificado migración por migración.

Pero hay **1 feature rota en runtime** (favoritos), **1 fallo de rendimiento grave en una página pública** (N+1 en el directorio de comercios), **1 hardening de seguridad de 1 línea pendiente** (cookies de sesión sin `Secure`) y **datos fabricados mostrados al usuario como verdad** (todos los comercios "verificados", stock "activo"). Los tests pasan porque mockean Supabase — la brecha está entre el contrato de código y los grants reales de la BD.

### Evidencia de verificación (ejecutada el 2026-09-09)

- **Build de producción**: ✅ exit 0 — 65 s, todas las rutas compiladas
- **Typecheck**: ✅ `tsc --noEmit` — 0 errores
- **Vitest**: ✅ 97 archivos / 727 tests — todos pasan (168 s)
- **Lint**: ✅ 0 errores, 13 warnings (11 × `react-hooks/set-state-in-effect`, 2 × `no-console` en `logger.ts`)
- **No ejecutado**: e2e (requiere servidor + credenciales) y pgTAP (requiere Docker con base local)

### Leyenda de diagnóstico

- [x] CORRECTO: listo y estable
- [ ] REQUIERE AJUSTE / REFACTORIZACIÓN: funciona, pero hay deuda técnica, redundancia o mala UX
- [ ] FALLO / CRÍTICO: errores de ejecución, vulnerabilidades o código roto

---

# PARTE 1 — Auditoría por módulo

## 1. Seguridad y middleware (configs raíz)

### `middleware.ts` — [ ] REQUIERE AJUSTE (1 fallo pequeño, 1 omisión)

**CÓDIGO & ARQUITECTURA**: CSRF (mutaciones `/api`) → rate limit → nonce por request → CSP → cookie CSRF → modo mantenimiento → HSTS → refresh de sesión → redirects por rol. Orden correcto. `autoRefreshToken: false` en el cliente del middleware es el patrón recomendado por Supabase SSR (no es bug). Matcher excluye bien assets, `sw.js` e imágenes.

**SEGURIDAD — hallazgo S1**: `setAll` reenvía las opciones de cookie de `@supabase/ssr` **sin añadir `secure`**. Verificado en `node_modules/@supabase/ssr/src/utils/constants.ts`: `DEFAULT_COOKIE_OPTIONS = { path, sameSite, httpOnly, maxAge }` — sin `secure`, y cero asignaciones de `secure` en `cookies.ts`. Resultado: la cookie `sb-*-auth-token` viaja sin flag `Secure` en producción. Fix de 1 línea:

```ts
// middleware.ts — dentro de setAll()
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, ...options }) => {
    const secureOptions = {
      ...options,
      ...(process.env.NODE_ENV === 'production' ? { secure: true } : {}),
    }
    request.cookies.set({ name, value, ...secureOptions })
    response.cookies.set({ name, value, ...secureOptions })
  })
}
```

**SEGURIDAD — hallazgo S2**: en modo mantenimiento se retorna `response` **antes** del bloque HSTS → con mantenimiento activo en producción, HSTS no se emite. Fix: mover el bloque HSTS antes del bloque de mantenimiento.

### `src/lib/middleware/csrf.ts` — [x] CORRECTO

Double-submit cookie + comparación en tiempo constante (sin `timingSafeEqual` en edge, recorrido completo sin cortocircuito). `httpOnly:false` justificado y documentado. `secure: prod`, `sameSite: lax`, 24 h. Reutiliza token existente (`existingToken ?? generateToken()`).

### `src/lib/middleware/csp.ts` — [ ] REQUIERE AJUSTE (aceptado, con plan de salida)

- `script-src 'self' + nonce + GTM/GA por dominio` — sin `'unsafe-inline'` ✅ (cumple regla S-02).
- **SEGURIDAD**: `style-src-attr 'unsafe-inline'` — riesgo documentado y aceptado por framer-motion/SSR (~109 componentes con `style=`). Mantener, pero planificar migración a clases/Tailwind para eliminarlo.
- `img-src https:` es amplio; `via.placeholder.com` en `next.config.js` sin referencias en `src/` — moverlo al bloque de desarrollo.

### `src/lib/middleware/rateLimit.ts` — [ ] REQUIERE AJUSTE (rendimiento)

- **CÓDIGO**: la skill del proyecto documenta rate limit de dos capas (memoria + Supabase). **La capa en memoria ya no existe**: cada request a `/api/*` con límite configurado hace `sha256` × 2 + round-trip RPC a Supabase. Correcto en consistencia (Vercel edge multi-instancia), pero añade latencia a toda la API. Fail-open bien implementado (`logger.error` + continuar). Modelo de IP documentado y correcto (Vercel sobreescribe `x-real-ip`; `x-vercel-id` para anónimos evita el cubo compartido).
- **CÓDIGO**: `applyRateLimit` retorna `NextResponse.next()` sin el nonce inyectado — irrelevante para JSON API, pero al retornar temprano se omiten CSP/HSTS en esas respuestas. Aceptable, documentarlo.

### `src/lib/supabase/admin.ts` — [x] CORRECTO

`getSupabaseAdmin()` solo en cron/notificaciones (verificado con grep global — cumple S-01). `validateCronRequest` con comparación en tiempo constante y deny-by-default si falta `CRON_SECRET`.

### `next.config.js` — [x] CORRECTO (1 ajuste)

Cabeceras duras (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy), `poweredByHeader: false`, `dangerouslyAllowLocalIP` solo dev, Sentry condicionado a config real (guard anti-placeholder). Ajuste: `via.placeholder.com` fuera de producción.

### `public/sw.js` — [ ] REQUIERE AJUSTE (2 hallazgos)

- **SEGURIDAD**: cachea **todo HTML con respuesta ok**, incluidas `/dashboard`, `/admin`, `/business`, `/profile`. En un dispositivo compartido, offline, se puede servir HTML cacheado de una sesión anterior. Fix:

```js
// En el handler de HTML (network-first)
if (response.ok && isHtml) {
  const url = new URL(event.request.url)
  const isPrivate = /^\/(dashboard|admin|business|profile|reservations|favorites|notifications)\/?/.test(url.pathname)
  if (!isPrivate) {
    const clone = response.clone()
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
  }
}
```

- **UX (menor)**: `notificationclick` con `url = '/'` por defecto: `client.url.includes('/')` es siempre true → enfoca una ventana cualquiera en vez de abrir el destino.
- Sin precache de shell (aceptable en App Router), `skipWaiting` + `clients.claim` correctos, estrategias diferenciadas API/estático/HTML correctas, fallback offline evita el TypeError de `respondWith(undefined)`. Push con iconos verificados existentes (`web-app-manifest-192x192.png` ✓, `favicon-96x96.png` ✓).

### `e2e/auth.setup.ts` — [ ] FALLO (CI miente en verde)

- **CÓDIGO & ARQUITECTURA**: sin `E2E_TEST_EMAIL/PASSWORD` hace `setup.skip(true)` → **todo el proyecto authenticated queda en skip y el pipeline pasa verde** sin ejercitar reserva/dashboard/roles (los specs dependen de `setup` vía `dependencies`). Fix:

```ts
const missing = !TEST_EMAIL || !TEST_PASSWORD
if (missing && process.env.CI) {
  throw new Error('E2E_TEST_EMAIL y E2E_TEST_PASSWORD son obligatorios en CI')
}
if (missing) {
  setup.skip(true, 'Sin credenciales locales')
  return
}
```

- Además: documentar `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` en `.env.example` (hoy ausentes).

---

## 2. Base de datos (Supabase)

### Migraciones 0001–0042 — [ ] REQUIERE AJUSTE (proceso; el incidente está cerrado)

- **SEGURIDAD — verificado migración por migración (101 funciones)**: el incidente de `EXECUTE` a `PUBLIC` (0027, 0028, 0032, 0033, 0034, 0038, 0039 → 8 funciones, incluido todo el panel admin) está **revocado íntegramente en 0041** (8 `REVOKE EXECUTE ... FROM PUBLIC` + `ALTER DEFAULT PRIVILEGES`). `0042` introduce su función nueva **cumpliendo la regla** (`REVOKE ALL ... FROM PUBLIC` línea 107 antes del `GRANT` línea 108).
- **SEGURIDAD — lección estructural**: `ALTER DEFAULT PRIVILEGES` de 0017 **no impidió** el incidente (el default se materializa al crear la función). El único mecanismo fiable demostrado es el `REVOKE` por migración. Desviaciones históricas (0014: 8 funciones sin REVOKE, mitigadas por el blanket de 0017; 0019/0020: GRANT sin REVOKE en `app_private`; 0037/0040: `CREATE OR REPLACE` sin REVOKE, hoy inocuos por preservación de ACL) son frágiles ante cambios de firma futuros (DROP+CREATE es exactamente el patrón que originó el incidente).
- **ACCIÓN PENDIENTE**: ejecutar `supabase test db` (pgTAP, 27 assertions; el test 7 con `aclexplode` verifica que ninguna función es ejecutable por PUBLIC) **contra staging** como cierre formal del incidente.
- **RLS**: 24 tablas / 24 con RLS ✅. Seed coherente con el esquema final ✅. `supabase/snippets/` **vacío** — eliminar el directorio.
- **SEGURIDAD — config**: `config.toml` con **captcha deshabilitado** (`turnstile_secret` comentado). En producción esto deja registro/login expuestos a automatización (mitigado por rate limits de Supabase Auth). AJUSTE: activar Turnstile.

### RPCs sin consumidor — [ ] REQUIERE AJUSTE (superficie muerta o features sin conectar)

Verificado: **cero call-sites** en `src/` para 7 funciones con GRANT a `authenticated`:

- `set_favorite(uuid, boolean)` — **necesaria para arreglar favoritos** (ver hallazgo F1)
- `register_device` / `revoke_device` — push no conectado (la tabla `user_devices` existe)
- `set_notification_preference` — preferencias no conectadas
- `admin_set_account_status` — **el panel admin no puede suspender/banear usuarios desde la UI** (solo cambia roles)
- `adjust_pack_stock` — stock se ajusta solo vía `update_pack_content`
- `list_public_reviews` — las reseñas existen en BD pero **ninguna página las muestra**

Decisión de producto: conectar o dropear cada una. Son la lista exacta de "features a medio cablear" post-cutover.

---

## 3. Capa de datos (`src/hooks`, `src/lib`, `src/types`)

### `src/hooks/useFavorites.ts` — [ ] FALLO / CRÍTICO (feature rota en runtime)

**CÓDIGO & ARQUITECTURA**: el hook hace acceso directo a tablas: `from('favorites').insert()`, `.delete()` y un join embebido `shop:shops(id, name, ..., verified, rating, logo_url, cover_url)`. Contrastado con `0012_permissions.sql` línea a línea:

1. `0012` otorga a `authenticated` **solo SELECT** sobre `favorites` — no hay INSERT ni DELETE (por diseño: las mutaciones van por RPC). → **agregar y quitar favorito fallan con 42501**.
2. `shops` **no está** en el allowlist SELECT de `authenticated` (y `0023` documenta que se rechazó a propósito) → **el listado de favoritos falla con permiso denegado en el join**.
3. Las columnas `shops.verified` y `shops.rating` **no existen** (`shops` tiene `status`; los agregados viven en `shop_stats`) → aunque hubiera grant, el join fallaría.

**SEGURIDAD / UX**: el corazón nunca queda marcado (el `catch` en `toggleFavorite` traga el error y devuelve `false` silenciosamente) y la página de favoritos está vacía/error. Es la única feature con fallo funcional total detectada.

**PROPUESTA — migración nueva + hook corregido** (patrón canónico del proyecto, REVOKE antes de GRANT):

```sql
-- supabase/migrations/0043_list_my_favorites.sql
BEGIN;
CREATE OR REPLACE FUNCTION public.list_my_favorites()
RETURNS TABLE (
  shop_id uuid, name text, description text, city text,
  logo_path text, cover_path text, status text, rating numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
  SELECT f.shop_id, s.name, s.description, l.name,
         s.logo_path, s.cover_path, s.status,
         COALESCE(st.rating_sum::numeric / NULLIF(st.rating_count, 0), 0)
  FROM public.favorites f
  JOIN public.shops s ON s.id = f.shop_id AND s.deleted_at IS NULL
  LEFT JOIN public.localities l ON l.id = s.locality_id
  LEFT JOIN public.shop_stats st ON st.shop_id = s.id
  WHERE f.user_id = app_private.require_active_caller()
$$;
COMMENT ON FUNCTION public.list_my_favorites() IS 'Favoritos del usuario con datos públicos del comercio.';
REVOKE EXECUTE ON FUNCTION public.list_my_favorites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_favorites() TO authenticated;
COMMIT;
```

```ts
// useFavorites.ts — corregido (RPCs canónicos, tipos del generado)
async function fetchFavorites() {
  const supabase = supabaseBrowser()
  const { data, error } = await supabase.rpc('list_my_favorites')
  if (error) throw new Error(error.message)
  return (data ?? []) as FavoriteShop[]
}
async function addFavorite(shopId: string) {
  const { error } = await supabase.rpc('set_favorite', { p_shop_id: shopId, p_favorite: true })
  if (error) throw new Error(error.message)
}
async function removeFavorite(shopId: string) {
  const { error } = await supabase.rpc('set_favorite', { p_shop_id: shopId, p_favorite: false })
  if (error) throw new Error(error.message)
}
```

### `src/hooks/useShops.ts` — [ ] FALLO / CRÍTICO (rendimiento público + errores tragados)

**CÓDIGO & ARQUITECTURA**: el directorio de comercios hace 1 `search_available_packs` y luego **hasta 50 llamadas `get_public_shop` en bucle secuencial** (`await` dentro de `for`), y cada una descarta su `error` (`const { data: payload }` sin destructuring de error). Página pública crítica = 51 round-trips encadenados.

```ts
// useShops.ts — corregido
const shops = (
  await Promise.all(
    ids.map(async (id) => {
      const { data: payload, error } = await supabase.rpc('get_public_shop', { p_shop_id: id })
      if (error) {
        logger.warn('useShops get_public_shop', id, error.message)
        return null
      }
      return normalizeShop(payload)
    }),
  )
).filter((s): s is Shop => s !== null)
```

**UX — hallazgo F4 (datos fabricados)**: `verified: true` hardcodeado (línea 50) y `rating: 0` fallback (línea 48) → **el directorio público afirma que todos los comercios están verificados**, ignorando `shops.status`. Mismo patrón en `useShop.ts` (`is_active: true`, `total_stock = remaining_stock`, `packsError` tragado). Corrección: mapear `status` real y derivar `verified = status === 'verified'`.

### `src/lib/supabase/types.ts` — [ ] REQUIERE AJUSTE (tipos legacy divergentes)

- `Reservation`, `Notification` (con `message`/`is_read`/`sent_at` — columnas que nunca existieron), `PaymentMethod/Status`, `Favorite`, `Review`, `ActivityLog` — sin consumidores o referenciando columnas inexistentes. `Shop`/`Pack` legacy (precios en `_cents`, `pickup_date`) divergen del generado (`_minor`, `pickup_start_at/end_at`) y son la causa raíz de los datos fabricados de arriba. Derivar de `database.generated.ts` (canónico) y borrar el resto.
- **`src/types/pack.ts` y `src/types/shop.ts`**: huérfanos (0 imports fuera de su directorio). Eliminar.
- Higiene destacable: **0 `any`, 0 `as any`, 0 `@ts-ignore`** en los 66 archivos del alcance. Console solo en 2 archivos (logger + analytics).

### `src/lib/utils/formatDate.ts` vs `reserve.ts` — [ ] REQUIERE AJUSTE (duplicación divergente)

`formatPickupWindow` existe dos veces con comportamientos distintos (24 h vs 12 h, fallbacks diferentes), usados por mitades distintas de la app. Unificar en un solo módulo — una reserva puede mostrarse "14:00" en un panel y "2:00 PM" en otro.

---

## 4. Router y API (`src/app`)

### Guards de rol — [x] CORRECTO

Los 3 grupos protegidos tienen guard de servidor en el layout (`requireAuth(['user'|'comercio'|'admin','super_admin'])`) leyendo el rol **canónico** de `user_profiles` (nunca `user_metadata` — editable por el usuario), con redundancia en middleware edge. **Cero páginas sin guard de servidor.** `robots.ts` bloquea `/admin`, `/business`, `/dashboard`, `/api` correctamente.

### `api/email/route.ts` — [ ] REQUIERE AJUSTE (abuso de cuota + contenido engañoso)

- **SEGURIDAD**: cualquier usuario autenticado puede disparar `welcome | reservation | pickup_reminder` **con contenido arbitrario** (título, comercio, código de recogida fabricables vía `data: z.record(z.unknown())`) a su propia dirección, sin verificación en BD de que la reserva exista. Las plantillas **sí escapan** todo dato con `escapeHtml` (verificado) — no hay inyección HTML — pero es un vector de abuso de cuota Resend y de autoengaño (emails de confirmación falsos). Mitigado por rate limit 10/min.
- **PROPUESTA**: derivar los datos desde la BD (RPC que devuelva la reserva del usuario) o mover estos envíos a server actions con verificación de propiedad, y limitar `type` a eventos generados por el sistema.

### `api/reservations/route.ts` — [ ] REQUIERE AJUSTE (validación manual)

PUT con coerciones manuales (`typeof body.id === 'string'`, sin regexp UUID, sin longitud máxima de `reason`). La BD re-checa ownership, así que no es una vulnerabilidad — es consistencia:

```ts
const cancelSchema = z.object({
  id: z.string().uuid(),
  cancel_reason: z.string().trim().min(3).max(500),
})
const parsed = cancelSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
}
```

### `api/health/route.ts` — [ ] REQUIERE AJUSTE (menor)

Formato `{status, ...}` sin `success` (inconsistente con el resto) y bajo el rate limit global 120/min — un monitor ruidoso recibe 429. Excluir del `applyRateLimit` o subir el límite.

### Loading/Error por segmento — [ ] REQUIERE AJUSTE (UX)

- `(public)` **no tiene `loading.tsx`** en ningún nivel, y `packs/[id]` y `shops/[id]` tampoco tienen `error.tsx` propio (heredan el de grupo). Es el flujo de entrada de todo comprador nuevo.
- `error.tsx` raíz solo hace `console.error`; el reporte a Sentry vive en `global-error.tsx`. Los `error.tsx` de grupo no reportan.

### `sitemap.ts` — [ ] REQUIERE AJUSTE (SEO)

`lastModified: new Date()` en todas las páginas estáticas (siempre "hoy" — rompe `If-Modified-Since`) y **sin `revalidate`**: cada request hace queries live (markets + 50 packs/mercado + 100 shops). Fix: `export const revalidate = 3600` + `lastModified` fijo.

### Riesgo operativo a confirmar — [ ] REQUIERE AJUSTE

`vercel.json` **no define `crons`** y los 4 endpoints `/api/cron/*` (lifecycle, pickup-reminders, cleanup-pending, cleanup-rate-limits) requieren trigger externo. Confirmar que los Cron Jobs están configurados en el dashboard de Vercel; si no, la expiración de packs, los recordatorios de recogida y las limpiezas **no se ejecutan en producción**.

---

## 5. Componentes UI (`src/components`)

### A11y — [ ] FALLO / CRÍTICO (1), REQUIERE AJUSTE (varios)

- **`NotificationCard.tsx:72` — CRÍTICO**: "marcar como leída" es un `motion.div` con `onClick` y `cursor-pointer` **sin `role`, `tabIndex` ni teclado** — inaccesible para teclado y lectores de pantalla:

```tsx
// Corregido
<motion.div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
  aria-label={isUnread ? 'Marcar notificación como leída' : notification.title}
  ...
>
```

- Iconos sin `aria-label`: `FavoriteButton.tsx` (corazón, además sin `aria-pressed`), `Pagination.tsx` chevrons (sin `aria-current` en página activa), `ShopDetailHeader.tsx` botón volver, `Footer.tsx` scroll-top, enlaces `<Eye/>` en activity.
- Acordeones sin `aria-expanded`: `ShopDetailInfo.tsx:139`, `RecentActivity.tsx:133`, `ReservationGroup.tsx:37-40`.
- `ShareButton.tsx:89`: backdrop sin `aria-hidden` ni cierre con ESC.
- **Áreas de toque < 44 px** (verificado en clases): `FavoriteButton` `w-8 h-8` (32 px), chevrons de paginación `p-2` (~36 px), `Button size="sm"` `px-3 py-1.5` (~30 px) usado masivamente, cierre de toast `w-4 h-4` (~24 px). Regla: `min-h-11 min-w-11` en `sm` o `p-2` + `size-5` en icon-buttons.

### Contraste (modo claro activo) — [ ] FALLO / CRÍTICO (UX)

El modo claro **está activo en producción** (ThemeScript lee `localStorage['paporla-theme'] === 'light'` y quita la clase `dark`). Verificado:

- **`Button.tsx:22`** — `primary` usa `text-white` sobre el primario claro `#0c9d61` (globals.css:27) ≈ **3.5:1 — falla WCAG AA (4.5:1) en el CTA principal de toda la app**. Mismo patrón en `GeolocationFilter.tsx:115` y `FirstStepsChecklist.tsx:99`.

```tsx
// Button.tsx — corregido (el dark ya usa text-dark, solo cambia light)
primary:
  'bg-gradient-to-r from-primary to-primary/80 text-black dark:text-dark font-bold hover:shadow-lg hover:shadow-primary/25',
// negro sobre #0c9d61 ≈ 6:1 ✅ (mismo patrón que Header:104 y EmptyState ya usan)
```

- `ReservationCard.tsx:95` — `text-[10px] dark:text-gray-600` ≈ **2.6:1** (precio/horario de reservas casi ilegibles) → `dark:text-gray-400`.
- `NotificationCard.tsx:88-90` y `NotificationDropdown.tsx:43-44` — `gray-500/600` sobre fondo oscuro ≈ 4.1:1/2.6:1 en texto pequeño → `dark:text-gray-400`.
- `ShareButton.tsx:90` y `ShopDetailHeader.tsx:38` — fondos oscuros fijos sin variante `dark:` (mancha oscura en modo claro). Gráficas Recharts con ejes `#666/#888` y tooltips fijos en ambos temas.

### Feedback visual — [ ] REQUIERE AJUSTE

- **Toast global infrautilizado**: `ToastProvider` existe y está montado, pero solo `LoginForm` y `RegisterForm` usan `useToast()`. ~13 sitios renderizan `<Toast>` local con estado propio (PackFormSimplified, FavoriteButton, admin shops/users, forgot/reset-password…). Y `ToastProvider.tsx` **duplica el bloque `toastConfig` completo** de `Toast.tsx`. Unificar bajo el provider.
- `NotificationDropdown.tsx` pinta "No hay notificaciones" **mientras carga** (ignora `loading` del hook).
- `MarketSelect.tsx:93` — loading es texto plano sin spinner.
- `PackCardPublic.tsx:103-105` — badge "Disponible" **siempre**, incluso con stock 0 (el botón sí dice "Agotado"): contradicción visual con impacto en conversión.
- Código muerto: `NotificationList.tsx:97` — `<Toast>` inalcanzable (el `if (error) return` de la línea 31 lo corta). Eliminar.
- Bien resueltos (loading + empty + error): NotificationList, TodayPickups, UserStatsGrid, NextPickupCard.

### Duplicación estructural — [ ] REQUIERE AJUSTE

- **Modal × 4** (`ConfirmModal` es el único con `role="dialog"` y focus trap; ShopModal, UserModal, ReserveModal propios). Extraer `ui/Dialog.tsx` y rehacer los 4 encima.
- **Skeleton × 8 archivos** (`PageLoader` y `PageLoadingSpinner` son casi idénticos — 27 líneas c/u; borrar uno). **Spinner × 9 inline** (`animate-spin` suelto). **EmptyState × 8 inline** (unificar con variantes `compact`/`error`).
- **Gigantes**: `PackFormSimplified.tsx` (597 líneas → extraer `usePackImageUpload`, `usePackFormSubmit`, `PackFormPublishNotice`), `BusinessProfileLayout.tsx` (408 → extraer `StatusNotice`, `ProfileHeader`).
- 132 componentes del alcance con importador real — **0 componentes huérfanos** ✅.

---

## 6. Documentación y config

- **`ESTADO_DEL_PROYECTO.md`** — [ ] REQUIERE AJUSTE: el archivo commiteado contiene **restos de una sesión anterior** (encabezado "### 2. ... (sustituir completo)" y todo el documento real envuelto en un bloque de código). Además: "CSP en `src/middleware.ts`" (está en la raíz) y referencias a `ESTADO_SESION_BLOQUE_E.md` y `entregas/PLAN_BLOQUE_E_CUTOVER.md` que no existen en el repo. El contenido de fondo está al día (42 migraciones ✓, 97 archivos/727 tests ✓ — verificado el 2026-09-09).
- **`email-templates/supabase-confirm-signup.html`** — [ ] REQUIERE AJUSTE: `hola@paporla.com` hardcodeado (duplica `NEXT_PUBLIC_CONTACT_EMAIL`), `© 2026` fijo, y la plantilla requiere subida manual al dashboard de Supabase (sin automatización documentada).
- **Assets pesados**: `public/images/logo-transparent.png` = **1 MB**, `public/favicon/favicon.svg` = **433 KB**. Optimizar (SVG simplificado/PNG comprimido) — van en cada primera carga de branding.

---

# PARTE 2 — Entregables

## 1. 🧹 Lista de Limpieza Post-Cutover

**Eliminar ya (dependencias — 0 usos verificados):**

- `react-hook-form` (deps) — la skill lo lista en el stack, pero nadie lo importa
- `cross-env`, `@eslint/eslintrc`, `vitest-mock-extended` (devDeps)

**Eliminar ya (archivos):**

- `src/types/pack.ts`, `src/types/shop.ts` (huérfanos, 0 imports)
- `supabase/snippets/` (vacío)
- Exports muertos de `src/lib/supabase/types.ts` (`Reservation`, `Notification`, `NotificationType`, `Favorite`, `Review`, `ActivityLog`, `ActivitySeverity`, `PaymentMethod/Status` legacy)

**Eliminar ya (código):**

- `NotificationList.tsx:97` — `<Toast>` inalcanzable
- `.glow-primary-lg` (`globals.css:199-201`) — sin referencias
- Wrapper de `ESTADO_DEL_PROYECTO.md` (dejar solo el documento)
- `via.placeholder.com` de `remotePatterns` de producción (`next.config.js`)
- `PageLoader.tsx` **o** `PageLoadingSpinner.tsx` (duplicados exactos)

**Unificar (refactor):**

- `formatPickupWindow` (`formatDate.ts` vs `reserve.ts`) — 1 implementación
- Modal → `ui/Dialog.tsx` (4 clientes) · Toast → solo `ToastProvider` (13 sitios a migrar) · Spinner/EmptyState → `ui/` con variantes
- Tipos de dominio → derivar de `database.generated.ts`

**Decidir (conectar o dropear las 7 RPCs sin consumidor):** `set_favorite` (¡necesaria ya!), `register_device`, `revoke_device`, `set_notification_preference`, `admin_set_account_status`, `adjust_pack_stock`, `list_public_reviews`

**Añadir:** `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` a `.env.example`

## 2. 🔴 Top 5 — Errores/Faltantes Prioritarios (excluyendo pagos)

1. **Favoritos roto en runtime** (`useFavorites.ts`): INSERT/DELETE sin grant + join a `shops` sin grant + columnas inexistentes. Feature completa muerta con fallo silencioso. Fix: migración `list_my_favorites` + usar `set_favorite` (código en Parte 1, sección 3).
2. **N+1 en el directorio de comercios** (`useShops.ts`): hasta 50 RPCs secuenciales con errores tragados en una página pública. Fix: `Promise.all` + propagación (código en Parte 1, sección 3).
3. **Cookies de sesión sin `Secure` en producción** (`middleware.ts` `setAll` + defaults de `@supabase/ssr`): fix de 1 línea, impacto de hardening directo (código en Parte 1, sección 1).
4. **Datos fabricados en UI pública** (`useShops.ts:49-50`, `useShop.ts:46,78`): directorio que afirma que todos los comercios están "verificados", packs siempre "activos", stock inventado. Problema de confianza del comprador y de decisión de compra con información falsa.
5. **A11y + contraste en los flujos principales**: tarjeta de notificación inaccesible por teclado, CTA primario que falla WCAG AA en modo claro (3.5:1), microtexto de reservas a 2.6:1, áreas de toque < 44 px. Bloquea usuarios de teclado/lectores y degrada conversión (código en Parte 1, sección 5).

**Mención especial (riesgo operativo, no P0 de código):** confirmar los Cron Jobs de Vercel (los 4 endpoints `/api/cron/*` no tienen trigger declarado en el repo) y activar captcha en Supabase. Además, ejecutar pgTAP (test 7) contra staging para cerrar formalmente el incidente de `EXECUTE a PUBLIC`.

## 3. 💡 Sugerencias UX/UI para conversión

**Compradores (oferta):**

- **Verdad en la UI**: "Verificado" solo con `status === 'verified'`, badge "Disponible" condicionado a stock, precios/horarios consistentes (un solo `formatPickupWindow`). La confianza es la moneda de un marketplace de alimentos.
- **Favoritos funcionando** (fix #1) = señal de reenganche + retención; persisten entre dispositivos al vivir en BD.
- **Reseñas en la ficha del comercio**: `reviews` y `list_public_reviews` ya existen — mostrar reseñas reales post-recogida es la prueba social más barata que tiene el catálogo hoy.
- **Skeletons en todo `(public)`** (hoy sin `loading.tsx`): primera impresión del catálogo con saltos de layout. Y corregir "No hay notificaciones" durante la carga.
- **Toasts globales en toda mutación** (reserva, cancelación, favorito): feedback inmediato de éxito; hoy 13 sitios con toasts locales inconsistentes.
- **Empty states con CTA**: "Aún no tienes reservas → Explorar packs" / "Este comercio no tiene packs ahora → Notificarme cuando publiquen" (habilita `set_notification_preference`).
- **A11y como conversión**: targets de 44 px, `aria-pressed` en el corazón, focus visible — sin esto, un segmento entero no puede comprar.
- **Push para compradores**: conectar `register_device`/`revoke_device` y notificar "tu pack de mañana" — activación directa del marketplace.

**Vendedores (demanda):**

- **Onboarding de confianza**: mostrar el `status` real de la tienda (pendiente/verificado/suspendido) en el panel — hoy el negocio no ve su propio estado canónico reflejado.
- **Panel admin completo**: exponer `admin_set_account_status` (suspender/banear cuentas) — hoy solo hay cambio de rol.
- **Notificaciones al comercio de nuevas reservas** (la tabla existe, ningún consumidor la alimenta): un comercio que no se entera de sus reservas no recompra la experiencia de vender.
- **Analytics de primera sesión**: el checklist `FirstStepsChecklist` ya existe — enlazarlo a métricas de progreso (fotos + packs publicados = más visibilidad en el catálogo).

---

## Estado de cierre

**Lo que está bien** (verificado, no asumido): RBAC completo en servidor + edge, CSRF/CSP/nonces, RLS 24/24, incidente de `EXECUTE` cerrado por 0041 con 0042 cumpliendo la regla, `getSupabaseAdmin` acotado, JSON-LD con escape, plantillas de email con `escapeHtml`, 0 `any` en la capa de datos, build/typecheck/727 tests en verde.

**Pendientes de acción**: los 5 prioritarios (con código propuesto en este documento), la limpieza de ~10 elementos fantasma, 4 decisiones de producto sobre RPCs sin cablear, y 3 verificaciones externas (crons de Vercel, captcha, pgTAP en staging).

---

# PARTE 3 — La verdad detrás del informe (lectura estratégica)

> Esta sección responde a "qué falta de verdad", más allá de la lista técnica. Los hechos ya están en las Partes 1 y 2; aquí está el porqué y el orden de ataque.

## Las 5 verdades, en orden de gravedad

**1. El CI es ciego a los bugs de runtime.** Los 727 tests pasan, el build pasa, y aun así favoritos está roto en producción hoy. La razón es estructural: los tests unitarios mockean Supabase y el e2e se salta solo si no hay credenciales (verde falso). Mientras "verde" signifique "unit tests con mocks", cualquier feature puede morir en runtime sin que nadie lo vea. Es exactamente lo que pasó con favoritos. **La definición de "hecho" no está conectada con la base de datos real.**

**2. Lo que no se ensayó localmente, está roto o a medio cablear.** El flujo de reserva se ensayó de punta a punta y funciona. Favoritos, push, notificaciones al comercio, reseñas, suspensión de cuentas — nada de eso se ejercitó — y son exactamente las piezas rotas (favoritos), sin cablear (push/preferencias) o invisibles (reseñas en BD que nadie muestra). No es casualidad: es la frontera exacta del ensayo general. Todo lo que se añada sin una prueba contra la base real heredará ese destino.

**3. El "pulso" de la plataforma depende de algo que no está en el repo.** Los 4 endpoints cron existen, pero `vercel.json` no declara ningún trigger. Si no están configurados en el dashboard de Vercel, la expiración de packs, los recordatorios de recogida y las limpiezas no corren. Con reservas de confirmación manual, el sistema completo depende de ese pegamento operativo. **Es la verificación que no se puede hacer desde el código — hay que mirar el dashboard.**

**4. El marketplace no tiene su producto de confianza todavía.** Los comercios aparecen todos "verificados" (falso), las reseñas reales existen pero no se muestran, y el comercio no ve su propio estado canónico. En un marketplace de comida, la confianza es el producto; hoy la UI la declara en vez de demostrarla. La infraestructura para demostrarla (status, reseñas, moderación) ya existe — solo no está expuesta.

**5. Las notificaciones son una promesa, no un sistema.** La tabla existe, las RPCs de registro de dispositivos existen, pero ningún consumidor las alimenta y el registro de push no está conectado. El comprador que reserva hoy no recibe nada automático. Con confirmación manual, eso es fricción en el momento de mayor ansiedad del usuario.

## Orden de ataque recomendado

1. **Crons de Vercel** — confirmar los triggers en el dashboard (2 minutos de vistazo, el riesgo más silencioso).
2. **Favoritos** — único fallo funcional total; arreglar con la migración `0043_list_my_favorites` + hook corregido (código en Parte 1, sección 3).
3. **Redefinir "hecho"** — e2e contra staging con credenciales reales + pgTAP como definición de completitud; que el e2e **falle** en CI si no hay credenciales (código en Parte 1, sección 1).
4. **Limpieza fantasma + Top 5** — solo después de los tres puntos anteriores.
5. **Decisiones de producto sobre las 7 RPCs sin cablear** — conectar o dropear.

---

# PARTE 4 — Detalles adicionales detectados (no críticos, no incluidos en las Partes 1–2)

**Código:**

- `src/app/layout.tsx:104` — el JSON-LD de Organization usa `JSON.stringify` directo en vez del helper `jsonLdToScriptContent` (que sí escapa `<`). Hoy el contenido es estático (sin riesgo), pero es inconsistente: si algún día entra un valor dinámico ahí, la puerta queda abierta. Usar el helper.
- `src/hooks/useProfile.ts:48-49` — `p_market_id: values.marketId as string` convierte `null` en `string` en runtime; tipar los parámetros como `string | null` y quitar el cast.
- `src/hooks/useMerchantTerms.ts:55-60` — fetch en `useEffect` con errores silenciados: si los términos no cargan, el usuario no ve nada y no hay estado visible de error.
- `src/hooks/useNotifications.ts` — RPC adicional por cada badge de no-leídas (N+1 reconocido en el propio código): la cuenta de no-leídas debería venir de una sola llamada.
- `src/lib/query/provider.tsx:19` — se loguea/reporta cada mutación que falla aunque el hook que la lanzó ya la maneje: ruido de observabilidad, filtrar solo las no manejadas.
- Los 11 warnings de lint `react-hooks/set-state-in-effect` (Header, ThemeContext, useAuth, LoginForm, ProfilePreview, CookieConsent*, GoogleAnalytics/TagManager, RouteLoader, reservations/page) comparten el patrón `useEffect(() => setMounted(true), [])`. Remedio: sustituir por `useSyncExternalStore` (patrón canónico de hidratación) o aceptarlos con `eslint-disable` justificado por archivo.

**PWA:**

- No existe `src/app/manifest.ts`: el manifest se sirve como archivo estático en `public/favicon/site.webmanifest` — funciona, pero Next no gestiona `manifestId` ni actualizaciones automáticas.
- `CACHE_NAME = 'paporla-v3'` en `public/sw.js` se versiona a mano: automatizarlo con un build id (p. ej. `process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`) para no depender de memoria humana en cada deploy.

**Observabilidad y operación:**

- El rate limiter en edge hace una llamada a Supabase por request limitado (latencia). Si se quiere recuperar la capa en memoria original, hacerla solo para lecturas de pre-warm (p. ej. `/api/health`) y dejar la capa canónica en BD para mutaciones.
- `email-templates/supabase-confirm-signup.html` requiere subida manual al dashboard de Supabase: documentar ese paso en `docs/` como checklist de cutover, con la versión de la plantilla y la fecha de subida.
- Falta un smoke test de integración en CI que pegue contra staging real (health + una RPC pública tipo `community_stats`): detectaría desconexiones de grants/schema antes del deploy, no después.
