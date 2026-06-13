import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('D5: Tickets', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin')
  })

  test('tickets list page loads and shows filters', async ({ page }) => {
    await page.goto('/tickets')
    await expect(page.getByRole('heading', { name: /support tickets/i })).toBeVisible()
    await expect(page.getByPlaceholder(/search/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /new ticket/i })).toBeVisible()
  })

  test('can navigate to create ticket page', async ({ page }) => {
    await page.goto('/tickets')
    await page.getByRole('button', { name: /new ticket/i }).click()
    await expect(page).toHaveURL(/\/tickets\/new/)
  })

  test('status filter on tickets list', async ({ page }) => {
    await page.goto('/tickets')
    const statusSelect = page.getByRole('combobox').first()
    await statusSelect.selectOption('Open')
    await page.waitForTimeout(500)
    // Verify filter is applied (no error state)
    await expect(page.getByRole('heading', { name: /support tickets/i })).toBeVisible()
  })
})
