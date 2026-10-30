import { useState } from 'react'
import ParentDashboard from './ParentDashboard'
import ChildForm from './ChildForm'
import './App.css'

function App({ user = null, token = null }) {
  const [showChildForm, setShowChildForm] = useState(false)

  return (
    <>
      <ParentDashboard
        user={user}
        onAddChild={() => setShowChildForm(true)}
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

export default App