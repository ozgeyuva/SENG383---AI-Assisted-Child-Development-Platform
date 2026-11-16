import { useChildSelection } from './ChildSelectionContext'
import ChildTaskPanel from './ChildTaskPanel'
import logo from './assets/lumi-logo.png'

function ChildTasksPage({ onBack, token }) {
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
        <img className="brand-logo" src={logo} alt="Lumi" />
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

      <ChildTaskPanel child={selectedChild} token={token} />
    </main>
  )
}

export default ChildTasksPage
