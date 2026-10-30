import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import RegisterForm from './RegisterForm'

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

test('shows an error without submitting when passwords differ', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), 'Demo')
    await user.type(screen.getByLabelText(/last name/i), 'Parent')
    await user.type(screen.getByLabelText(/email/i), 'parent@example.test')

    await user.type(screen.getByLabelText(/^password$/i), 'Demo1234!')
    await user.type(screen.getByLabelText(/confirm password/i), 'Demo1234!DIFFERENT')

    await user.click(screen.getByRole('button', { name: /Register/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Email')).toHaveValue('parent@example.test')
})

test('shows a duplicate-email error and preserves form values', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status: 409,
    json: async () => ({
      error: 'Email already exists',
    }),
  })

  vi.stubGlobal('fetch', fetchMock)

  const user = userEvent.setup()
  render(<RegisterForm />)

  await user.type(screen.getByLabelText(/first name/i), 'Demo')
  await user.type(screen.getByLabelText(/last name/i), 'Parent')
  await user.type(
    screen.getByLabelText(/email/i),
    'parent@example.test'
  )
  await user.type(screen.getByLabelText(/^password$/i), 'Demo1234!')
  await user.type(
    screen.getByLabelText(/confirm password/i),
    'Demo1234!'
  )

  await user.click(screen.getByRole('button', { name: /register/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Email already exists'
  )
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText(/first name/i)).toHaveValue('Demo')
  expect(screen.getByLabelText(/email/i)).toHaveValue(
    'parent@example.test'
  )
  expect(screen.getByRole('button', { name: /register/i })).toBeEnabled()
})

test.each(['parent', 'specialist'])(
  'registers a %s and clears the form after success',
  async (role) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        user: { id: 1, role },
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), 'Demo')
    await user.type(screen.getByLabelText(/last name/i), 'User')
    await user.type(
      screen.getByLabelText(/email/i),
      'demo@example.test'
    )
    await user.type(screen.getByLabelText(/^password$/i), 'Demo1234!')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'Demo1234!'
    )
    await user.selectOptions(
      screen.getByLabelText(/account role/i),
      role
    )

    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      /account created successfully/i
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('/api/auth/register')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(options.body)).toEqual({
      first_name: 'Demo',
      last_name: 'User',
      email: 'demo@example.test',
      password: 'Demo1234!',
      role,
    })

    expect(screen.getByLabelText(/first name/i)).toHaveValue('')
    expect(screen.getByLabelText(/last name/i)).toHaveValue('')
    expect(screen.getByLabelText(/email/i)).toHaveValue('')
    expect(screen.getByLabelText(/^password$/i)).toHaveValue('')
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue('')
    expect(screen.getByLabelText(/account role/i)).toHaveValue('parent')
  }
)