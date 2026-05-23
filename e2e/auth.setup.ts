import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate as test user', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'Test1234')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
  await page.context().storageState({ path: authFile })
})
