import { useEffect, useState } from 'react'
import SpecialistLinkForm from './SpecialistLinkForm'

function LinkedSpecialists({ childId, token }) {
  const [specialists, setSpecialists] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [unlinkError, setUnlinkError] = useState('')
  const [unlinking, setUnlinking] = useState(false)
  const [version, setVersion] = useState(0)
  const url = `/api/children/${childId}/specialists`

  function refreshList() {
    setLoading(true)
    setLoadError('')
    setVersion(previous => previous + 1)
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadSpecialists() {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const data = await response.json()

        if (!response.ok || !Array.isArray(data.specialists)) {
          throw new Error(data.error || 'Could not load linked specialists.')
        }

        if (!controller.signal.aborted) {
          setSpecialists(data.specialists)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadSpecialists()
    return () => controller.abort()
  }, [url, token, version])

  async function unlinkSpecialist(specialist) {
    const name = `${specialist.first_name} ${specialist.last_name}`
    if (!window.confirm(`Unlink ${name} from this child?`)) return

    setUnlinkError('')
    setUnlinking(true)

    try {
      const response = await fetch(`${url}/${specialist.specialist_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmed: true }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Could not unlink the specialist.')
      }

      refreshList()
    } catch (error) {
      setUnlinkError(error.message)
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <>
      <SpecialistLinkForm
        childId={childId}
        token={token}
        onLinked={refreshList}
      />

      <section aria-label="Linked specialists">
        <h3>Linked Specialists</h3>

        {loading && <p role="status">Loading specialists...</p>}
        {unlinkError && <p role="alert">{unlinkError}</p>}
        {loadError && (
          <div>
            <p role="alert">{loadError}</p>
            <button type="button" onClick={refreshList}>Try Again</button>
          </div>
        )}

        {!loading && !loadError && (
          specialists.length === 0 ? (
            <p>No specialists linked yet.</p>
          ) : (
            <ul>
              {specialists.map(specialist => (
                <li key={specialist.specialist_id}>
                  {specialist.first_name} {specialist.last_name}
                  {' · '}{specialist.specialist_type}{' '}
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={unlinking}
                    onClick={() => unlinkSpecialist(specialist)}
                    aria-label={`Unlink ${specialist.first_name} ${specialist.last_name}`}
                  >
                    Unlink
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </>
  )
}

export default LinkedSpecialists