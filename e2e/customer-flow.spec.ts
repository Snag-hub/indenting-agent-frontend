import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('D2: Customer flow — navigation and list pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'customer')
  })

  test('can view enquiries list', async ({ page }) => {
    await page.goto('/enquiries')
    await expect(page.getByRole('heading', { name: /enquiries/i })).toBeVisible()
  })

  test('can navigate to create enquiry page', async ({ page }) => {
    await page.goto('/enquiries')
    const newBtn = page.getByRole('button', { name: /new enquiry/i })
    if (await newBtn.isVisible()) {
      await newBtn.click()
      await expect(page).toHaveURL(/\/enquiries\/new/)
    }
  })

  test('can view RFQs list', async ({ page }) => {
    await page.goto('/rfqs')
    await expect(page.getByRole('heading', { name: /rfqs/i })).toBeVisible()
  })

  test('can view quotations list', async ({ page }) => {
    await page.goto('/quotations')
    await expect(page.getByRole('heading', { name: /quotations/i })).toBeVisible()
  })

  test('can view purchase orders list', async ({ page }) => {
    await page.goto('/purchase-orders')
    await expect(page.getByRole('heading', { name: /purchase orders/i })).toBeVisible()
  })

  test('can view payments list', async ({ page }) => {
    await page.goto('/payments')
    await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible()
  })
})
