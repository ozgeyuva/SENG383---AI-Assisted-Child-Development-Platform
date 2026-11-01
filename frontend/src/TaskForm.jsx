import { useEffect, useId, useRef, useState } from 'react'

const emptyForm = { title: '', description: '', category: '', due_date: '' }

function TaskForm({ childId, token, onCreated }) {
  const [form, setForm] = useState({ ...emptyForm })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryError, setCategoryError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const formId = useId()
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
    setFieldErrors(previous => ({ ...previous, [name]: undefined }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submission.current || loading || categoryError) return
    const errors = {}
    setError('')
    setSuccess('')
    for (const [field, label] of [
      ['title', 'Title'], ['description', 'Description'],
      ['category', 'Category'], ['due_date', 'Due date'],
    ]) {
      if (!form[field].trim()) {
        errors[field] = `${label} is required.`
      }
    }
    const date = new Date(`${form.due_date}T00:00:00.000Z`)
    if (form.due_date && (!/^\d{4}-\d{2}-\d{2}$/.test(form.due_date) ||
        Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.due_date)) {
      errors.due_date = 'Enter a valid due date.'
    }
    if (form.category && !categories.includes(form.category)) {
      errors.category = 'Select a valid category.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      const firstField = Object.keys(errors)[0]
      setError(errors[firstField])
      event.currentTarget.elements.namedItem(firstField)?.focus()
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
        const serverErrors = {}
        for (const field of Object.keys(emptyForm)) {
          if (typeof data.errors?.[field] === 'string') serverErrors[field] = data.errors[field]
          else if (data.field === field && typeof data.error === 'string') serverErrors[field] = data.error
        }
        setFieldErrors(serverErrors)
        return
      }
      setSuccess('Task assigned successfully. Status: Not Started.')
      setForm({ ...emptyForm })
      setFieldErrors({})
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

  function fieldProps(name) {
    return {
      'aria-invalid': !!fieldErrors[name],
      'aria-describedby': fieldErrors[name] ? `${formId}-${name}-error` : undefined,
    }
  }

  function fieldError(name) {
    return fieldErrors[name] && <span className="form-error task-field-error"
      id={`${formId}-${name}-error`}>{fieldErrors[name]}</span>
  }

  return (
    <form className="child-form task-form" aria-label="Assign a new task" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={saving || loading || !!categoryError}>
        <label>
          Title
          <input name="title" value={form.title} onChange={handleChange} {...fieldProps('title')}
            placeholder="e.g., Read for 15 minutes" required />
        </label>
        {fieldError('title')}
        <label>
          Description
          <textarea name="description" value={form.description} onChange={handleChange} {...fieldProps('description')}
            placeholder="Add task details..." rows={4} required />
        </label>
        {fieldError('description')}
        <label>
          Category
          <select name="category" value={form.category} onChange={handleChange} {...fieldProps('category')} required>
            <option value="">Select a category</option>
            {categories.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        {fieldError('category')}
        <label>
          Due date
          <input type="date" name="due_date" value={form.due_date} onChange={handleChange} {...fieldProps('due_date')} required />
        </label>
        {fieldError('due_date')}
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
