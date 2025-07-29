export const FOLDER_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-orange-500",
] as const;

export const NOTEBOOK_COLORS = [
  "bg-indigo-200",
  "bg-pink-200",
  "bg-yellow-200",
  "bg-emerald-200",
  "bg-cyan-200",
] as const;

export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[4]; // bg-indigo-500
export const DEFAULT_NOTEBOOK_COLOR = NOTEBOOK_COLORS[0]; // bg-indigo-200

export type FolderColor = typeof FOLDER_COLORS[number];
export type NotebookColor = typeof NOTEBOOK_COLORS[number];