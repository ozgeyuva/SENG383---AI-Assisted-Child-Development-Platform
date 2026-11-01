export function getToday() {
  const now = new Date()

  return [
    String(now.getFullYear()).padStart(4, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

export function validateChildForm(form, today = getToday()) {
  const fields = [
    ['first_name', 'First name'],
    ['last_name', 'Last name'],
    ['date_of_birth', 'Date of birth'],
    ['grade', 'Grade'],
  ]

  for (const [key, label] of fields) {
    if (typeof form[key] !== 'string' || form[key].trim() === '') {
      return `${label} is required.`
    }
  }

  const birthDate = form.date_of_birth.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return 'Enter a valid date of birth.'
  }

  const parsedDate = new Date(`${birthDate}T00:00:00.000Z`)

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== birthDate
  ) {
    return 'Enter a valid date of birth.'
  }

  if (birthDate > today) {
    return 'Date of birth cannot be in the future.'
  }

  return ''
}