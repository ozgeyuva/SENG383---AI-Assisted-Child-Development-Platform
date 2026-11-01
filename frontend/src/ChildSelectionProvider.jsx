import { useState } from 'react'
import { ChildSelectionContext } from './ChildSelectionContext'

function ChildSelectionProvider({ children }) {
  const [selectedChild, setSelectedChild] = useState(null)

  return (
    <ChildSelectionContext.Provider
      value={{ selectedChild, setSelectedChild }}
    >
      {children}
    </ChildSelectionContext.Provider>
  )
}

export default ChildSelectionProvider