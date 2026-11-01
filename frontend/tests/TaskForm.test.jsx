import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskForm from '../src/TaskForm'
import App from '../src/App'

let fetchMock
const categories = ['Academic', 'Extracurricular', 'Health']
const response = (body, ok = true) => ({ ok, json: async () => body })

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(response({ categories }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function fillForm() {
  await screen.findByRole('option', { name: 'Academic' })
  for (const [label, value] of Object.entries({
    Title: ' Read a book ', Description: ' Read for 15 minutes. ',
    Category: 'Academic', 'Due date': '2026-11-08',
  })) fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

test('posts the selected child and required details using the parent JWT, then clears the form', async () => {
  const onCreated = vi.fn()
  const task = { id: 7, child_id: 10, status: 'Not Started' }
  fetchMock.mockResolvedValueOnce(response({ categories }))
    .mockResolvedValueOnce(response({ task }))
  render(<TaskForm childId={10} token="parent-token" onCreated={onCreated} />)
  await fillForm()
  await userEvent.click(screen.getByRole('button', { name: 'Assign Task' }))
  await screen.findByText('Task assigned successfully. Status: Not Started.')
  const [url, options] = fetchMock.mock.calls[1]
  expect(url).toBe('/api/tasks')
  expect(options.headers.Authorization).toBe('Bearer parent-token')
  expect(JSON.parse(options.body)).toEqual({
    child_id: 10, title: 'Read a book', description: 'Read for 15 minutes.',
    category: 'Academic', due_date: '2026-11-08',
  })
  expect(onCreated).toHaveBeenCalledWith(task)
  expect(screen.getByLabelText('Title').value).toBe('')
  expect(screen.getByLabelText('Description').value).toBe('')
  expect(screen.getByLabelText('Category').value).toBe('')
  expect(screen.getByLabelText('Due date').value).toBe('')
})

test.each(['Title', 'Description', 'Category', 'Due date'])(
  'requires %s before sending a task', async label => {
    render(<TaskForm childId={10} token="parent-token" />)
    await fillForm()
    fireEvent.change(screen.getByLabelText(label), { target: { value: '' } })
    await userEvent.click(screen.getByRole('button', { name: 'Assign Task' }))
    expect(screen.getByLabelText(label).validity.valueMissing).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  }
)

test.each(['Title', 'Description'])('rejects whitespace-only %s', async label => {
  render(<TaskForm childId={10} token="parent-token" />)
  await fillForm()
  fireEvent.change(screen.getByLabelText(label), { target: { value: '   ' } })
  await userEvent.click(screen.getByRole('button', { name: 'Assign Task' }))
  expect(screen.getByRole('alert').textContent).toBe(`${label} is required.`)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test.each(['server', 'network'])(
  'preserves form details after a %s error and permits retry', async kind => {
    fetchMock.mockResolvedValueOnce(response({ categories }))
    if (kind === 'server') fetchMock.mockResolvedValueOnce(response({ error: 'Child profile is not accessible' }, false))
    else fetchMock.mockRejectedValueOnce(new Error('Offline'))
    fetchMock.mockResolvedValueOnce(response({ task: { status: 'Not Started' } }))
    render(<TaskForm childId={10} token="parent-token" />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Assign Task' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(kind === 'server' ? 'Child profile is not accessible' : 'Could not connect')
    expect(screen.getByLabelText('Title').value).toBe(' Read a book ')
    expect(screen.getByLabelText('Description').value).toBe(' Read for 15 minutes. ')
    expect(screen.getByLabelText('Category').value).toBe('Academic')
    expect(screen.getByLabelText('Due date').value).toBe('2026-11-08')
    await userEvent.click(screen.getByRole('button', { name: 'Assign Task' }))
    await screen.findByText('Task assigned successfully. Status: Not Started.')
  }
)

test('disables the form during category loading and retries a failed load', async () => {
  fetchMock.mockResolvedValueOnce(response({ error: 'Categories unavailable' }, false))
    .mockResolvedValueOnce(response({ categories }))
  render(<TaskForm childId={10} token="parent-token" />)
  expect(screen.getByRole('button', { name: 'Assign Task' }).disabled).toBe(true)
  expect((await screen.findByRole('alert')).textContent).toBe('Categories unavailable')
  await userEvent.click(screen.getByRole('button', { name: 'Retry Categories' }))
  await screen.findByRole('option', { name: 'Academic' })
  expect(screen.getByRole('button', { name: 'Assign Task' }).disabled).toBe(false)
})

test('prevents duplicate submission and disables fields while saving', async () => {
  let finish
  fetchMock.mockResolvedValueOnce(response({ categories }))
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  render(<TaskForm childId={10} token="parent-token" />)
  await fillForm()
  fireEvent.submit(screen.getByRole('form'))
  fireEvent.submit(screen.getByRole('form'))
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: 'Assigning...' }).disabled).toBe(true)
  expect(screen.getByLabelText('Title').closest('fieldset').disabled).toBe(true)
  finish(response({ task: { status: 'Not Started' } }))
  await screen.findByText('Task assigned successfully. Status: Not Started.')
})

test('uses the child selected on the dashboard and the current session token', async () => {
  const parent = { id: 1, role: 'parent', first_name: 'Demo', last_name: 'Parent' }
  fetchMock.mockImplementation(async url => {
    if (url === '/api/children') return response({ children: [
      { id: 10, first_name: 'Deniz', last_name: 'Demo', grade: '4' },
      { id: 11, first_name: 'Ece', last_name: 'Demo', grade: '3' },
    ] })
    if (url === '/api/tasks/categories') return response({ categories })
    return response({ task: { status: 'Not Started' } })
  })
  render(<App user={parent} token="parent-token" />)
  await userEvent.selectOptions(await screen.findByLabelText('Select your child'), '11')
  await userEvent.click(screen.getByRole('button', { name: /Open Child.*Tasks/ }))
  await fillForm()
  await userEvent.click(screen.getByRole('button', { name: 'Assign Task' }))
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/tasks')).toBe(true))
  const [, options] = fetchMock.mock.calls.find(([url]) => url === '/api/tasks')
  expect(JSON.parse(options.body).child_id).toBe(11)
  expect(options.headers.Authorization).toBe('Bearer parent-token')
  await screen.findByText('Task assigned successfully. Status: Not Started.')
})
