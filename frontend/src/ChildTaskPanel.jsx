import { useState } from 'react'
import TaskForm from './TaskForm'
import TaskList from './TaskList'

function ChildTaskPanel({ child, token }) {
  const [tasksVersion, setTasksVersion] = useState(0)
  const childKey = JSON.stringify([child.id, token])

  return (
    <div className="child-tasks-layout">
      <section className="action-card">
        <h2>Task List</h2>
        <TaskList key={JSON.stringify([childKey, tasksVersion])} childId={child.id} token={token} />
      </section>

      <aside className="action-card">
        <h2>Assign a New Task</h2>
        <p>Tasks created here will be assigned to {child.first_name} {child.last_name}.</p>
        <TaskForm
          key={childKey}
          childId={child.id}
          token={token}
          onCreated={() => setTasksVersion(previous => previous + 1)}
        />
      </aside>
    </div>
  )
}

export default ChildTaskPanel
