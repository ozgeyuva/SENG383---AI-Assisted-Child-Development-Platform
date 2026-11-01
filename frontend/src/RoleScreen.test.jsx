import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test.each([
  ['specialist', 'Specialist Dashboard', 'Welcome, Demo User!'],
  ['child', 'My Dashboard', 'Welcome, Demo User!'],
])('shows the %s screen without parent controls', (role, title, heading) => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  render(
    <App
      user={{
        id: 7,
        first_name: 'Demo',
        last_name: 'User',
        role,
      }}
      token="test-only-token"
    />
  )

  expect(screen.getByText(title)).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: heading })
  ).toBeInTheDocument()

  expect(screen.queryByText('Parent Dashboard')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /add my children/i })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('combobox', { name: /select your child/i })
  ).not.toBeInTheDocument()

  expect(fetchMock).not.toHaveBeenCalled()
})

test('returns to login after logout from a child account', async () => {
  const user = userEvent.setup()

  render(
    <App
      user={{
        id: 7,
        first_name: 'Demo',
        last_name: 'Child',
        role: 'child',
      }}
      token="test-only-token"
    />
  )

  await user.click(
    screen.getByRole('button', { name: /^log\s*out$/i })
  )

  expect(
    screen.getByRole('heading', { name: /welcome back/i })
  ).toBeInTheDocument()
  expect(screen.queryByText('My Dashboard')).not.toBeInTheDocument()
})