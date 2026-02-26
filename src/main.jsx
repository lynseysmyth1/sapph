import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { DiscoveryProvider } from './contexts/DiscoveryContext.jsx'
import { LocationProvider } from './contexts/LocationContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

const routerProps = { future: { v7_startTransition: true, v7_relativeSplatPath: true } }
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}

function initializeApp() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    console.error('[Main] Root element not found')
    document.body.innerHTML = '<div style="padding: 2rem; color: red;"><h1>Error: Root element not found</h1></div>'
    return
  }

  try {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <Router {...routerProps}>
            <AuthProvider>
              <LocationProvider>
                <DiscoveryProvider>
                  <App />
                </DiscoveryProvider>
              </LocationProvider>
            </AuthProvider>
          </Router>
        </ErrorBoundary>
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('[Main] Failed to render app:', error)
    const rootEl = document.getElementById('root')
    if (rootEl) {
      rootEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; text-align: center; background: #fff;">
          <h1 style="color: #F06B4A; margin-bottom: 1rem;">Failed to load app</h1>
          <p style="color: #555; margin-bottom: 1rem;">${error.message || 'Unknown error'}</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #F06B4A; color: white; border: none; border-radius: 12px; cursor: pointer; margin-top: 1rem;">
            Reload
          </button>
        </div>
      `
    }
  }
}
