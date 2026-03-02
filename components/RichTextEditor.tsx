'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Sparkles, Undo, Redo } from 'lucide-react'
import { useAI } from '@/lib/hooks/useAI'
import { useState, useRef, useEffect } from 'react'
import { EnhancementPreview } from './EnhancementPreview'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onBlur?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export function RichTextEditor({
  content,
  onChange,
  onBlur,
  autoFocus = false,
}: RichTextEditorProps) {
  const { enhance, isEnhancing } = useAI()
  const [contentHistory, setContentHistory] = useState<string[]>([])
  const [showUndo, setShowUndo] = useState(false)
  const lastEnhancedContent = useRef<string | null>(null)
  const [floatingButton, setFloatingButton] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  })
  const [selectedText, setSelectedText] = useState('')
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<{
    original: string
    enhanced: string
    improvements: string[]
    isSelection: boolean
  }>({ original: '', enhanced: '', improvements: [], isSelection: false })
  const floatingButtonRef = useRef<HTMLDivElement>(null)
  const selectionTimerRef = useRef<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onBlur,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6',
      },
    },
    immediatelyRender: false,
  })

  // Handle text selection
  useEffect(() => {
    if (!editor) return

    const updateSelection = () => {
      // Clear any pending timer
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current)
        selectionTimerRef.current = null
      }

      const { selection } = editor.state
      const { from, to } = selection
      const text = editor.state.doc.textBetween(from, to, ' ')

      if (text && text.trim().length > 0) {
        // Get selection coordinates
        const coords = editor.view.coordsAtPos(from)
        const editorRect = editor.view.dom.getBoundingClientRect()

        // Calculate button position with bounds checking
        const buttonWidth = 120 // Approximate button width
        let x = coords.left - editorRect.left

        // Ensure button stays within editor bounds
        // Account for translateX(-50%) which shifts button left by half its width
        const minX = buttonWidth / 2
        const maxX = editorRect.width - buttonWidth / 2
        x = Math.max(minX, Math.min(x, maxX))

        setSelectedText(text)
        // Don't set range here - we'll capture it when enhance is clicked

        // Delay showing the button to avoid triggering on triple-click select-all
        selectionTimerRef.current = setTimeout(() => {
          setFloatingButton({
            x,
            y: Math.max(10, coords.top - editorRect.top - 40), // Position above selection, min 10px from top
            show: true,
          })
        }, 400)
      } else {
        setFloatingButton({ x: 0, y: 0, show: false })
        setSelectedText('')
        // Don't clear selectedRange here - we need it for the enhancement
      }
    }

    editor.on('selectionUpdate', updateSelection)
    return () => {
      editor.off('selectionUpdate', updateSelection)
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current)
      }
    }
  }, [editor])

  // Hide floating button when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (floatingButtonRef.current && !floatingButtonRef.current.contains(e.target as Node)) {
        const editorDom = editor?.view.dom
        if (editorDom && !editorDom.contains(e.target as Node)) {
          setFloatingButton({ x: 0, y: 0, show: false })
        }
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editor])

  const handleEnhance = async (isSelection = false) => {
    if (!editor || isEnhancing) return

    try {
      const currentContent = editor.getHTML()
      let textToEnhance = ''

      if (isSelection && selectedText) {
        // Store the current selection range NOW, before the modal opens
        const { from, to } = editor.state.selection
        setSelectedRange({ from, to })

        // For selections, we'll use plain text for now
        // TODO: In the future, we can implement HTML extraction for selections
        textToEnhance = selectedText
      } else {
        // For full document, send HTML to preserve formatting
        textToEnhance = editor.getHTML()
      }

      // Save current state to editor's history before enhancing
      editor.chain().focus().setContent(currentContent).run()

      const enhanced = await enhance(textToEnhance)

      // Analyze improvements (simple example - in production, do this server-side)
      const improvements = []
      if (enhanced !== textToEnhance) {
        improvements.push('Corrected spelling and grammar')
        improvements.push('Improved clarity and readability')
        improvements.push('Enhanced formatting and structure')
      }

      // Always show preview, whether it's selection or full document
      setPreviewData({
        original: textToEnhance,
        enhanced,
        improvements,
        isSelection: isSelection, // Don't check selectedText here - we already checked it above
      })
      setShowPreview(true)
    } catch (error) {
      // Error handling is done in the hook
      console.error('Enhancement failed:', error)
    }
  }

  const acceptEnhancement = () => {
    if (!editor || !previewData.enhanced) return

    const currentContent = editor.getHTML()
    setContentHistory((prev) => [...prev, currentContent])

    if (previewData.isSelection && selectedRange) {
      // For selection enhancement, extract plain text from enhanced HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = previewData.enhanced
      const enhancedText = tempDiv.textContent || tempDiv.innerText || ''

      // Set selection and replace with plain text
      editor
        .chain()
        .focus()
        .setTextSelection({ from: selectedRange.from, to: selectedRange.to })
        .deleteSelection()
        .insertContent(enhancedText)
        .run()
    } else {
      // Handle full document replacement
      editor.chain().focus().setContent(previewData.enhanced).run()
    }

    onChange(editor.getHTML())

    // Show undo button
    lastEnhancedContent.current = editor.getHTML()
    setShowUndo(true)
    setTimeout(() => setShowUndo(false), 10000)

    // Close preview and reset ALL selection state
    setShowPreview(false)
    setFloatingButton({ x: 0, y: 0, show: false })
    setSelectedText('')
    setSelectedRange(null) // Clear range after enhancement is done
  }

  const handleUndo = () => {
    if (contentHistory.length > 0 && editor) {
      const previousContent = contentHistory[contentHistory.length - 1]
      editor.chain().focus().setContent(previousContent).run()
      onChange(previousContent)
      setContentHistory((prev) => prev.slice(0, -1))
      setShowUndo(false)
      lastEnhancedContent.current = null
    }
  }

  if (!editor) {
    return null
  }

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-hidden relative">
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-2 flex items-center gap-1 bg-gray-50">
          {/* Undo/Redo buttons */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Cmd+Z)"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor.isActive('bold') ? 'bg-gray-200' : ''
            }`}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor.isActive('italic') ? 'bg-gray-200' : ''
            }`}
          >
            <Italic className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor.isActive('bulletList') ? 'bg-gray-200' : ''
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor.isActive('orderedList') ? 'bg-gray-200' : ''
            }`}
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <select
            onChange={(e) => {
              const level = parseInt(e.target.value)
              if (level === 0) {
                editor.chain().focus().setParagraph().run()
              } else {
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: level as 1 | 2 | 3 })
                  .run()
              }
            }}
            value={
              editor.isActive('heading', { level: 1 })
                ? 1
                : editor.isActive('heading', { level: 2 })
                  ? 2
                  : editor.isActive('heading', { level: 3 })
                    ? 3
                    : 0
            }
            className="px-2 py-1 rounded border border-gray-300 text-sm"
          >
            <option value="0">Normal</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>

          {/* AI Enhance Button */}
          <div className="ml-auto flex items-center gap-2">
            {showUndo && contentHistory.length > 0 && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                title="Undo AI enhancement"
              >
                <Undo className="h-4 w-4" />
                Undo AI
              </button>
            )}
            <button
              onClick={() => handleEnhance()}
              disabled={isEnhancing || !editor.getText().trim()}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isEnhancing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-navy text-white hover:bg-brand-navy-light'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {isEnhancing ? 'Enhancing...' : 'Enhance entire note'}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="relative">
          <EditorContent editor={editor} className="min-h-[400px]" />

          {/* Floating enhance button */}
          {floatingButton.show && (
            <div
              ref={floatingButtonRef}
              className="absolute z-10"
              style={{
                left: `${floatingButton.x}px`,
                top: `${floatingButton.y}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <button
                onClick={() => handleEnhance(true)}
                disabled={isEnhancing}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-brand-navy text-white rounded-md hover:bg-brand-navy-light shadow-lg transition-all"
              >
                <Sparkles className="h-3 w-3" />
                {isEnhancing ? 'Enhancing...' : 'Enhance selection'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhancement Preview Modal */}
      <EnhancementPreview
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false)
          setFloatingButton({ x: 0, y: 0, show: false })
          // Clear selection state when closing without accepting
          setSelectedText('')
          setSelectedRange(null)
        }}
        originalText={previewData.original}
        enhancedText={previewData.enhanced}
        improvements={previewData.improvements}
        onAccept={acceptEnhancement}
      />
    </>
  )
}
