import { QuizQuestion } from './entities';

// API request/response types
export interface CreateFolderRequest {
  name: string;
  color: string;
}

export interface UpdateFolderRequest {
  name?: string;
  color?: string;
}

export interface CreateNotebookRequest {
  name: string;
  folder_id: string;
  color: string;
}

export interface UpdateNotebookRequest {
  name?: string;
  color?: string;
  archived?: boolean;
  archived_at?: string | null;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  notebook_id: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
}

export interface CreateQuizRequest {
  subject: string;
  questions: QuizQuestion[];
}

export interface UpdateQuizRequest {
  subject?: string;
  questions?: QuizQuestion[];
}

// Generic CRUD API interface
export interface CRUDApi<T, CreateReq, UpdateReq> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: CreateReq): Promise<T>;
  update(id: string, data: UpdateReq): Promise<T>;
  delete(id: string): Promise<void>;
}