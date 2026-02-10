// Base entity interface
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// Owned entity - has an owner
export interface OwnedEntity extends BaseEntity {
  owner_id: string
  created_by?: string // User who created it (may differ from owner)
}

// Main entities
export interface Folder extends OwnedEntity {
  name: string
  color: string
  // Sharing properties (optional, added at runtime)
  shared?: boolean
  permission?: 'read' | 'write'
}

export interface Notebook extends OwnedEntity {
  folder_id: string
  name: string
  color: string
  archived: boolean
  archived_at: string | null
  // Sharing properties (optional, added at runtime)
  shared?: boolean
  permission?: 'read' | 'write'
}

export interface Note extends OwnedEntity {
  notebook_id: string
  folder_id: string
  title: string
  content: string
}

export interface Quiz extends OwnedEntity {
  subject: string
  questions: QuizQuestion[]
}

export interface QuizQuestion {
  id?: string
  question: string
  answer: string
  options?: string[]
  explanation?: string
}
