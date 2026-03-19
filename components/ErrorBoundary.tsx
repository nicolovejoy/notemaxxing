'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from './ui/Button'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-surface rounded-lg shadow-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-text-tertiary mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-text-tertiary hover:text-text-secondary">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-surface-inset p-3 rounded overflow-auto text-text-secondary">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <Button onClick={() => window.location.reload()} variant="primary">
              Refresh Page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
