import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long until data is considered stale (and refetched in background)
      staleTime: 1 * 60 * 1000, // 1 minute

      // How long to keep data in cache (even if unused)
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

      // Only retry once on failure
      retry: 1,

      // Don't refetch when window regains focus (annoying in dev)
      refetchOnWindowFocus: false,

      // Don't refetch on reconnect
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Mutations retry once
      retry: 1,
    },
  },
})

// Helper for manual cache invalidation
export const invalidateQueries = (keys: string[]) => {
  return queryClient.invalidateQueries({ queryKey: keys })
}

// Helper for optimistic updates
export const setQueryData = <T>(keys: string[], data: T) => {
  return queryClient.setQueryData(keys, data)
}
