import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import SpecialistLinkForm from '../src/SpecialistLinkForm'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test.each([
  {
    scenario: 'the email is unregistered',
    email: 'missing@example.test',
    status: 404,
    message: 'No registered specialist found for this email',
  },
  {
    scenario: 'the email belongs to a parent',
    email: 'parent@example.test',
    status: 400,
    message: 'This account is not a specialist',
  },
])('shows the server error when $scenario', async ({ email, status, message }) => {
  const fetchMock = vi.fn().mockResolvedValue({
    status,
    json: async () => ({ error: message }),
  })
  vi.stubGlobal('fetch', fetchMock)

  const user = userEvent.setup()
  render(<SpecialistLinkForm childId={12} token="test-token" />)

  const emailInput = screen.getByRole('textbox', { name: 'Specialist email' })
  const typeInput = screen.getByRole('textbox', { name: 'Specialist type' })

  await user.type(emailInput, email)
  await user.type(typeInput, 'Teacher')
  await user.click(screen.getByRole('button', { name: 'Link Specialist' }))

  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toBe(message)
  expect(screen.queryByRole('status')).toBeNull()
  expect(emailInput.value).toBe(email)
  expect(typeInput.value).toBe('Teacher')
  expect(fetchMock).toHaveBeenCalledTimes(1)
})