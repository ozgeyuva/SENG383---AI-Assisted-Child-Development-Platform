import { getToday, validateChildForm } from './validateChildForm'
import { useState } from 'react'

const emptyForm = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  grade: '',
}

function ChildForm({ token, onClose, onCreated }) {
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const today = getToday()

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return

    setError('')
    setSuccess('')

   const validationError = validateChildForm(form)

    if (validationError) {
    setError(validationError)
    return
}

    if (!token) {
      setError('Please sign in to add a child.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Could not create the child profile.')
        return
      }

      setSuccess('Child profile created successfully.')
      setForm({ ...emptyForm })
      onCreated?.(data.child)
    } catch {
      setError('Could not connect to the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="child-form-panel" aria-labelledby="child-form-title">
      <h2 id="child-form-title">Add My Children</h2>
      <p className="intro">Enter your child’s profile details.</p>

      <form className="child-form" onSubmit={handleSubmit}>
        <fieldset disabled={saving}>
          <label>
            First name
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Last name
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Date of birth
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              max={today}
              required
            />
          </label>

          <label>
            Grade
            <input
              name="grade"
              value={form.grade}
              onChange={handleChange}
              required
            />
          </label>
        </fieldset>

        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="form-success" role="status">{success}</p>}

        <div className="form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Child'}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
        </div>
      </form>
    </section>
  )
}

export default ChildForm