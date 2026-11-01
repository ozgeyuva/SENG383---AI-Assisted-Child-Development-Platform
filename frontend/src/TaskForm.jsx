import { useEffect, useRef, useState } from 'react'

const emptyForm = { title: '', description: '', category: '', due_date: '' }

function TaskForm({ childId, token, onCreated }) {
  const [form, setForm] = useState({ ...emptyForm })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryError, setCategoryError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const submission = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    async function loadCategories() {
      try {
        const response = await fetch('/api/tasks/categories', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load categories.')
        if (!Array.isArray(data.categories) || data.categories.length === 0 ||
            data.categories.some(category => typeof category !== 'string' || !category.trim())) {
          throw new Error('No task categories are available. Please try again.')
        }
        if (!controller.signal.aborted) setCategories(data.categories)
      } catch (error) {
        if (!controller.signal.aborted) setCategoryError(error.message || 'Could not load categories.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    loadCategories()
    return () => controller.abort()
  }, [token, attempt])

  useEffect(() => () => submission.current?.abort(), [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submission.current || loading || categoryError) return
    setError('')
    setSuccess('')
    for (const [field, label] of [
      ['title', 'Title'], ['description', 'Description'],
      ['category', 'Category'], ['due_date', 'Due date'],
    ]) {
      if (!form[field].trim()) {
        setError(`${label} is required.`)
        return
      }
    }
    const date = new Date(`${form.due_date}T00:00:00.000Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.due_date) ||
        Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.due_date) {
      setError('Enter a valid due date.')
      return
    }
    if (!categories.includes(form.category)) {
      setError('Select a valid category.')
      return
    }
    if (!token || !Number.isSafeInteger(childId) || childId < 1) {
      setError('Please sign in and select a child before assigning a task.')
      return
    }
    const controller = new AbortController()
    submission.current = controller
    setSaving(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          child_id: childId, title: form.title.trim(), description: form.description.trim(),
          category: form.category, due_date: form.due_date,
        }),
        signal: controller.signal,
      })
      const data = await response.json()
      if (controller.signal.aborted) return
      if (!response.ok) {
        setError(data.error || 'Could not assign the task. Please try again.')
        return
      }
      setSuccess('Task assigned successfully. Status: Not Started.')
      setForm({ ...emptyForm })
      onCreated?.(data.task)
    } catch {
      if (!controller.signal.aborted) {
        setError('Could not connect to the server. Please try again.')
      }
    } finally {
      submission.current = null
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  return (
    <form className="child-form task-form" aria-label="Assign a new task" onSubmit={handleSubmit}>
      <fieldset disabled={saving || loading || !!categoryError}>
        <label>
          Title
          <input name="title" value={form.title} onChange={handleChange}
            placeholder="e.g., Read for 15 minutes" required />
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={handleChange}
            placeholder="Add task details..." rows={4} required />
        </label>
        <label>
          Category
          <select name="category" value={form.category} onChange={handleChange} required>
            <option value="">Select a category</option>
            {categories.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label>
          Due date
          <input type="date" name="due_date" value={form.due_date} onChange={handleChange} required />
        </label>
      </fieldset>
      <small>Initial status: Not Started</small>
      {loading && <p role="status">Loading categories...</p>}
      {categoryError && <>
        <p className="form-error" role="alert">{categoryError}</p>
        <button type="button" className="secondary-button" onClick={() => {
          setCategoryError('')
          setLoading(true)
          setAttempt(previous => previous + 1)
        }}>Retry Categories</button>
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}
      <button type="submit" className="primary-button"
        disabled={saving || loading || !!categoryError}>
        {saving ? 'Assigning...' : 'Assign Task'}
      </button>
    </form>
  )
}

export default TaskForm
