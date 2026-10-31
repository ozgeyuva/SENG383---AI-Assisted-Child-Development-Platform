import { useChildSelection } from './ChildSelectionContext'
import ChildSelector from './ChildSelector'
import logo from './assets/lumi-logo.png'

function ParentDashboard({ user,
  token,
  childrenVersion,
  onAddChild,
  onOpenTasks }) {
  const { selectedChild } = useChildSelection()
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <img className="brand-logo" src={logo} alt="Lumi" />
        <span className="account-label">Parent Dashboard</span>
      </header>

      <section className="welcome-card">
        <p className="eyebrow">A little support, every day</p>

        <h1>
          {fullName ? `Welcome, ${fullName}!` : 'Welcome to Lumi!'}
        </h1>

        <p className="intro">
          Support your child’s development, one step at a time.
        </p>

        {user && (
          <dl className="account-details">
            <div>
              <dt>Name</dt>
              <dd>{fullName}</dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="actions" aria-label="Parent actions">
        <article className="action-card">
         <h2>My Children</h2>
<p>Create a profile for your child to get started.</p>

<ChildSelector
  key={childrenVersion}
  token={token}
/>

          <button
            type="button"
            className="primary-button"
            onClick={onAddChild}
          >
            + Add My Children
          </button>
        </article>

        <article className="action-card">
  <h2>Tasks</h2>

  <p>
    {selectedChild
      ? `View tasks for ${selectedChild.first_name}.`
      : 'Select a child to open their tasks page.'}
  </p>
          <button
            type="button"
            className="secondary-button"
               onClick={onOpenTasks}
    disabled={!selectedChild}
          >
            Open Child’s Tasks
          </button>

        </article>
      </section>
    </main>
  )
}

export default ParentDashboard