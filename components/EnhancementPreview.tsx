'use client'

import { Modal } from '@/components/ui/Modal'
import { ModalFooter } from '@/components/ui/ModalFooter'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { Check, X, Sparkles } from 'lucide-react'
import { useEffect } from 'react'

interface EnhancementPreviewProps {
  isOpen: boolean
  onClose: () => void
  originalText: string
  enhancedText: string
  onAccept: () => void
  improvements?: string[]
}

export function EnhancementPreview({
  isOpen,
  onClose,
  originalText,
  enhancedText,
  onAccept,
  improvements = [],
}: EnhancementPreviewProps) {
  // In the future, we can add diff visualization here

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onAccept()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onAccept, onClose])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Enhancement Preview" size="lg">
      <div className="space-y-4">
        {/* Improvements Summary */}
        {improvements.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Improvements Made
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Original</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-64 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{originalText}</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Enhanced</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 h-64 overflow-y-auto">
              <div
                className="text-sm text-gray-700 whitespace-pre-wrap prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: enhancedText }}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <ModalFooter>
          <LoadingButton onClick={onClose} variant="secondary" icon={X}>
            Cancel
          </LoadingButton>
          <LoadingButton
            onClick={onAccept}
            variant="primary"
            icon={Check}
            className="!bg-green-600 hover:!bg-green-700"
          >
            Accept Changes
          </LoadingButton>
        </ModalFooter>

        {/* Keyboard shortcuts hint */}
        <p className="text-xs text-gray-500 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘+Enter</kbd> to accept or{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to cancel
        </p>
      </div>
    </Modal>
  )
}
