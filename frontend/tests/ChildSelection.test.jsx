import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'

let fetchMock

const parent = {
  id: 1,
  first_name: 'Demo',
  last_name: 'Parent',
  email: 'parent@example.test',
  role: 'parent',
}

const children = [
  {
    id: 10,
    parent_id: 1,
    first_name: 'Deniz',
    last_name: 'Demo',
    date_of_birth: '2017-05-10',
    grade: '4',
  },
  {
    id: 11,
    parent_id: 1,
    first_name: 'Ece',
    last_name: 'Demo',
    date_of_birth: '2018-06-15',
    grade: '3',
  },
]

function childrenResponse(items) {
  return {
    ok: true,
    json: async () => ({ children: items }),
  }
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('loads children and opens tasks for the selected child', async () => {
  const user = userEvent.setup()

  fetchMock.mockResolvedValue(childrenResponse(children))

  render(<App user={parent} token="parent-token" />)

  expect(screen.getByRole('status').textContent).toBe(
    'Loading children...'
  )

  const selector = await screen.findByRole('combobox', {
    name: 'Select your child',
  })

  const openTasks = screen.getByRole('button', {
    name: /Open Child.*Tasks/,
  })

  expect(openTasks.disabled).toBe(true)

  await user.selectOptions(selector, '10')

  expect(selector.value).toBe('10')
  expect(openTasks.disabled).toBe(false)

  // Change the selection before opening the child's page.
  await user.selectOptions(selector, '11')
  await user.click(openTasks)

  expect(
    screen.getByRole('heading', { level: 1 }).textContent
  ).toContain('Ece Demo')

  const [url, options] = fetchMock.mock.calls[0]

  expect(url).toBe('/api/children')
  expect(options.headers.Authorization).toBe('Bearer parent-token')
})

test('shows the empty state and prevents opening tasks', async () => {
  fetchMock.mockResolvedValue(childrenResponse([]))

  render(<App user={parent} token="parent-token" />)

  await screen.findByText(
    'No child profiles yet. Add your first child.'
  )

  expect(screen.queryByRole('combobox')).toBeNull()

  expect(
    screen.getByRole('button', { name: /Open Child.*Tasks/ }).disabled
  ).toBe(true)
})

test('shows a loading error and allows retrying', async () => {
  const user = userEvent.setup()

  fetchMock
    .mockRejectedValueOnce(new Error('Connection failed'))
    .mockResolvedValueOnce(childrenResponse(children))

  render(<App user={parent} token="parent-token" />)

  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toBe('Connection failed')

  await user.click(
    screen.getByRole('button', { name: 'Try Again' })
  )

  await screen.findByRole('option', { name: /Deniz Demo/ })

  expect(screen.queryByRole('alert')).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
test('clears selection and old children when the account changes', async () => {
  const user = userEvent.setup()

  const otherParent = {
    ...parent,
    id: 2,
    first_name: 'Other',
    email: 'other@example.test',
  }

  const otherChild = {
    ...children[0],
    id: 20,
    parent_id: 2,
    first_name: 'Ada',
  }

  fetchMock
    .mockResolvedValueOnce(childrenResponse(children))
    .mockResolvedValueOnce(childrenResponse([otherChild]))

  const { rerender } = render(
    <App user={parent} token="parent-token" />
  )

  const firstSelector = await screen.findByRole('combobox', {
    name: 'Select your child',
  })

  await user.selectOptions(firstSelector, '10')
  expect(firstSelector.value).toBe('10')

  rerender(<App user={otherParent} token="other-parent-token" />)

  // Previous account's children disappear immediately.
  expect(
    screen.queryByRole('option', { name: /Deniz Demo/ })
  ).toBeNull()

  await screen.findByRole('option', { name: /Ada Demo/ })

  const newSelector = screen.getByRole('combobox', {
    name: 'Select your child',
  })

  expect(newSelector.value).toBe('')

  expect(
    screen.getByRole('button', { name: /Open Child.*Tasks/ }).disabled
  ).toBe(true)

  expect(
    screen.queryByRole('option', { name: /Ece Demo/ })
  ).toBeNull()

  const [, options] = fetchMock.mock.calls.at(-1)
  expect(options.headers.Authorization).toBe(
    'Bearer other-parent-token'
  )
})

test('does not restore the previous selection after logout', async () => {
  const user = userEvent.setup()

  fetchMock.mockResolvedValue(childrenResponse(children))

  const { rerender } = render(
    <App user={parent} token="parent-token" />
  )

  const selector = await screen.findByRole('combobox', {
    name: 'Select your child',
  })

  await user.selectOptions(selector, '10')
  expect(selector.value).toBe('10')

  // Simulate clearing the authenticated session.
  rerender(<App user={null} token={null} />)

  expect(screen.queryByRole('combobox', {
    name: 'Select your child',
  })).toBeNull()

  expect(
    screen.queryByRole('option', { name: /Deniz Demo/ })
  ).toBeNull()

  // The same account signs in again.
  rerender(<App user={parent} token="parent-token" />)

  const newSelector = await screen.findByRole('combobox', {
    name: 'Select your child',
  })

  expect(newSelector.value).toBe('')

  expect(
    screen.getByRole('button', { name: /Open Child.*Tasks/ }).disabled
  ).toBe(true)
})