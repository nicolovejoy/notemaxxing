import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useNotebooks, useNotes } from '@/lib/store';

export function useNavigateToRecentNotebook() {
  const router = useRouter();
  const notebooks = useNotebooks();
  const notes = useNotes();
  
  console.log('useNavigateToRecentNotebook - notebooks:', notebooks, 'notes:', notes);

  const navigateToRecentNotebook = useCallback((folderId: string) => {
    // Safety check
    if (!notebooks || !notes) {
      console.warn('Notebooks or notes not loaded yet');
      return;
    }
    
    // Find the most recently edited notebook in this folder
    const folderNotebooks = notebooks.filter(n => n.folder_id === folderId && !n.archived);
    if (folderNotebooks.length === 0) return;
    
    let mostRecentNotebook = folderNotebooks[0];
    let mostRecentTime = new Date(0);
    
    for (const notebook of folderNotebooks) {
      const notebookNotes = notes.filter(n => n.notebook_id === notebook.id);
      for (const note of notebookNotes) {
        const noteTime = new Date(note.updated_at || note.created_at);
        if (noteTime > mostRecentTime) {
          mostRecentTime = noteTime;
          mostRecentNotebook = notebook;
        }
      }
    }
    
    if (mostRecentNotebook) {
      router.push(`/notebooks/${mostRecentNotebook.id}`);
    }
  }, [notebooks, notes, router]);

  return navigateToRecentNotebook;
}