import { useState } from 'react'

const categories = ['School', 'Extracurricular', 'Health', 'Other']

function EventForm({ childId, token, onCreated }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return

    const form = event.currentTarget
    const fields = new FormData(form)
    const title = fields.get('title').trim()

    setError('')
    setSuccess('')

    if (!title) {
      setError('Enter a title.')
      form.elements.namedItem('title').focus()
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          child_id: childId,
          title,
          event_date: fields.get('event_date'),
          event_time: fields.get('event_time'),
          category: fields.get('category'),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error || 'Could not save the event.')
        return
      }

      form.reset()
      setSuccess('Event added successfully.')
      onCreated?.()
    } catch {
      setError('Could not connect to the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="child-form" aria-label="Add an event" onSubmit={handleSubmit}>
      <fieldset disabled={saving}>
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Date
          <input name="event_date" type="date" required />
        </label>
        <label>
          Time
          <input name="event_time" type="time" required />
        </label>
        <label>
          Category
          <select name="category" defaultValue="" required>
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary-button">
          {saving ? 'Saving...' : 'Add Event'}
        </button>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}
    </form>
  )
}

export default EventForm