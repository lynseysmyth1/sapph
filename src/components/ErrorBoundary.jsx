import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#fff'
        }}>
          <h1 style={{ color: '#F06B4A', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#555', marginBottom: '1rem' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#F06B4A',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
