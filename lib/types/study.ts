export type StudyMode = 'typing' | 'quiz'

export interface StudyGenerateRequest {
  mode: StudyMode
  notebookId?: string
  topic?: string
}

export interface TypingResponse {
  text: string
  wordCount: number
}

export interface StudyQuizQuestion {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

export interface QuizResponse {
  questions: StudyQuizQuestion[]
}

export type StudySource =
  | { type: 'notebook'; notebookId: string; notebookName: string }
  | { type: 'topic'; topic: string }
