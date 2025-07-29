export * from './useCRUD';

// Re-export store hooks for easier migration
export { 
  useFolders,
  useFolder,
  useFolderActions,
  useNotebooks,
  useNotebook,
  useNotebookActions,
  useNotes,
  useNote,
  useNoteActions,
  useQuizzes,
  useQuiz,
  useQuizActions,
  useInitializeStore,
  useSyncState,
} from '@/lib/store/hooks';