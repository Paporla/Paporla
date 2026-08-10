# Paporla — Estado del Proyecto

# Última actualización: 2026-08-04

## 🟢 Fases completadas

### Fase 1 — Flujo Core + Reparaciones

- Vista SQL `available_packs` (01_available_packs_view.sql)
- Hook unificado `useCreateReservation`
- Modal de pre-confirmación en listado y detalle de packs
- Dashboard responde a `?reserved=true` con toast verde
- Empty states contextuales por ciudad/búsqueda

### Fase 2 — Geolocalización + Onboarding

- PostGIS + columna `geog` + función `search_packs_nearby` (02_postgis_geolocation.sql)
- Filtro server-side en /packs con coordenadas del navegador
- Onboarding visual "¿Cómo funciona?" en 3 pasos (Explora → Reserva → Recoge)
- Distancia en km/m en las cards de packs

### Fase 3 — Robustez + Analytics

- 3 hooks migrados a React Query (useShops, useShop, useFavorites)
- Error Boundaries en secciones del dashboard (no se cae todo si falla una card)
- Eventos GA4 en todo el funnel: view_pack_list → click_reserve → begin_checkout → purchase

### Fase 4 — Datos + Tests

- Exportación CSV de reservas para comercios (botón "Exportar CSV")
- Índices SQL adicionales (03_performance_indexes.sql)
- 24 tests de integración para RPCs críticas (rpc-reservations.test.ts)

### Fix Extra — Imágenes

- ImageUpload re-agregado a PackFormBasicInfo (fotos de packs)
- ProfileImagesForm creado (estaba importado pero no existía)
- Paths de subida estables (shopId fijo, no Date.now())
- 3 buckets de storage con políticas RLS (shop-images, pack-images, avatars)

## 🔜 Pendiente

### Fase 5 — MercadoPago (para cuando tengas la cuenta)

- Integrar API de MercadoPago (checkout, webhook)
- Reemplazar payment_method: 'demo' por flujo real
- Manejo de reembolsos

### Auditoría en curso (sin completar)

- Módulo Auth: 4 hallazgos encontrados, sin arreglar aún
- Módulo Público: sin auditar
- Dashboard Usuario: sin auditar
- Dashboard Comercio: sin auditar
- Dashboard Admin: sin auditar
- API Routes: sin auditar

## 📂 SQL pendiente en Supabase

- 01_available_packs_view.sql ✅
- 02_postgis_geolocation.sql ✅
- 03_performance_indexes.sql ✅
- 04_storage_buckets.sql ✅ (solo buckets, políticas se crearon manualmente)

## 🧪 Tests

- 24/24 tests pasan: `npx vitest run src/__tests__/api/rpc-reservations.test.ts`

## ▶️ Cómo retomar

Al volver a abrir el programa, decime:
"Continuá con la auditoría del módulo Auth" o "Resumen de dónde quedamos"
