import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'

test('a parent creates a child profile and sees it in their list', async ({ page }) => {
  const firstName = 'Deniz'
  const lastName = `Demo-${randomUUID().slice(0, 8)}`

  await page.goto('/')
  await page.getByLabel('Email').fill('parent@example.test')
  await page.getByLabel('Password').fill('Demo1234!')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByText('Parent Dashboard', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /add my children/i }).click()
  await page.getByLabel('First name', { exact: true }).fill(firstName)
  await page.getByLabel('Last name', { exact: true }).fill(lastName)
  await page.getByLabel('Date of birth', { exact: true }).fill('2017-05-10')
  await page.getByLabel('Grade', { exact: true }).fill('4')

  const created = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/children' &&
      response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Save Child', exact: true }).click()
  expect((await created).status()).toBe(201)

  const childList = page.getByRole('combobox', { name: 'Select your child' })
  await expect(
    childList.getByRole('option', { name: new RegExp(`${firstName} ${lastName}`) })
  ).toHaveCount(1)
})