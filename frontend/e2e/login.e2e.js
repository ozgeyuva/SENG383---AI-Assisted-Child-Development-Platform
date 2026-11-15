import { test, expect } from '@playwright/test';

const accounts = [
    { email: 'parent@example.test', dashboard: 'Parent Dashboard' },
    { email: 'specialist@example.test', dashboard: 'Specialist Dashboard'},
]

for (const { email, dashboard } of accounts) {
    test('opens ' + dashboard + ' after login', async ({ page }) => {
        await page.goto('/')
        await page.getByLabel('Email').fill(email)
        await page.getByLabel('Password').fill('Demo1234!')
        await page.getByRole('button', { name: 'Log in', exact: true }).click()
        await expect(page.getByText(dashboard, { exact: true })).toBeVisible()
    })
}