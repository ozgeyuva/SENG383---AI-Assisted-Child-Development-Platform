import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import LoginForm from './LoginForm'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('shows an error without starting a session for invalid credentials', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({
      error: 'Invalid email or password',
    }),
  })

  vi.stubGlobal('fetch', fetchMock)

  const onLogin = vi.fn()
  const user = userEvent.setup()

  render(
    <LoginForm
      onLogin={onLogin}
      onRegister={vi.fn()}
    />
  )

  await user.type(
    screen.getByLabelText(/email/i),
    'parent@example.test'
  )
  await user.type(
    screen.getByLabelText(/password/i),
    'WrongPassword!'
  )
  await user.click(
    screen.getByRole('button', { name: /^log in$/i })
  )

  expect(await screen.findByRole('alert')).toHaveTextContent(
    /invalid email or password/i
  )
  expect(onLogin).not.toHaveBeenCalled()
  expect(screen.getByLabelText(/email/i)).toHaveValue(
    'parent@example.test'
  )
  expect(
    screen.getByRole('button', { name: /^log in$/i })
  ).toBeEnabled()
})

test('submits credentials and starts a session after successful login', async () => {
  const account = {
    id: 1,
    first_name: 'Demo',
    last_name: 'Parent',
    email: 'parent@example.test',
    role: 'parent',
  }

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      user: account,
      token: 'test-only-token',
    }),
  })

  vi.stubGlobal('fetch', fetchMock)

  const onLogin = vi.fn()
  const user = userEvent.setup()

  render(
    <LoginForm
      onLogin={onLogin}
      onRegister={vi.fn()}
    />
  )

  await user.type(
    screen.getByLabelText(/email/i),
    'parent@example.test'
  )
  await user.type(
    screen.getByLabelText(/password/i),
    'Demo1234!'
  )
  await user.click(
    screen.getByRole('button', { name: /^log in$/i })
  )

  await vi.waitFor(() => {
    expect(onLogin).toHaveBeenCalledExactlyOnceWith({
      user: account,
      token: 'test-only-token',
    })
  })

  expect(fetchMock).toHaveBeenCalledTimes(1)

  const [url, options] = fetchMock.mock.calls[0]

  expect(url).toBe('/api/auth/login')
  expect(options.method).toBe('POST')
  expect(options.headers['Content-Type']).toBe('application/json')
  expect(JSON.parse(options.body)).toEqual({
    email: 'parent@example.test',
    password: 'Demo1234!',
  })
})