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
}

export interface Notebook extends UserEntity {
  folder_id: string;
  name: string;
  color: string;
  archived: boolean;
  archived_at: string | null;
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

// Legacy types for localStorage (to be removed after migration)
export interface LegacyFolder {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface LegacyNotebook {
  id: string;
  name: string;
  folderId: string;
  color: string;
  createdAt: Date;
  archived?: boolean;
  archivedAt?: Date;
}

export interface LegacyNote {
  id: string;
  title: string;
  content: string;
  notebookId: string;
  createdAt: Date;
  updatedAt?: Date;
}