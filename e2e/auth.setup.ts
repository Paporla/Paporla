import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.waitForSelector('input[name="email"]', { timeout: 15000 })
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'Test1234')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  await expect(page.locator('body')).toBeVisible()

  await page.context().storageState({ path: authFile })
})
