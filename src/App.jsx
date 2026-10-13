import React from 'react'
import { AppProvider } from './context/AppContext.jsx'
import Shell from './components/Shell.jsx'

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
