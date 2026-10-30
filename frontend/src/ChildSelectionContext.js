import { createContext, useContext } from 'react'

export const ChildSelectionContext = createContext(null)

export function useChildSelection() {
  const context = useContext(ChildSelectionContext)

  if (context === null) {
    throw new Error(
      'useChildSelection must be used inside ChildSelectionProvider'
    )
  }

  return context
}