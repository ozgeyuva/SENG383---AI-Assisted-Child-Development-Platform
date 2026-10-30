import { useState } from 'react'
import ParentDashboard from './ParentDashboard'
import ChildForm from './ChildForm'
import ChildTasksPage from './ChildTasksPage'
import ChildSelectionProvider from './ChildSelectionProvider'
import './App.css'

function ParentScreen({ user, token }) {
  const [showChildForm, setShowChildForm] = useState(false)
  const [page, setPage] = useState('dashboard')

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
        />
      )}
    </>
  )
}

function App({ user = null, token = null }) {
  const sessionKey = JSON.stringify([user?.id ?? null, token])

  return (
    <ChildSelectionProvider key={sessionKey}>
      <ParentScreen user={user} token={token} />
    </ChildSelectionProvider>
  )
}

export default App