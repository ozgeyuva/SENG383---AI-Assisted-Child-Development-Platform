import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'

const specialistEmail = 'specialist@example.test'

async function login(page, email, dashboard) {
  await page.goto('/')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Demo1234!')

  const [response] = await Promise.all([
    page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/auth/login' &&
      response.request().method() === 'POST'
    ),
    page.getByRole('button', { name: 'Log in', exact: true }).click(),
  ])

  expect(response.status()).toBe(200)
  await expect(page.getByText(dashboard, { exact: true })).toBeVisible()
  return (await response.json()).token
}

test('a parent links and unlinks a specialist and revokes child profile access', async ({
  page,
  browser,
  baseURL,
}) => {
  const firstName = 'Deniz'
  const lastName = `Link-${randomUUID().slice(0, 8)}`
  const childName = `${firstName} ${lastName}`

  await login(page, 'parent@example.test', 'Parent Dashboard')
  await page.getByRole('button', { name: /add my children/i }).click()
  await page.getByLabel('First name', { exact: true }).fill(firstName)
  await page.getByLabel('Last name', { exact: true }).fill(lastName)
  await page.getByLabel('Date of birth', { exact: true }).fill('2017-05-10')
  await page.getByLabel('Grade', { exact: true }).fill('4')

  const [created] = await Promise.all([
    page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/children' &&
      response.request().method() === 'POST'
    ),
    page.getByRole('button', { name: 'Save Child', exact: true }).click(),
  ])

  expect(created.status()).toBe(201)
  const { child } = await created.json()

  await page.getByRole('combobox', { name: 'Select your child' })
    .selectOption(String(child.id))

  await page.getByLabel('Specialist email', { exact: true }).fill(specialistEmail)
  await page.getByLabel('Specialist type', { exact: true }).fill('Teacher')
  await page.getByRole('button', { name: 'Link Specialist', exact: true }).click()

  const unlinkButton = page.getByRole('button', { name: 'Unlink Demo Specialist' })
  await expect(unlinkButton).toBeVisible()

  const specialistPage = await browser.newPage({ baseURL })

  try {
    const token = await login(specialistPage, specialistEmail, 'Specialist Dashboard')
    const linkedChildren = specialistPage.getByRole('region', { name: 'Linked Children' })

    await expect(linkedChildren.getByText(childName, { exact: false })).toBeVisible()

    const profileUrl = `/api/specialists/me/children/${child.id}`
    const headers = { Authorization: `Bearer ${token}` }

    const before = await specialistPage.request.get(profileUrl, { headers })
    expect(before.status()).toBe(200)
    expect((await before.json()).child.id).toBe(child.id)

    page.once('dialog', dialog => dialog.accept())
    await unlinkButton.click()
    await expect(page.getByText('No specialists linked yet.')).toBeVisible()

    const after = await specialistPage.request.get(profileUrl, { headers })
    expect(after.status()).toBe(403)

    const list = await specialistPage.request.get('/api/specialists/me/children', { headers })
    expect(list.status()).toBe(200)
    expect((await list.json()).children.map(item => item.id)).not.toContain(child.id)
  } finally {
    await specialistPage.close()
  }
})