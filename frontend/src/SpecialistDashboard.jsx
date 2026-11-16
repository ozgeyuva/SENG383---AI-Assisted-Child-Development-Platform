import { useEffect, useState } from 'react'
import logo from './assets/lumi-logo.png'
import ChildSchedule from './ChildSchedule'
import ChildTaskPanel from './ChildTaskPanel'

function SpecialistDashboard({ user, token }) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selectedChildId, setSelectedChildId] = useState(null)
  const selectedChild = children.find(child => child.id === selectedChildId)

  useEffect(() => {
    const controller = new AbortController()

    async function loadChildren() {
      try {
        const response = await fetch('/api/specialists/me/children', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const data = await response.json().catch(() => null)

        if (!response.ok || !Array.isArray(data?.children)) {
          throw new Error(data?.error || 'Could not load linked children.')
        }

        if (!controller.signal.aborted) {
          setChildren(data.children)
        }
      } catch {
        if (!controller.signal.aborted) {
          setError('Could not load linked children. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadChildren()
    return () => controller.abort()
  }, [token, attempt])

  function retry() {
    setError('')
    setLoading(true)
    setAttempt(previous => previous + 1)
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <img className="brand-logo" src={logo} alt="Lumi" />
        <span className="account-label">Specialist Dashboard</span>
      </header>

      <section className="welcome-card">
        <p className="eyebrow">A little support, every day</p>
        <h1>Welcome, {fullName}!</h1>
        <p className="intro">
          Follow the development of children linked to your account.
        </p>

        <dl className="account-details">
          <div>
            <dt>Name</dt>
            <dd>{fullName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="action-card" aria-labelledby="linked-children-heading">
        <h2 id="linked-children-heading">Linked Children</h2>

        {loading && <p role="status">Loading linked children...</p>}

        {error && (
          <div>
            <p className="form-error" role="alert">{error}</p>
            <button type="button" className="secondary-button" onClick={retry}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          children.length === 0 ? (
            <p>No children linked to your account yet.</p>
          ) : (
            <ul>
              {children.map(child => (
                <li key={child.id}>
                  {child.first_name} {child.last_name}
                  {' · '}Grade {child.grade}
                  {' · '}{child.specialist_type}
                  <details>
                    <summary>Add an event for {child.first_name}</summary>
                    <ChildSchedule childId={child.id} token={token} />
                  </details>
                  {' '}
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Open tasks for ${child.first_name} ${child.last_name}`}
                    aria-pressed={child.id === selectedChildId}
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    Open Tasks
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
      {!loading && !error && selectedChild && (
        <section aria-label={`Tasks for ${selectedChild.first_name} ${selectedChild.last_name}`}>
          <h2>{selectedChild.first_name} {selectedChild.last_name}’s Tasks</h2>
          <ChildTaskPanel child={selectedChild} token={token} />
        </section>
      )}
    </main>
  )
}

export default SpecialistDashboard
