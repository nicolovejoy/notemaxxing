// Base entity interface
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// User-owned entity
export interface UserEntity extends BaseEntity {
  user_id: string;
}

// Main entities
export interface Folder extends UserEntity {
  name: string;
  color: string;
  // Sharing properties (optional, added at runtime)
  shared?: boolean;
  permission?: 'read' | 'write';
}

export interface Notebook extends UserEntity {
  folder_id: string;
  name: string;
  color: string;
  archived: boolean;
  archived_at: string | null;
  // Sharing properties (optional, added at runtime)
  shared?: boolean;
  permission?: 'read' | 'write';
}

export interface Note extends UserEntity {
  notebook_id: string;
  title: string;
  content: string;
}

export interface Quiz extends UserEntity {
  subject: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id?: string;
  question: string;
  answer: string;
  options?: string[];
  explanation?: string;
}

