import test from 'node:test'
import assert from 'node:assert/strict'
import { validateChildForm } from '../src/validateChildForm.js'

const today = '2026-10-31'

const validForm = {
  first_name: 'Deniz',
  last_name: 'Demo',
  date_of_birth: '2017-05-10',
  grade: '4',
}

const requiredFields = [
  ['first_name', 'First name'],
  ['last_name', 'Last name'],
  ['date_of_birth', 'Date of birth'],
  ['grade', 'Grade'],
]

for (const [field, label] of requiredFields) {
  for (const value of [undefined, '', '   ']) {
    test(`rejects ${field} with value ${JSON.stringify(value)}`, () => {
      const form = { ...validForm, [field]: value }

      assert.equal(
        validateChildForm(form, today),
        `${label} is required.`
      )
    })
  }
}

for (const birthDate of ['2026-10-30', '2026-10-31']) {
  test(`accepts birth date ${birthDate}`, () => {
    assert.equal(
      validateChildForm(
        { ...validForm, date_of_birth: birthDate },
        today
      ),
      ''
    )
  })
}

test('rejects tomorrow as the birth date', () => {
  assert.equal(
    validateChildForm(
      { ...validForm, date_of_birth: '2026-11-01' },
      today
    ),
    'Date of birth cannot be in the future.'
  )
})

for (const birthDate of ['2017-02-30', '10/05/2017']) {
  test(`rejects invalid date ${birthDate}`, () => {
    assert.equal(
      validateChildForm(
        { ...validForm, date_of_birth: birthDate },
        today
      ),
      'Enter a valid date of birth.'
    )
  })
}
