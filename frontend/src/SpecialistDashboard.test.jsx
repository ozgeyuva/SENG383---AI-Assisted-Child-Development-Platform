import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import SpecialistDashboard from './SpecialistDashboard'

const specialist = {
  first_name: 'Demo',
  last_name: 'Specialist',
  email: 'specialist@example.test',
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('shows loading and then displays the linked child', async () => {
  let resolveRequest
  const pendingRequest = new Promise(resolve => {
    resolveRequest = resolve
  })
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingRequest))

  render(<SpecialistDashboard user={specialist} token="test-only-token" />)

  expect(screen.getByRole('status')).toHaveTextContent('Loading linked children...')

  resolveRequest({
    ok: true,
    json: async () => ({
      children: [{
        id: 10,
        first_name: 'Deniz',
        last_name: 'Demo',
        grade: '4',
        specialist_type: 'Teacher',
      }],
    }),
  })

  expect(await screen.findByRole('listitem'))
    .toHaveTextContent('Deniz Demo · Grade 4 · Teacher')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('shows an error and reloads the list when the specialist retries', async () => {
  const fetchMock = vi.fn()
    .mockRejectedValueOnce(new Error('Connection failed'))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ children: [] }),
    })
  vi.stubGlobal('fetch', fetchMock)

  const user = userEvent.setup()
  render(<SpecialistDashboard user={specialist} token="test-only-token" />)

  expect(await screen.findByRole('alert'))
    .toHaveTextContent('Could not load linked children. Please try again.')

  await user.click(screen.getByRole('button', { name: 'Try Again' }))

  expect(await screen.findByText('No children linked to your account yet.'))
    .toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})