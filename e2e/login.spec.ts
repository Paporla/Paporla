import { test, expect } from '@playwright/test'
import { visitarSana } from './helpers/pagina'

/**
 * A-15: este archivo era el más débil de la suite. El test de credenciales
 * inválidas esperaba 3 segundos fijos y luego comprobaba que el <body> era
 * visible: eso pasa aunque el formulario se quede mudo, aunque explote y
 * aunque el usuario acabe dentro. No verificaba el error en absoluto.
 *
 * Ahora sí: el formulario tiene que AVISAR (el toast de error usa
 * role="alert") y el usuario tiene que SEGUIR FUERA.
 */
test.describe('Login', () => {
  // El <h1> lo pinta el layout de auth: "Bienvenido de vuelta".
  test('la página de login carga y muestra su titular', async ({ page }) => {
    await visitarSana(page, '/login', { titulo: /Bienvenido de vuelta/ })
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('credenciales inválidas: avisa del error y no deja entrar', async ({ page }) => {
    await visitarSana(page, '/login', { titulo: /Bienvenido de vuelta/ })

    await page.fill('input[name="email"]', 'wrong@email.com')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')

    // El formulario avisa con un toast (role="alert"). Si no avisa, es un
    // fallo: un usuario con la contraseña mal tiene que saber por qué.
    const aviso = page.getByRole('alert').first()
    await expect(aviso, 'el formulario no avisó del error de credenciales').toBeVisible({ timeout: 20000 })

    // Y lo importante: con credenciales malas NO se entra.
    await expect(page).toHaveURL(/\/login/)
  })
})
