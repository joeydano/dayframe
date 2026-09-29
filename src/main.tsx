import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import './styles.css'
import App from './App'

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <main className="loading-screen">
        <h1>Something interrupted Dayframe.</h1>
        <p>Your saved planner is still on this device. Close and reopen the app to try again.</p>
      </main>
    ) : (
      this.props.children
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
