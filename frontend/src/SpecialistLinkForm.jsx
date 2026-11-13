import { useState } from 'react'

function SpecialistLinkForm({ childId, token }) {
  const [email, setEmail] = useState('')
  const [specialistType, setSpecialistType] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return

    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const response = await fetch(`/api/children/${childId}/specialists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          specialist_type: specialistType.trim(),
        }),
      })

      const data = await response.json().catch(() => null)

      if (response.status !== 201) {
        setError(data?.error || 'Could not link the specialist. Please try again.')
        return
      }

      setSuccess('Specialist linked successfully.')
      setEmail('')
      setSpecialistType('')
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="child-form" onSubmit={handleSubmit}>
      <h3>Link a Specialist</h3>

      <fieldset disabled={saving}>
        <label>
          Specialist email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Specialist type
          <input
            type="text"
            value={specialistType}
            onChange={(event) => setSpecialistType(event.target.value)}
            placeholder="e.g. Teacher"
            required
          />
        </label>
      </fieldset>

      <button type="submit" className="primary-button" disabled={saving}>
        {saving ? 'Linking...' : 'Link Specialist'}
      </button>

      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}
    </form>
  )
}

export default SpecialistLinkForm