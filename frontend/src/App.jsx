import { useState } from 'react'
import ParentDashboard from './ParentDashboard'
import ChildForm from './ChildForm'
import ChildTasksPage from './ChildTasksPage'
import ChildSelectionProvider from './ChildSelectionProvider'
import './App.css'
import RegisterForm from './RegisterForm'
import LoginForm from './LoginForm'

function ParentScreen({ user, token }) {
  const [showChildForm, setShowChildForm] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [childrenVersion, setChildrenVersion] = useState(0)

  if (page === 'tasks') {
    return (
      <ChildTasksPage
        onBack={() => setPage('dashboard')}
      />
    )
  }

  return (
    <>
      <ParentDashboard
        user={user}
        token={token}
        childrenVersion={childrenVersion}
        onAddChild={() => setShowChildForm(true)}
        onOpenTasks={() => {
          setShowChildForm(false)
          setPage('tasks')
        }}
      />

      {showChildForm && (
        <ChildForm
          token={token}
          onClose={() => setShowChildForm(false)}
          onCreated={() => {
            setChildrenVersion((previous) => previous + 1)
          }}
        />
      )}
    </>
  )
}

function SessionApp({ user = null, token = null }) {
  const [session, setSession] = useState(() => 
    user && token ? { user, token } : null
  )
  const [authPage, setAuthPage] = useState('login')

  function handleLogout() {
    setSession(null)
    setAuthPage('login')
  }

  if (!session) {
    if (authPage === 'register') {
      return (
        <RegisterForm onLogin={() => setAuthPage('login')} />
      )
    }
    return (
      <LoginForm
        onLogin={setSession}
        onRegister={() => setAuthPage('register')}
      />
    )
  }

  const sessionKey = JSON.stringify([session.user.id, session.token])

  return (
    <>
    <div className="session-actions">
      <button
        type="button"
        className="secondary-button"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
    
    {session.user.role === 'parent' ? (
      <ChildSelectionProvider key={sessionKey}>
        <ParentScreen user={session.user} token={session.token} />
      </ChildSelectionProvider>
    ) : (
      <main className="dashboard">
        <section className="welcome-card">
          <h1>Welcome, {session.user.firstName}!</h1>
          <p>Account role: {session.user.role}</p>
        </section>
      </main>
    )}
  </>
  )
}

function App({ user = null, token = null }) {
  const accountKey = JSON.stringify([user?.id ?? null, token])

  return (
    <SessionApp
      key={accountKey}
      user={user}
      token={token}
    />
  )
}

export default App