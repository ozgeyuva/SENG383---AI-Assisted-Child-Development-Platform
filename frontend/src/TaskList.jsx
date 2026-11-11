import { useEffect, useState } from 'react'

const statusClasses = {
  'Not Started': 'task-not-started',
  'In Progress': 'task-in-progress',
  Completed: 'task-completed',
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function TaskList({ childId, token }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    const controller = new AbortController()
    async function loadTasks() {
      try {
        const response = await fetch(`/api/tasks?childId=${encodeURIComponent(childId)}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load tasks.')
        if (!Array.isArray(data.tasks)) throw new Error('Could not load tasks.')
        if (!controller.signal.aborted) {
          setTasks(data.tasks)
          setError('')
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message || 'Could not load tasks.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    loadTasks()
    return () => controller.abort()
  }, [childId, token, attempt])

  if (loading) return <p role="status">Loading tasks...</p>
  if (error) return <div>
    <p className="form-error" role="alert">{error}</p>
    <button type="button" className="secondary-button" onClick={() => {
      setLoading(true)
      setError('')
      setAttempt(previous => previous + 1)
    }}>Retry Tasks</button>
  </div>
  if (!tasks.length) return <p>No tasks assigned yet. Use the form to assign the first task.</p>

  const visible = tasks.filter(task => filter === 'All' || task.status === filter)
  const groups = Object.groupBy(visible, task => task.due_date)

  return (
    <div className="task-list">
      <div className="task-filters" role="group" aria-label="Filter tasks by status">
        {['All', 'Not Started', 'In Progress', 'Completed'].map(status => (
          <button key={status} type="button" className="secondary-button"
            aria-pressed={filter === status} onClick={() => setFilter(status)}>
            {status} ({status === 'All' ? tasks.length : tasks.filter(task => task.status === status).length})
          </button>
        ))}
      </div>
      {!visible.length && <p>No {filter.toLowerCase()} tasks.</p>}
      {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => (
        <section className="task-day" key={date} aria-label={`Tasks due ${date}`}>
          <h3><time dateTime={date}>{formatDate(date)}</time></h3>
          <ul>
            {items.map(task => <li key={task.id} className="task-row">
              <div className="task-row-heading">
                <h4>{task.title}</h4>
                <span className={`task-badge ${statusClasses[task.status] || ''}`}>{task.status}</span>
              </div>
              <p className="task-description">{task.description}</p>
              <span className="task-category">{task.category}</span>
            </li>)}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default TaskList
