import type { QueryClient } from '@tanstack/react-query'
import { api, STALE_TIMES } from './hooks'

export function prefetchFolderDetail(queryClient: QueryClient, folderId: string) {
  queryClient.prefetchQuery({
    queryKey: ['folder-detail', folderId],
    queryFn: () => api.getFolderDetailView(folderId),
    staleTime: STALE_TIMES.FOLDER_DETAIL,
  })
}

export function prefetchNotebookView(queryClient: QueryClient, notebookId: string) {
  queryClient.prefetchQuery({
    queryKey: ['notebook-view', notebookId, {}],
    queryFn: () => api.getNotebookView(notebookId, {}),
    staleTime: STALE_TIMES.NOTEBOOK_VIEW,
  })
}
