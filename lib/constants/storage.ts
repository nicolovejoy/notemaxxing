export const STORAGE_KEYS = {
  FOLDERS: 'notemaxxing-folders',
  NOTEBOOKS: 'notemaxxing-notebooks',
  NOTES: 'notemaxxing-notes',
  QUIZZES: 'notemaxxing-quizzes',
} as const;

export const DEFAULT_FOLDERS = [
  { id: "q1", name: "Q1 2025", color: "bg-red-500" },
  { id: "q2", name: "Q2 2025", color: "bg-blue-500" },
  { id: "q3", name: "Q3 2025", color: "bg-purple-500" },
  { id: "q4", name: "Q4 2025", color: "bg-green-500" },
] as const;