import { test, expect } from '@playwright/test'
import { paginaSana, sinErrorDeCarga } from './helpers/pagina'

/**
 * A-16: el test se llamaba "complete reservation flow: browse -> reserve ->
 * verify -> cancel" y no verificaba NI la creación NI la cancelación. Se
 * saltaba el checkbox y el boton de confirmar con `.catch(() => false)`,
 * esperaba 2 segundos fijos y terminaba comprobando que el <body> era
 * visible en dos páginas.
 *
 * Ahora cada paso es obligatorio: si el boton no aparece, el test FALLA.
 * Lo unico que sigue siendo un skip honesto es que no haya packs publicados,
 * porque entonces no hay nada que reservar, y eso se dice en el reporte.
 */
test.describe('Authenticated Critical Flow', () => {
  test('flujo de reserva: se crea de verdad y aparece en Mis Reservas', async ({ page }) => {
    // --- 1. Listado -------------------------------------------------------
    await page.goto('/packs')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Packs Disponibles/ })
    await sinErrorDeCarga(page)

    const tarjeta = page.locator('a[href^="/packs/"]').first()
    if ((await tarjeta.count()) === 0) {
      test.skip(true, 'No hay packs publicados: no se puede probar el flujo de reserva')
      return
    }

    // --- 2. Ficha del pack ------------------------------------------------
    await tarjeta.click()
    await page.waitForLoadState('networkidle')

    const h1 = await paginaSana(page)
    const títuloPack = ((await h1.textContent()) ?? '').trim()
    // "Pack no encontrado" es el estado de 404: eso no es un pack válido.
    expect(títuloPack, 'la ficha abrio en estado "no encontrado"').not.toMatch(/no encontrado/i)

    // --- 3. Reservar (obligatorio, sin .catch que lo oculte) --------------
    const botonReservar = page.getByRole('button', { name: /^reservar$/i }).first()
    await expect(botonReservar, 'no aparecio el boton de reservar en la ficha del pack').toBeVisible({ timeout: 10000 })
    await botonReservar.click()

    // --- 4. El modal y las políticas --------------------------------------
    const modal = page.getByRole('dialog')
    await expect(modal, 'no se abrio el modal de reserva').toBeVisible({ timeout: 10000 })

    // Antes: `if (await policiesCheckbox.isVisible().catch(() => false))`.
    // Ahora: si no esta, el test falla, porque aceptar las políticas no es
    // opcional ni en la app ni en el test.
    const casilla = modal.locator('input[type="checkbox"]').first()
    await expect(casilla, 'el modal no pidio aceptar las políticas').toBeVisible({ timeout: 5000 })
    await casilla.check()

    // --- 5. Confirmar -----------------------------------------------------
    const botonConfirmar = modal.getByRole('button', { name: /^reservar$/i })
    await expect(botonConfirmar, 'el modal no tenia boton de confirmar').toBeVisible()
    await botonConfirmar.click()

    // El modal pasa a fase de exito y lo dice.
    await expect(modal.getByText(/Reserva creada/i), 'la reserva no llego al estado de exito').toBeVisible({
      timeout: 20000,
    })

    // --- 6. LA RESERVA EXISTE --------------------------------------------
    // Esto es lo que el test anterior nunca hacia.
    await page.goto('/reservations')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Mis Reservas/ })
    await sinErrorDeCarga(page)

    const reserva = page.getByText(títuloPack, { exact: false }).first()
    await expect(reserva, `la reserva "${títuloPack}" no aparece en Mis Reservas después de crearla`).toBeVisible({
      timeout: 20000,
    })
  })

  test('el panel carga con datos del usuario', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /^Hola,/ })
    await expect(page).toHaveTitle(/Paporla|Dashboard|Panel/i)
  })

  test('la página de perfil carga y muestra su titular', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Mi perfil/ })
    await sinErrorDeCarga(page)
  })

  test('la página de notificaciones carga y muestra su titular', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Notificaciones/ })
    await sinErrorDeCarga(page)
  })

  test('la página de favoritos carga y muestra su titular', async ({ page }) => {
    await page.goto('/favorites')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Mis Favoritos/ })
    await sinErrorDeCarga(page)
  })
})
