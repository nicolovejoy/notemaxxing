'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Timer,
  RotateCcw,
  BookOpen,
  Check,
  Sparkles,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { UserMenu } from '@/components/user-menu'
import { useNotebooks, useNotesInNotebook, useSyncState } from '@/lib/store'
import { Skeleton } from '@/components/ui/Skeleton'
import { toPlainText } from '@/lib/utils/content'

type Step = 'select-notebook' | 'select-notes' | 'configure' | 'typing' | 'results'

export default function TypingPage() {
  const notebooks = useNotebooks()
  const syncState = useSyncState()
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null)
  const notes = useNotesInNotebook(selectedNotebook || '')

  const notebooksLoading = syncState.status === 'loading'
  const notesLoading = syncState.status === 'loading'

  const [currentStep, setCurrentStep] = useState<Step>('select-notebook')
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [wordCount, setWordCount] = useState(100)
  const [generatedText, setGeneratedText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Typing test state
  const [userInput, setUserInput] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [errors, setErrors] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // Calculate metrics
  const calculateWPM = () => {
    if (!startTime || !endTime) return 0
    const minutes = (endTime - startTime) / 60000
    const words = generatedText.split(' ').length
    return Math.round(words / minutes)
  }

  const accuracy =
    userInput.length > 0 ? Math.round(((userInput.length - errors) / userInput.length) * 100) : 100

  // Handle note selection
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    )
  }

  const selectAllNotes = () => {
    setSelectedNotes(notes.map((note) => note.id))
  }

  const clearSelection = () => {
    setSelectedNotes([])
  }

  // Generate practice text
  const generatePracticeText = async () => {
    if (selectedNotes.length === 0) return

    setIsGenerating(true)
    try {
      const selectedNotesContent = notes
        .filter((note) => selectedNotes.includes(note.id))
        .map((note) => ({
          title: note.title,
          content: toPlainText(note.content),
        }))

      const response = await fetch('/api/typing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: selectedNotesContent,
          wordCount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate text')
      }

      setGeneratedText(data.text)
      setCurrentStep('typing')
    } catch (error) {
      console.error('Failed to generate practice text:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate practice text')
    } finally {
      setIsGenerating(false)
    }
  }

  // Typing test handlers
  const handleInputChange = (value: string) => {
    if (!startTime && value.length > 0) {
      setStartTime(Date.now())
    }

    if (value.length <= generatedText.length) {
      setUserInput(value)

      // Count errors
      let errorCount = 0
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== generatedText[i]) {
          errorCount++
        }
      }
      setErrors(errorCount)
    }
  }

  useEffect(() => {
    if (userInput.length === generatedText.length && !isComplete && generatedText.length > 0) {
      setEndTime(Date.now())
      setIsComplete(true)
      setCurrentStep('results')
    }
  }, [userInput, generatedText, isComplete])

  const reset = () => {
    setUserInput('')
    setStartTime(null)
    setEndTime(null)
    setErrors(0)
    setIsComplete(false)
    setCurrentStep('typing')
  }

  const startNewSession = () => {
    setUserInput('')
    setStartTime(null)
    setEndTime(null)
    setErrors(0)
    setIsComplete(false)
    setCurrentStep('configure')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="p-2 rounded-md hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-800" />
              </Link>
              <Link
                href="/"
                className="flex items-center gap-3 ml-4 hover:opacity-80 transition-opacity"
              >
                <Logo size={36} />
                <h1 className="text-xl font-semibold italic">Typemaxxing</h1>
              </Link>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Step 1: Select Notebook */}
        {currentStep === 'select-notebook' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light italic mb-2">Select a Notebook</h2>
              <p className="text-gray-600">Choose a notebook to practice typing with your notes</p>
            </div>

            {notebooksLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} height={120} className="rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notebooks
                  .filter((nb) => !nb.archived)
                  .map((notebook) => (
                    <button
                      key={notebook.id}
                      onClick={() => {
                        setSelectedNotebook(notebook.id)
                        setCurrentStep('select-notes')
                      }}
                      className={`${notebook.color} p-6 rounded-lg hover:shadow-lg transition-shadow text-left group`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-6 w-6 text-gray-700" />
                          <div>
                            <h3 className="font-semibold text-gray-900">{notebook.name}</h3>
                            <p className="text-sm text-gray-700">Select to practice</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Notes */}
        {currentStep === 'select-notes' && selectedNotebook && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light italic mb-2">Select Notes</h2>
              <p className="text-gray-600">Choose which notes to include in your typing practice</p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={selectAllNotes}
                  className="text-sm px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Clear Selection
                </button>
                <span className="text-sm text-gray-600">{selectedNotes.length} selected</span>
              </div>
            </div>

            {notesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} height={150} className="rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => toggleNoteSelection(note.id)}
                      className={`bg-white p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedNotes.includes(note.id)
                          ? 'border-blue-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedNotes.includes(note.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedNotes.includes(note.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                        {note.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {toPlainText(note.content)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setCurrentStep('configure')}
                    disabled={selectedNotes.length === 0}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue ({selectedNotes.length} notes selected)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Configure */}
        {currentStep === 'configure' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light italic mb-2">Configure Practice</h2>
              <p className="text-gray-600">Choose your practice settings</p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Practice Length
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[50, 100, 200].map((count) => (
                    <button
                      key={count}
                      onClick={() => setWordCount(count)}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
                        wordCount === count
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {count} words
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Estimated cost:</strong> ~{(wordCount * 0.00007).toFixed(4)} USD
                  <span className="text-xs ml-2">
                    ({selectedNotes.length} notes × ~300 tokens each)
                  </span>
                </p>
              </div>

              <button
                onClick={generatePracticeText}
                disabled={isGenerating}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Generating practice text...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Practice Text
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Typing Test */}
        {currentStep === 'typing' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light italic mb-2">Type the Text</h2>
              <p className="text-gray-600">Type the generated text as accurately as possible</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg p-4 text-center">
                <Timer className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-semibold">0</p>
                <p className="text-sm text-gray-600">WPM</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold">{accuracy}%</p>
                <p className="text-sm text-gray-600">Accuracy</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold">{errors}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>

            {/* Typing Area */}
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-lg leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {generatedText.split('').map((char, index) => {
                    let className = 'text-gray-600'
                    if (index < userInput.length) {
                      className =
                        userInput[index] === char ? 'text-green-600' : 'text-red-600 bg-red-100'
                    } else if (index === userInput.length) {
                      className = 'bg-blue-100'
                    }
                    return (
                      <span key={index} className={className}>
                        {char}
                      </span>
                    )
                  })}
                </p>
              </div>

              <textarea
                value={userInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Start typing..."
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg resize-none focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-600"
                style={{ fontFamily: 'Arial, sans-serif' }}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {currentStep === 'results' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light italic mb-2">Great Job!</h2>
              <p className="text-gray-600">Here are your results</p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center">
                  <p className="text-4xl font-semibold text-blue-600">{calculateWPM()}</p>
                  <p className="text-sm text-gray-600 mt-1">Words Per Minute</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-semibold text-green-600">{accuracy}%</p>
                  <p className="text-sm text-gray-600 mt-1">Accuracy</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={reset}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Try Again (Same Text)
                </button>
                <button
                  onClick={startNewSession}
                  className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Generate New Text
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
