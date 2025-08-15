import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useNotebooks } from '@/lib/store'

export function useNavigateToRecentNotebook() {
  const router = useRouter()
  const notebooks = useNotebooks()

  const navigateToRecentNotebook = useCallback(
    (folderId: string) => {
      // Safety check - handle empty arrays (not null/undefined)
      if (!Array.isArray(notebooks)) {
        console.warn('Notebooks not loaded yet')
        return
      }

      // Find the most recently updated notebook in this folder
      const folderNotebooks = notebooks.filter((n) => n.folder_id === folderId && !n.archived)
      if (folderNotebooks.length === 0) {
        console.log('No notebooks found in folder:', folderId)
        return
      }

      // Sort by notebook update time (will be improved when we add last_note_updated field)
      const mostRecentNotebook = folderNotebooks.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
      )[0]

      if (mostRecentNotebook) {
        router.push(`/notebooks/${mostRecentNotebook.id}`)
      }
    },
    [notebooks, router]
  )

  return navigateToRecentNotebook
}
