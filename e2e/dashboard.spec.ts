import { test, expect } from '@playwright/test'
import { paginaSana, sinErrorDeCarga } from './helpers/pagina'

/**
 * A-15: antes este test era `expect(page.locator('body')).toBeVisible()`.
 * Un <body> visible existe en un error 500 y en un crash de React, así que
 * daba verde con la página completamente rota.
 */
test.describe('Dashboard', () => {
  test('el panel carga con el saludo real del usuario', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // El <h1> es "Hola, {nombre}!": si no sale, la página no cargo de verdad.
    await paginaSana(page, { titulo: /^Hola,/ })
    await sinErrorDeCarga(page)

    // Y debajo, la frase que acompaña al saludo (UserWelcomeBanner).
    await expect(page.getByText(/Has rescatado/)).toBeVisible({ timeout: 10000 })
  })
})
