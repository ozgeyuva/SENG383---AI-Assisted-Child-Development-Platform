import { useEffect, useState } from 'react'
import { useChildSelection } from './ChildSelectionContext'

function ChildSelector({ token }) {
  const { selectedChild, setSelectedChild } = useChildSelection()

  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    async function loadChildren() {
      try {
        const response = await fetch('/api/children', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Could not load children.')
        }

        if (!Array.isArray(data.children)) {
          throw new Error('Could not load children.')
        }

        if (controller.signal.aborted) return

        setChildren(data.children)

        setSelectedChild((previous) => {
          if (!previous) return null

          return data.children.find(
            (child) => child.id === previous.id
          ) || null
        })

        setError('')
      } catch (error) {
        if (controller.signal.aborted) return

        setChildren([])
        setSelectedChild(null)
        setError(error.message || 'Could not load children.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadChildren()

    return () => controller.abort()
  }, [token, attempt, setSelectedChild])

  function retry() {
    setError('')
    setLoading(true)
    setAttempt((previous) => previous + 1)
  }

  function handleSelection(event) {
    const child = children.find(
      (item) => String(item.id) === event.target.value
    )

    setSelectedChild(child || null)
  }

  if (!token) {
    return <p className="intro">Sign in to view your children.</p>
  }

  if (loading) {
    return <p role="status">Loading children...</p>
  }

  if (error) {
    return (
      <div>
        <p className="form-error" role="alert">{error}</p>

        <button
          type="button"
          className="secondary-button"
          onClick={retry}
        >
          Try Again
        </button>
      </div>
    )
  }

  if (children.length === 0) {
    return <p className="intro">No child profiles yet. Add your first child.</p>
  }

  return (
    <div className="child-selector">
      <label htmlFor="selected-child">Select your child</label>

      <select
        id="selected-child"
        value={selectedChild ? String(selectedChild.id) : ''}
        onChange={handleSelection}
      >
        <option value="">Choose a child</option>

        {children.map((child) => (
          <option key={child.id} value={String(child.id)}>
            {child.first_name} {child.last_name} — Grade {child.grade}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ChildSelector
