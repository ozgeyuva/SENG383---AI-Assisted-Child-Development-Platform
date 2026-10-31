import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChildForm from '../src/ChildForm'

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function fillForm(changes = {}) {
  const values = {
    'First name': 'Deniz',
    'Last name': 'Demo',
    'Date of birth': '2017-05-10',
    Grade: '4',
    ...changes,
  }

  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), {
      target: { value },
    })
  }
}

function expectValuesPreserved() {
  expect(screen.getByLabelText('First name').value).toBe('Deniz')
  expect(screen.getByLabelText('Last name').value).toBe('Demo')
  expect(screen.getByLabelText('Date of birth').value).toBe('2017-05-10')
  expect(screen.getByLabelText('Grade').value).toBe('4')
}

test('shows a whitespace validation error without sending a request', async () => {
  const user = userEvent.setup()

  render(<ChildForm token="test-token" />)
  fillForm({ 'First name': '   ' })

  await user.click(screen.getByRole('button', { name: 'Save Child' }))

  expect(screen.getByRole('alert').textContent).toBe(
    'First name is required.'
  )
  expect(fetchMock).not.toHaveBeenCalled()

  expect(screen.getByLabelText('First name').value).toBe('   ')
  expect(screen.getByLabelText('Last name').value).toBe('Demo')
  expect(screen.getByLabelText('Date of birth').value).toBe('2017-05-10')
  expect(screen.getByLabelText('Grade').value).toBe('4')
})

test('blocks submission when a required field is empty', async () => {
  const user = userEvent.setup()

  render(<ChildForm token="test-token" />)
  fillForm({ Grade: '' })

  await user.click(screen.getByRole('button', { name: 'Save Child' }))

  expect(screen.getByLabelText('Grade').validity.valueMissing).toBe(true)
  expect(fetchMock).not.toHaveBeenCalled()
  expect(screen.getByLabelText('First name').value).toBe('Deniz')
})

test('blocks a future birth date without sending a request', async () => {
  const user = userEvent.setup()

  render(<ChildForm token="test-token" />)
  fillForm({ 'Date of birth': '9999-12-31' })

  await user.click(screen.getByRole('button', { name: 'Save Child' }))

  expect(
    screen.getByLabelText('Date of birth').validity.rangeOverflow
  ).toBe(true)

  expect(fetchMock).not.toHaveBeenCalled()
  expect(screen.getByLabelText('First name').value).toBe('Deniz')
})

test('shows a server error and preserves entered values', async () => {
  const user = userEvent.setup()

  fetchMock.mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Could not save child profile.' }),
  })

  render(<ChildForm token="test-token" />)
  fillForm()

  await user.click(screen.getByRole('button', { name: 'Save Child' }))

  const alert = await screen.findByRole('alert')

  expect(alert.textContent).toBe('Could not save child profile.')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expectValuesPreserved()
  expect(screen.getByRole('button', { name: 'Save Child' }).disabled)
    .toBe(false)
})

test('shows a connection error and preserves entered values', async () => {
  const user = userEvent.setup()

  fetchMock.mockRejectedValue(new Error('Network unavailable'))

  render(<ChildForm token="test-token" />)
  fillForm()

  await user.click(screen.getByRole('button', { name: 'Save Child' }))

  const alert = await screen.findByRole('alert')

  expect(alert.textContent).toBe(
    'Could not connect to the server. Please try again.'
  )
  expectValuesPreserved()
  expect(screen.getByRole('button', { name: 'Save Child' }).disabled)
    .toBe(false)
})