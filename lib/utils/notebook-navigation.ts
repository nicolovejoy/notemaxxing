/**
 * Utilities for notebook navigation and session storage
 */

export const NOTEBOOK_PREVIEW_KEY = (id: string) => `notebook-preview-${id}`

export interface NotebookPreview {
  id: string
  name: string
  color: string
  note_count: number
}

/**
 * Store notebook data in session storage for optimistic loading
 */
export function storeNotebookPreview(notebook: NotebookPreview) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(NOTEBOOK_PREVIEW_KEY(notebook.id), JSON.stringify(notebook))
  }
}

/**
 * Retrieve notebook preview from session storage
 */
export function getNotebookPreview(id: string): NotebookPreview | null {
  if (typeof window === 'undefined') return null

  const stored = sessionStorage.getItem(NOTEBOOK_PREVIEW_KEY(id))
  if (!stored) return null

  try {
    return JSON.parse(stored) as NotebookPreview
  } catch {
    return null
  }
}

/**
 * Clear notebook preview from session storage
 */
export function clearNotebookPreview(id: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(NOTEBOOK_PREVIEW_KEY(id))
  }
}
