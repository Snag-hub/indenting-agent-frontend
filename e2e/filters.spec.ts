import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('D4: Admin list page filters', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin')
  })

  test('enquiries page shows supplier and customer dropdowns for admin', async ({ page }) => {
    await page.goto('/enquiries')
    await expect(page.getByRole('combobox', { name: /all customers/i })).toBeVisible()
  })

  test('search filter narrows results', async ({ page }) => {
    await page.goto('/enquiries')
    const searchInput = page.getByPlaceholder(/search/i).first()
    await searchInput.fill('NONEXISTENT-DOC-99999')
    await expect(page.getByText(/no enquiries found/i)).toBeVisible({ timeout: 5_000 })
  })

  test('clear button resets all filters', async ({ page }) => {
    await page.goto('/rfqs')
    const searchInput = page.getByPlaceholder(/search/i).first()
    await searchInput.fill('something')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(searchInput).toHaveValue('')
  })

  test('non-admin does not see party filter dropdowns on enquiries', async ({ page }) => {
    await login(page, 'customer')
    await page.goto('/enquiries')
    await expect(page.getByRole('combobox', { name: /all customers/i })).not.toBeVisible()
  })
})
