import { useState } from 'react'
import EventForm from './EventForm'
import WeeklyCalendar from './WeeklyCalendar'

export default function ChildSchedule({ childId, token }) {
  const [refresh, setRefresh] = useState(0)

  return (
    <>
      <EventForm
        childId={childId}
        token={token}
        onCreated={() => setRefresh(value => value + 1)}
      />
      <WeeklyCalendar childId={childId} token={token} refresh={refresh} />
    </>
  )
}