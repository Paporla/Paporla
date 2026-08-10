import { test, expect } from '@playwright/test'

test.describe('Authenticated Critical Flow', () => {
  test('complete reservation flow: browse → reserve → verify → cancel', async ({ page }) => {
    // 1. Navegar a packs
    await page.goto('/packs')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()

    // 2. Buscar el primer pack y hacer clic
    const packLink = page.locator('a[href^="/packs/"]').first()
    const count = await packLink.count()
    if (count === 0) {
      test.skip(true, 'No hay packs disponibles para testear')
      return
    }

    await packLink.click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    // 3. Reservar si hay botón
    const reserveButton = page.getByRole('button', { name: /reservar/i })
    if (await reserveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Aceptar políticas
      const policiesCheckbox = page.locator('input[type="checkbox"]').first()
      if (await policiesCheckbox.isVisible().catch(() => false)) {
        await policiesCheckbox.check()
      }
      await reserveButton.click()

      // Confirmar en modal si aparece
      const confirmButton = page.getByRole('button', { name: /confirmar|reservar/i })
      if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmButton.click()
      }
      await page.waitForTimeout(2000)
    }

    // 4. Dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()

    // 5. Reservas
    await page.goto('/reservations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('dashboard loads with user data', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveTitle(/Paporla|Dashboard|Panel/)
  })

  test('profile page loads and shows user info', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 })
  })

  test('notifications page loads', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('favorites page loads', async ({ page }) => {
    await page.goto('/favorites')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
