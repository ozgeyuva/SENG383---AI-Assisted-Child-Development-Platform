import { useChildSelection } from './ChildSelectionContext'

function ChildTasksPage({ onBack }) {
  const { selectedChild } = useChildSelection()

  if (!selectedChild) {
    return (
      <main className="dashboard">
        <p>Please select a child first.</p>
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          Back to Dashboard
        </button>
      </main>
    )
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <span className="brand">lumi</span>

        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          Back to Dashboard
        </button>
      </header>

      <h1>
        {selectedChild.first_name} {selectedChild.last_name}’s Tasks
      </h1>

      <p className="intro">
        Grade {selectedChild.grade}
      </p>

      <div className="child-tasks-layout">
        <section className="action-card">
          <h2>Task List</h2>
          <p>The task list will be available here soon.</p>
        </section>

        <aside className="action-card">
          <h2>Assign a New Task</h2>
          <p>
            Tasks created here will be assigned to{' '}
            {selectedChild.first_name} {selectedChild.last_name}.
          </p>

          <button
            type="button"
            className="primary-button"
            disabled
          >
            Assign Task
          </button>

          <small>Coming soon</small>
        </aside>
      </div>
    </main>
  )
}

export default ChildTasksPage