import { test, expect } from '@playwright/test'

test.describe('Packs browsing', () => {
  test('shows packs page with available packs', async ({ page }) => {
    await page.goto('/packs')
    await expect(page.getByText(/pack|excedente/i)).toBeVisible()
  })
})
