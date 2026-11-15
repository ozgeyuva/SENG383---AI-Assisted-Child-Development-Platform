import { useEffect, useState } from 'react'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function addDays(date, amount) {
  const next = new Date(date + 'T00:00:00Z')
  next.setUTCDate(next.getUTCDate() + amount)
  return next.toISOString().slice(0, 10)
}

function currentMonday() {
  const today = new Date()
  const date = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  return addDays(date, -((today.getDay() + 6) % 7))
}

export default function WeeklyCalendar({ childId, token, refresh }) {
  const [weekStart, setWeekStart] = useState(currentMonday)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ childId: String(childId), weekStart })

    async function loadEvents() {
      try {
        const response = await fetch('/api/events?' + query, {
          headers: { Authorization: 'Bearer ' + token },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Could not load the weekly schedule.')

        const data = await response.json()
        if (!controller.signal.aborted) {
          setEvents(data.events)
          setError('')
        }
      } catch {
        if (!controller.signal.aborted) {
          setError('Could not load the weekly schedule.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadEvents()
    return () => controller.abort()
  }, [childId, token, weekStart, refresh])

  function moveWeek(amount) {
    setLoading(true)
    setError('')
    setWeekStart(week => addDays(week, amount))
  }

  return (
    <section aria-label="Weekly schedule">
      <h3>Weekly Schedule</h3>
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={() => moveWeek(-7)}>
          Previous week
        </button>
        <button type="button" className="secondary-button" onClick={() => moveWeek(7)}>
          Next week
        </button>
      </div>
      <p>{weekStart} – {addDays(weekStart, 6)}</p>

      {loading && <p role="status">Loading events...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {!loading && !error && days.map((day, index) => {
        const date = addDays(weekStart, index)
        const dayEvents = events.filter(event => event.event_date === date)

        return (
          <section key={date}>
            <h4>{day} · {date}</h4>
            {dayEvents.length > 0 && (
              <ul>
                {dayEvents.map(event => (
                  <li key={event.id}>
                    {event.event_time} · {event.title}{' '}
                    <span className="event-category" data-category={event.category}>
                        {event.category}
                    </span>
                </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </section>
  )
}