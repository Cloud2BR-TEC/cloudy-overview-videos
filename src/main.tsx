import { Component, StrictMode } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() { return { hasError: true } }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  resetApplication() {
    window.localStorage.removeItem('cloudy-video-project')
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return <main className="startup-recovery"><section><p>Cloudy Repository Video Studio</p><h1>Cloudy needs a fresh local start.</h1><button type="button" onClick={() => this.resetApplication()}>Reset local project data</button></section></main>
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>,
)
