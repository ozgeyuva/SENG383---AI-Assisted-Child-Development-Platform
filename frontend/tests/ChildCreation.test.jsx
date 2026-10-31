import { afterEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('creates a child with the token and refreshes the child list', async () => {
  const user = userEvent.setup()

  const parent = {
    id: 1,
    first_name: 'Demo',
    last_name: 'Parent',
    email: 'parent@example.test',
    role: 'parent',
  }

  const child = {
    id: 10,
    parent_id: parent.id,
    first_name: 'Deniz',
    last_name: 'Demo',
    date_of_birth: '2017-05-10',
    grade: '4',
  }

  let childCreated = false

  const fetchMock = vi.fn(async (url, options = {}) => {
    if (url === '/api/children' && options.method === 'POST') {
      childCreated = true

      return {
        ok: true,
        status: 201,
        json: async () => ({ child }),
      }
    }

    if (
      url === '/api/children' &&
      (!options.method || options.method === 'GET')
    ) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          children: childCreated ? [child] : [],
        }),
      }
    }

    throw new Error(`Unexpected request: ${url}`)
  })

  vi.stubGlobal('fetch', fetchMock)

  render(<App user={parent} token="parent-test-token" />)

  await screen.findByText(
    'No child profiles yet. Add your first child.'
  )

  await user.click(
    screen.getByRole('button', { name: /Add My Children/i })
  )

  const fields = {
    'First name': child.first_name,
    'Last name': child.last_name,
    'Date of birth': child.date_of_birth,
    Grade: child.grade,
  }

  for (const [label, value] of Object.entries(fields)) {
    fireEvent.change(screen.getByLabelText(label), {
      target: { value },
    })
  }

  await user.click(
    screen.getByRole('button', { name: 'Save Child' })
  )

  await screen.findByText('Child profile created successfully.')

  // The newly created child appears without reloading the page.
  await screen.findByRole('option', {
    name: /Deniz Demo.*Grade 4/,
  })

  const postCalls = fetchMock.mock.calls.filter(
    ([, options]) => options?.method === 'POST'
  )

  expect(postCalls).toHaveLength(1)

  const [url, options] = postCalls[0]

  expect(url).toBe('/api/children')
  expect(options.headers.Authorization).toBe(
    'Bearer parent-test-token'
  )

  expect(JSON.parse(options.body)).toEqual({
    first_name: 'Deniz',
    last_name: 'Demo',
    date_of_birth: '2017-05-10',
    grade: '4',
  })

  await waitFor(() => {
    expect(screen.getByLabelText('First name').value).toBe('')
    expect(screen.getByLabelText('Last name').value).toBe('')
    expect(screen.getByLabelText('Date of birth').value).toBe('')
    expect(screen.getByLabelText('Grade').value).toBe('')
  })

  const getCalls = fetchMock.mock.calls.filter(
    ([, options]) => !options?.method || options.method === 'GET'
  )

  expect(getCalls).toHaveLength(2)
})