import { useState } from 'react'
import ParentDashboard from './ParentDashboard'
import ChildForm from './ChildForm'
import ChildTasksPage from './ChildTasksPage'
import ChildSelectionProvider from './ChildSelectionProvider'
import './App.css'
import RegisterForm from './RegisterForm'

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

function App({ user = null, token = null }) {
  const sessionKey = JSON.stringify([user?.id ?? null, token])

  if (!user || !token) {
    return <RegisterForm />
  }
  
  return (
    <ChildSelectionProvider key={sessionKey}>
      <ParentScreen user={user} token={token} />
    </ChildSelectionProvider>
  )
}


export default App