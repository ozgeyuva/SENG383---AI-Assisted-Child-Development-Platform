import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskList from '../src/TaskList'

const tasks = [
  { id: 1, title: 'Read a book', description: 'Read together.', category: 'Academic', due_date: '2026-11-08', status: 'Not Started' },
  { id: 2, title: 'Swimming', description: 'Practice swimming.', category: 'Health', due_date: '2026-11-09', status: 'Completed' },
]
let fetchMock
const response = tasks => ({ ok: true, json: async () => ({ tasks }) })
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(response(tasks))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

test('loads selected child tasks using JWT and renders details grouped by due date', async () => {
  render(<TaskList childId={10} token="parent-token" />)
  expect(screen.getByRole('status').textContent).toBe('Loading tasks...')
  await screen.findByText('Read a book')
  expect(fetchMock.mock.calls[0][0]).toBe('/api/tasks?childId=10')
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer parent-token')
  expect(screen.getByRole('region', { name: 'Tasks due 2026-11-08' }).textContent)
    .toContain('Read together.')
  expect(screen.getByText('Academic')).toBeTruthy()
  expect(screen.getByText('Not Started')).toBeTruthy()
})

test('filters by status, displays counts and handles an empty filter', async () => {
  render(<TaskList childId={10} token="parent-token" />)
  await screen.findByText('Read a book')
  await userEvent.click(screen.getByRole('button', { name: 'Completed (1)' }))
  expect(screen.queryByText('Read a book')).toBeNull()
  expect(screen.getByText('Swimming')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'In Progress (0)' }))
  expect(screen.getByText('No in progress tasks.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'All (2)' }))
  expect(screen.getByText('Read a book')).toBeTruthy()
})

test('renders the empty child task list', async () => {
  fetchMock.mockResolvedValue(response([]))
  render(<TaskList childId={10} token="parent-token" />)
  await screen.findByText('No tasks assigned yet. Use the form to assign the first task.')
  expect(screen.queryByRole('group')).toBeNull()
})

test.each(['network', 'server', 'malformed'])('retries after a %s list failure', async kind => {
  if (kind === 'network') fetchMock.mockRejectedValueOnce(new Error('Offline'))
  if (kind === 'server') fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Access denied' }) })
  if (kind === 'malformed') fetchMock.mockResolvedValueOnce(response(null))
  fetchMock.mockResolvedValueOnce(response(tasks))
  render(<TaskList childId={10} token="parent-token" />)
  await screen.findByRole('alert')
  await userEvent.click(screen.getByRole('button', { name: 'Retry Tasks' }))
  await screen.findByText('Read a book')
  expect(screen.queryByRole('alert')).toBeNull()
})

test('aborts the previous child request and ignores its late response after remount', async () => {
  let finishOld
  fetchMock.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
    .mockResolvedValueOnce(response([tasks[1]]))
  const { rerender } = render(<TaskList key="10" childId={10} token="parent-token" />)
  const signal = fetchMock.mock.calls[0][1].signal
  rerender(<TaskList key="11" childId={11} token="parent-token" />)
  await screen.findByText('Swimming')
  expect(signal.aborted).toBe(true)
  finishOld(response([tasks[0]]))
  expect(screen.queryByText('Read a book')).toBeNull()
  expect(fetchMock.mock.calls[1][0]).toBe('/api/tasks?childId=11')
})
