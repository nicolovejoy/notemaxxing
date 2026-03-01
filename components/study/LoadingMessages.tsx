'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const MESSAGES = {
  typing: [
    'Crafting your passage...',
    'Mixing in the good vocab...',
    'Making it flow naturally...',
    'Almost ready to type...',
    'Polishing the final draft...',
  ],
  quiz: [
    'Cooking up questions...',
    'Finding the tricky parts...',
    'Writing believable wrong answers...',
    'Adding explanations...',
    'Quiz almost ready...',
  ],
}

export function LoadingMessages({ mode }: { mode: 'quiz' | 'typing' }) {
  const [index, setIndex] = useState(0)
  const messages = MESSAGES[mode]

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [messages.length])

  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <Loader2 className="h-8 w-8 animate-spin mb-3" />
      <p className="text-sm transition-opacity duration-300">{messages[index]}</p>
    </div>
  )
}
