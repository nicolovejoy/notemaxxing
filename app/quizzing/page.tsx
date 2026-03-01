'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, MessageCircle, BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { NotebookPicker } from '@/components/study/NotebookPicker'
import { LoadingMessages } from '@/components/study/LoadingMessages'
import { useAuth } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/firebase/api-fetch'
import { storeStudyChatContext } from '@/lib/utils/study-chat-context'
import type { StudySource, StudyQuizQuestion, QuizResponse } from '@/lib/types/study'

type Phase = 'select' | 'loading' | 'active' | 'results'

export default function QuizzmaxxingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [phase, setPhase] = useState<Phase>('select')
  const [source, setSource] = useState<StudySource | null>(null)
  const [questions, setQuestions] = useState<StudyQuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const generate = useCallback(async (src: StudySource) => {
    setSource(src)
    setPhase('loading')
    setError('')

    try {
      const res = await apiFetch('/api/study/generate', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'quiz',
          ...(src.type === 'notebook' ? { notebookId: src.notebookId } : { topic: src.topic }),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate quiz')
      }

      const data: QuizResponse = await res.json()
      setQuestions(data.questions)
      setCurrentIndex(0)
      setSelectedAnswer(null)
      setAnswers([])
      setPhase('active')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('select')
    }
  }, [])

  const handleAnswer = (optionIndex: number) => {
    if (selectedAnswer !== null) return // Already answered
    setSelectedAnswer(optionIndex)
    setAnswers((prev) => [...prev, optionIndex])
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setSelectedAnswer(null)
    } else {
      setPhase('results')
    }
  }

  const score = answers.reduce<number>(
    (acc, ans, i) => acc + (ans === questions[i]?.correct_index ? 1 : 0),
    0
  )

  const navigateToChat = (mode: 'learn_more' | 'discuss') => {
    if (!source) return
    storeStudyChatContext({ mode, source, questions, answers })
    router.push('/study/chat')
  }

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader breadcrumbs={[{ label: 'Quizzmaxxing' }]} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {phase === 'select' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Choose your source</h2>
            <p className="text-sm text-gray-500 mb-6">
              Pick a notebook or enter a topic to generate a quiz.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
            )}
            <NotebookPicker onSelect={generate} />
          </div>
        )}

        {phase === 'loading' && <LoadingMessages mode="quiz" />}

        {phase === 'active' &&
          questions[currentIndex] &&
          (() => {
            const q = questions[currentIndex]
            const answered = selectedAnswer !== null
            const isCorrect = selectedAnswer === q.correct_index

            return (
              <div>
                {/* Progress */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-gray-500">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                  <div className="flex gap-1">
                    {questions.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-6 rounded-full ${
                          i < currentIndex
                            ? answers[i] === questions[i].correct_index
                              ? 'bg-green-400'
                              : 'bg-red-400'
                            : i === currentIndex
                              ? 'bg-blue-400'
                              : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Source label */}
                <p className="text-xs text-gray-400 mb-2">
                  {source?.type === 'notebook'
                    ? `From: ${source.notebookName}`
                    : `Topic: ${source?.type === 'topic' ? source.topic : ''}`}
                </p>

                {/* Question */}
                <h3 className="text-lg font-medium text-gray-900 mb-4">{q.question}</h3>

                {/* Options */}
                <div className="space-y-2 mb-4">
                  {q.options.map((option, i) => {
                    let classes =
                      'w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors '
                    if (!answered) {
                      classes += 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    } else if (i === q.correct_index) {
                      classes += 'border-green-300 bg-green-50 text-green-800'
                    } else if (i === selectedAnswer) {
                      classes += 'border-red-300 bg-red-50 text-red-800'
                    } else {
                      classes += 'border-gray-200 text-gray-400'
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={answered}
                        className={classes}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{String.fromCharCode(65 + i)}.</span>
                          <span>{option}</span>
                          {answered && i === q.correct_index && (
                            <Check className="h-4 w-4 text-green-600 ml-auto" />
                          )}
                          {answered && i === selectedAnswer && i !== q.correct_index && (
                            <X className="h-4 w-4 text-red-600 ml-auto" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Explanation + Next */}
                {answered && (
                  <div className="space-y-3">
                    <div
                      className={`p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}
                    >
                      {isCorrect ? 'Correct!' : 'Incorrect.'} {q.explanation}
                    </div>
                    <button
                      onClick={handleNext}
                      className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {currentIndex < questions.length - 1 ? 'Next question' : 'See results'}
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

        {phase === 'results' && (
          <div className="py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete</h2>
              <p className="text-5xl font-bold text-blue-600 mb-2">
                {score}/{questions.length}
              </p>
              <p className="text-sm text-gray-500">
                {score === questions.length
                  ? 'Perfect score!'
                  : score >= questions.length * 0.8
                    ? 'Great job!'
                    : score >= questions.length * 0.6
                      ? 'Good effort!'
                      : 'Keep studying!'}
              </p>
            </div>

            {/* Q&A Summary */}
            <div className="space-y-3 mb-8">
              {questions.map((q, i) => {
                const userAnswer = answers[i]
                const isCorrect = userAnswer === q.correct_index
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? (
                        <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      )}
                      <p className="text-sm font-medium text-gray-900">{q.question}</p>
                    </div>
                    {!isCorrect && userAnswer !== null && (
                      <p className="text-sm text-red-600 ml-6 mb-1">
                        Your answer: {q.options[userAnswer]}
                      </p>
                    )}
                    {!isCorrect && (
                      <p className="text-sm text-green-700 ml-6 mb-1">
                        Correct: {q.options[q.correct_index]}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 ml-6">{q.explanation}</p>
                  </div>
                )
              })}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigateToChat('learn_more')}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Learn More
              </button>
              {score < questions.length && (
                <button
                  onClick={() => navigateToChat('discuss')}
                  className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors inline-flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Discuss
                </button>
              )}
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  setSelectedAnswer(null)
                  setAnswers([])
                  setPhase('active')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => source && generate(source)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                New set
              </button>
              <button
                onClick={() => {
                  setPhase('select')
                  setSource(null)
                  setError('')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                New source
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
