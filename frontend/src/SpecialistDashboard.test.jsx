import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

test('opens a linked child’s tasks and reloads the list after assigning a task', async () => {
  const children = [
    { id: 10, first_name: 'Deniz', last_name: 'Demo', grade: '4', specialist_type: 'Teacher' },
    { id: 11, first_name: 'Ece', last_name: 'Demo', grade: '3', specialist_type: 'Teacher' },
  ]
  let savedTask
  const fetchMock = vi.fn(async (url, options) => {
    let data
    switch (url) {
      case '/api/specialists/me/children': data = { children }; break
      case '/api/tasks/categories': data = { categories: ['Academic'] }; break
      case '/api/tasks?childId=10': data = { tasks: [] }; break
      case '/api/tasks?childId=11': data = { tasks: savedTask ? [savedTask] : [] }; break
      case '/api/tasks':
        savedTask = { ...JSON.parse(options.body), id: 1, status: 'Not Started' }
        data = { task: savedTask }
        break
      default: throw new Error(`Unexpected request: ${url}`)
    }
    return { ok: true, json: async () => data }
  })
  vi.stubGlobal('fetch', fetchMock)
  const user = userEvent.setup()
  render(<SpecialistDashboard user={specialist} token="test-only-token" />)

  await user.click(await screen.findByRole('button', { name: 'Open tasks for Deniz Demo' }))
  await screen.findByText(/^No tasks assigned yet/)
  await user.type(screen.getByLabelText('Title'), 'Deniz draft')

  await user.click(screen.getByRole('button', { name: 'Open tasks for Ece Demo' }))
  await screen.findByRole('option', { name: 'Academic' })
  expect(screen.getByLabelText('Title')).toHaveValue('')
  await user.type(screen.getByLabelText('Title'), 'Practice reading')
  await user.type(screen.getByLabelText('Description'), 'Read for ten minutes.')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Academic')
  fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-11-20' } })
  await user.click(screen.getByRole('button', { name: 'Assign Task' }))
  expect(await screen.findByRole('heading', { name: 'Practice reading' })).toBeInTheDocument()

  const [, assignment] = fetchMock.mock.calls.find(([url]) => url === '/api/tasks')
  expect(assignment.headers.Authorization).toBe('Bearer test-only-token')
  expect(JSON.parse(assignment.body)).toMatchObject({ child_id: 11, title: 'Practice reading' })
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/tasks?childId=11')).toHaveLength(2)
})
