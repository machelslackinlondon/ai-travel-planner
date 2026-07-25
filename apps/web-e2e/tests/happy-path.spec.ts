import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 360, height: 800 } })

test('a visitor builds, edits and saves a useful account-free plan', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Build your Jamaica trip' })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('.hero').getByRole('link', { name: 'Plan my trip' }).click()

  await expect(page.getByText('Step 1 of 4')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Beaches and water').check()
  await page.getByLabel('Rest and wellness').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()

  await expect(page).toHaveURL(/\/trip\/[0-9a-f-]+/)
  await expect(page.getByRole('heading', { name: /in 5 nights/ })).toBeVisible()
  await expect(page.getByText(/Personalised wording is temporarily unavailable/)).toBeVisible()
  await expect(page.getByText('Estimated sample cost').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.getByRole('button', { name: 'Save', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Saved', exact: true }).first()).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /View demo source/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Continue to Sample provider page' })).toBeVisible()
  await expect(page.getByText(/provider controls live availability/)).toBeVisible()
  await page.getByRole('button', { name: 'Stay with my plan' }).click()

  await page.getByRole('button', { name: 'Save this trip' }).first().click()
  const saveDialog = page.getByRole('dialog')
  await expect(saveDialog.getByRole('heading', { name: 'Save your plan to this device' })).toBeVisible()
  await expect(saveDialog.getByText('No account required')).toBeVisible()
  await saveDialog.getByRole('button', { name: 'Save this trip' }).click()
  await expect(page.getByRole('heading', { name: 'Your trip is saved' })).toBeVisible()
  await page.getByRole('button', { name: 'View saved trips' }).click()
  await expect(page.getByRole('heading', { name: 'Saved trips' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open trip' })).toBeVisible()
})
