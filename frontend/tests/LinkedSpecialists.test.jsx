import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import LinkedSpecialists from '../src/LinkedSpecialists'

const listUrl = '/api/children/10/specialists'
const unlinkUrl = `${listUrl}/5`
const specialist = {
  specialist_id: 5,
  first_name: 'Demo',
  last_name: 'Specialist',
  specialist_type: 'Teacher',
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function setup({ confirmed, unlinkResponse }) {
  let linked = true

  const fetchMock = vi.fn(async (url, options) => {
    if (url === listUrl && (!options.method || options.method === 'GET')) {
      return {
        ok: true,
        json: async () => ({ specialists: linked ? [specialist] : [] }),
      }
    }

    if (url === unlinkUrl && options.method === 'DELETE') {
      if (unlinkResponse?.ok) linked = false
      return unlinkResponse
    }

    throw new Error(`Unexpected fetch request: ${url}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(confirmed)
  const user = userEvent.setup()

  render(<LinkedSpecialists childId={10} token="parent-token" />)

  const unlinkButton = await screen.findByRole('button', {
    name: 'Unlink Demo Specialist',
  })

  return { user, unlinkButton, fetchMock, confirmMock }
}

test('keeps the specialist linked when the parent cancels', async () => {
  const { user, unlinkButton, fetchMock, confirmMock } = await setup({
    confirmed: false,
  })

  await user.click(unlinkButton)

  expect(confirmMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Unlink Demo Specialist' })).toBeTruthy()
})

test('unlinks the specialist after confirmation and reloads the list', async () => {
  const { user, unlinkButton, fetchMock } = await setup({
    confirmed: true,
    unlinkResponse: { ok: true, status: 204 },
  })

  await user.click(unlinkButton)

  await screen.findByText('No specialists linked yet.')
  expect(fetchMock).toHaveBeenCalledWith(unlinkUrl, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer parent-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmed: true }),
  })
  expect(fetchMock.mock.calls.filter(([url]) => url === listUrl)).toHaveLength(2)
})

test('shows the API error and keeps the specialist in the list', async () => {
  const { user, unlinkButton } = await setup({
    confirmed: true,
    unlinkResponse: {
      ok: false,
      status: 403,
      json: async () => ({ error: 'Child profile is not accessible' }),
    },
  })

  await user.click(unlinkButton)

  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toBe('Child profile is not accessible')
  await waitFor(() => expect(unlinkButton.disabled).toBe(false))
  expect(screen.getByRole('button', { name: 'Unlink Demo Specialist' })).toBeTruthy()
})