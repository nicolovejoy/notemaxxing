// Storage service for managing data in localStorage

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Notebook {
  id: string;
  name: string;
  folderId: string;
  color: string;
  createdAt: Date;
  archived?: boolean;
  archivedAt?: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  notebookId: string;
  createdAt: Date;
  updatedAt?: Date;
}

const FOLDERS_KEY = 'notemaxxing-folders';
const NOTEBOOKS_KEY = 'notemaxxing-notebooks';
const NOTES_KEY = 'notemaxxing-notes';

// Default folders for initial setup
const DEFAULT_FOLDERS: Folder[] = [
  { id: "q1", name: "Q1 2025", color: "bg-red-500", createdAt: new Date() },
  { id: "q2", name: "Q2 2025", color: "bg-blue-500", createdAt: new Date() },
  { id: "q3", name: "Q3 2025", color: "bg-purple-500", createdAt: new Date() },
  { id: "q4", name: "Q4 2025", color: "bg-green-500", createdAt: new Date() },
];

// Folder operations
export const getFolders = (): Folder[] => {
  if (typeof window === 'undefined') return DEFAULT_FOLDERS;
  
  const saved = localStorage.getItem(FOLDERS_KEY);
  if (!saved) {
    // Initialize with default folders on first load
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(DEFAULT_FOLDERS));
    return DEFAULT_FOLDERS;
  }
  
  return JSON.parse(saved);
};

export const saveFolders = (folders: Folder[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  }
};

export const createFolder = (name: string, color: string): Folder => {
  const newFolder: Folder = {
    id: Date.now().toString(),
    name,
    color,
    createdAt: new Date(),
  };
  
  const folders = getFolders();
  folders.push(newFolder);
  saveFolders(folders);
  
  return newFolder;
};

export const updateFolder = (id: string, updates: Partial<Folder>) => {
  const folders = getFolders();
  const index = folders.findIndex(f => f.id === id);
  
  if (index !== -1) {
    folders[index] = { ...folders[index], ...updates };
    saveFolders(folders);
  }
};

export const deleteFolder = (id: string) => {
  const folders = getFolders();
  const filtered = folders.filter(f => f.id !== id);
  saveFolders(filtered);
  
  // Also delete all notebooks in this folder
  const notebooks = getNotebooks();
  const notebookIds = notebooks.filter(n => n.folderId === id).map(n => n.id);
  
  // Delete notebooks
  const filteredNotebooks = notebooks.filter(n => n.folderId !== id);
  saveNotebooks(filteredNotebooks);
  
  // Delete notes in those notebooks
  const notes = getNotes();
  const filteredNotes = notes.filter(n => !notebookIds.includes(n.notebookId));
  saveNotes(filteredNotes);
};

// Notebook operations
export const getNotebooks = (includeArchived = false): Notebook[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(NOTEBOOKS_KEY);
  const notebooks = saved ? JSON.parse(saved) : [];
  
  if (includeArchived) {
    return notebooks;
  }
  
  return notebooks.filter((n: Notebook) => !n.archived);
};

export const saveNotebooks = (notebooks: Notebook[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
  }
};

export const createNotebook = (name: string, folderId: string, color: string): Notebook => {
  const newNotebook: Notebook = {
    id: Date.now().toString(),
    name,
    folderId,
    color,
    createdAt: new Date(),
  };
  
  const notebooks = getNotebooks(true);
  notebooks.push(newNotebook);
  saveNotebooks(notebooks);
  
  return newNotebook;
};

export const updateNotebook = (id: string, updates: Partial<Notebook>) => {
  const notebooks = getNotebooks(true);
  const index = notebooks.findIndex(n => n.id === id);
  
  if (index !== -1) {
    notebooks[index] = { ...notebooks[index], ...updates };
    saveNotebooks(notebooks);
  }
};

export const archiveNotebook = (id: string) => {
  updateNotebook(id, { archived: true, archivedAt: new Date() });
};

export const restoreNotebook = (id: string) => {
  const notebooks = getNotebooks(true);
  const notebook = notebooks.find(n => n.id === id);
  if (notebook) {
    updateNotebook(id, { archived: false, archivedAt: undefined });
  }
};

export const deleteNotebook = (id: string) => {
  const notebooks = getNotebooks(true);
  const filtered = notebooks.filter(n => n.id !== id);
  saveNotebooks(filtered);
  
  // Also delete all notes in this notebook
  const notes = getNotes();
  const filteredNotes = notes.filter(n => n.notebookId !== id);
  saveNotes(filteredNotes);
};

// Note operations
export const getNotes = (): Note[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(NOTES_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const saveNotes = (notes: Note[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }
};

export const createNote = (title: string, content: string, notebookId: string): Note => {
  const newNote: Note = {
    id: Date.now().toString(),
    title,
    content,
    notebookId,
    createdAt: new Date(),
  };
  
  const notes = getNotes();
  notes.push(newNote);
  saveNotes(notes);
  
  return newNote;
};

export const updateNote = (id: string, updates: Partial<Note>) => {
  const notes = getNotes();
  const index = notes.findIndex(n => n.id === id);
  
  if (index !== -1) {
    notes[index] = { ...notes[index], ...updates };
    saveNotes(notes);
  }
};

export const deleteNote = (id: string) => {
  const notes = getNotes();
  const filtered = notes.filter(n => n.id !== id);
  saveNotes(filtered);
};