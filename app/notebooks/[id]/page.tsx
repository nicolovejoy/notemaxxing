"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Trash2, 
  FolderOpen, 
  BookOpen,
  Filter,
  Edit2,
  Clock,
  Calendar,
  SortAsc
} from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dropdown } from "@/components/ui/Dropdown";
import { NoteCard, AddNoteCard } from "@/components/cards/NoteCard";
import { toHTML, toPlainText } from "@/lib/utils/content";
import {
  useFolder,
  useNotebook,
  useNotebooks,
  useNotes,
  useNoteActions,
  useSyncState,
  useNotebookSort,
  useGlobalSearch
} from "@/lib/store/hooks";

type SortOption = "recent" | "alphabetical" | "created";

export default function NotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as string;

  // Use Zustand hooks
  const notebook = useNotebook(notebookId);
  const folder = useFolder(notebook?.folder_id || null);
  const { notebooks: allNotebooks } = useNotebooks();
  const { notes: allNotes, loading: notesLoading } = useNotes(notebookId);
  const { createNote, updateNote, deleteNote } = useNoteActions();
  const { error, setSyncError } = useSyncState();
  const { notebookSort } = useNotebookSort();
  const { globalSearch, setGlobalSearch } = useGlobalSearch();

  const [notes, setNotes] = useState<typeof allNotes>([]);
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [selectedNote, setSelectedNote] = useState<typeof allNotes[0] | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [tempNoteId, setTempNoteId] = useState<string | null>(null);

  // Get notebooks in the same folder
  const folderNotebooks = useMemo(() => {
    if (!notebook?.folder_id) return [];
    const filtered = allNotebooks.filter(
      (n) => n.folder_id === notebook.folder_id && !n.archived
    );
    
    // Sort notebooks
    const sorted = [...filtered].sort((a, b) => {
      switch (notebookSort) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'alphabetical-reverse':
          return b.name.localeCompare(a.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created-reverse':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'recent':
        default:
          // For recent, we'd need to check notes - for now just use created date
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      }
    });
    
    return sorted;
  }, [allNotebooks, notebook, notebookSort]);

  // Redirect if notebook not found
  useEffect(() => {
    if (!notesLoading && !notebook) {
      router.push("/folders");
    }
  }, [notebook, notesLoading, router]);

  // Sort and filter notes
  useEffect(() => {
    const filteredNotes = allNotes.filter(note =>
      note.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
      note.content.toLowerCase().includes(globalSearch.toLowerCase())
    );
    
    const sortedNotes = [...filteredNotes].sort((a, b) => {
      switch (sortOption) {
        case "recent":
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
    
    setNotes(sortedNotes);
  }, [allNotes, sortOption, globalSearch]);

  const handleCreateNote = () => {
    // Create a temporary note (not saved yet)
    const tempId = `temp-${Date.now()}`;
    setTempNoteId(tempId);
    setSelectedNote({
      id: tempId,
      user_id: '', // Will be set by server
      notebook_id: notebookId,
      title: "",
      content: "<p></p>",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setEditingNoteTitle("");
    setEditingNoteContent("<p></p>");
    setIsEditingNote(true);
  };

  // Auto-save with debouncing
  useEffect(() => {
    if (!selectedNote || !isEditingNote) return;
    
    // Check if content has actually changed
    const hasContentChanged = editingNoteTitle !== selectedNote.title || 
                            editingNoteContent !== selectedNote.content;
    
    // Don't save if nothing changed (prevents save on initial load)
    if (!hasContentChanged && !tempNoteId) return;
    
    // Don't save if both title and content are empty
    if (!editingNoteTitle.trim() && !editingNoteContent.trim()) {
      return;
    }
    
    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      try {
        // If it's a new note (temp id), create it properly
        if (tempNoteId && selectedNote.id === tempNoteId) {
          // If no title, use first 3 words of content
          let title = editingNoteTitle.trim();
          if (!title && editingNoteContent.trim()) {
            const plainText = toPlainText(editingNoteContent);
            const words = plainText.trim().split(/\s+/);
            title = words.slice(0, 3).join(' ');
            if (words.length > 3) title += '...';
          }
          
          const newNote = await createNote(
            title || "Untitled Note",
            editingNoteContent,
            notebookId
          );
          if (newNote) {
            setSelectedNote(newNote);
            setTempNoteId(null);
          }
        } else {
          // Update existing note
          let title = editingNoteTitle.trim();
          
          // If title is empty but content exists, use first 3 words
          if (!title && editingNoteContent.trim()) {
            const plainText = toPlainText(editingNoteContent);
            const words = plainText.trim().split(/\s+/);
            title = words.slice(0, 3).join(' ');
            if (words.length > 3) title += '...';
          }
          
          await updateNote(selectedNote.id, {
            title: title || "Untitled Note",
            content: editingNoteContent,
          });
        }
        setIsSaving(false);
      } catch (error) {
        console.error('Failed to save note:', error);
        setSyncError(error instanceof Error ? error.message : 'Failed to save note');
        setIsSaving(false);
      }
    }, 500); // Auto-save after 500ms of no typing
    
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingNoteTitle, editingNoteContent, selectedNote, isEditingNote, tempNoteId]);

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    try {
      await deleteNote(noteId);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setIsEditingNote(false);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to delete note');
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString();
  };

  if (!notebook || !folder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading notebook...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader backUrl="/folders" />

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => setSyncError(null)}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex h-[calc(100vh-4rem)]}">
        {/* Folder Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <Link href="/folders" className="block">
            <div className={`${folder.color} text-white rounded-lg p-3 mb-4 hover:opacity-90 transition-opacity cursor-pointer`}>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                <span className="font-semibold">{folder.name}</span>
              </div>
            </div>
          </Link>
          
          <h3 className="text-sm font-medium text-gray-700 mb-3">Notebooks</h3>
          <div className="space-y-2">
            {folderNotebooks.map((nb) => (
              <button
                key={nb.id}
                onClick={() => router.push(`/notebooks/${nb.id}`)}
                className={`w-full text-left rounded-lg p-3 transition-colors ${
                  nb.id === notebookId
                    ? `${nb.color} shadow-sm`
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className={`h-4 w-4 ${
                    nb.id === notebookId ? "text-gray-700" : "text-gray-500"
                  }`} />
                  <span className={`text-sm font-medium ${
                    nb.id === notebookId ? "text-gray-900" : "text-gray-700"
                  }`}>
                    {nb.name}
                    {nb.id === notebookId && " ✓"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <h2 className="text-2xl font-semibold mb-3">{notebook.name}</h2>
            <div className="flex items-center gap-4">
              <SearchInput
                value={globalSearch}
                onChange={setGlobalSearch}
                placeholder="Search notes..."
                className="flex-1"
              />
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50" disabled>
                <Filter className="h-4 w-4" />
                Filter
              </button>
              <Dropdown
                label="Sort"
                icon={<SortAsc className="h-4 w-4" />}
                value={sortOption}
                onChange={(value) => setSortOption(value as SortOption)}
                options={[
                  { value: 'recent', label: 'Recently edited', icon: <Clock className="h-4 w-4" /> },
                  { value: 'alphabetical', label: 'Alphabetical', icon: <SortAsc className="h-4 w-4" /> },
                  { value: 'created', label: 'Date created', icon: <Calendar className="h-4 w-4" /> },
                ]}
              />
            </div>
          </div>

          {/* Notes Grid or Editor */}
          {!selectedNote ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Add Note Card */}
                {!notesLoading && (
                  <AddNoteCard onClick={handleCreateNote} />
                )}

                {/* Loading Skeletons */}
                {notesLoading ? (
                  [...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-48 flex flex-col">
                      <div className="flex items-start justify-between mb-2">
                        <Skeleton width={20} height={20} />
                        <Skeleton width={16} height={16} />
                      </div>
                      <Skeleton height={20} className="mb-2" />
                      <Skeleton height={16} width="80%" className="mb-1" />
                      <Skeleton height={16} width="60%" className="mb-1" />
                      <Skeleton height={12} width="40%" className="mt-auto" />
                    </div>
                  ))
                ) : (
                  /* Note Cards */
                  notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      title={note.title}
                      content={note.content}
                      updatedAt={note.updated_at || note.created_at}
                      onClick={() => {
                        setSelectedNote(note);
                        setEditingNoteTitle(note.title);
                        setEditingNoteContent(toHTML(note.content));
                        setIsEditingNote(true);
                      }}
                      onDelete={() => handleDeleteNote(note.id)}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Note Editor */
            <div className="flex-1 bg-white">
              <div className="border-b border-gray-200 p-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedNote(null);
                    setIsEditingNote(false);
                  }}
                  className="p-2 rounded-md hover:bg-gray-100"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-800" />
                </button>
                <div className="flex items-center gap-2">
                  {!isEditingNote && (
                    <button
                      onClick={() => setIsEditingNote(true)}
                      className="p-2 rounded-md hover:bg-gray-100"
                    >
                      <Edit2 className="h-5 w-5 text-gray-800" />
                    </button>
                  )}
                  {isEditingNote && (
                    <span className="text-sm text-gray-500 italic">
                      {isSaving ? "Saving..." : "Saved"}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="p-2 rounded-md hover:bg-gray-100 text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-8">
                {isEditingNote ? (
                  <>
                    <input
                      type="text"
                      value={editingNoteTitle}
                      onChange={(e) => setEditingNoteTitle(e.target.value)}
                      className="text-2xl font-semibold mb-4 w-full outline-none border-b border-gray-200 pb-2"
                      placeholder="Note title..."
                    />
                    <RichTextEditor
                      content={editingNoteContent}
                      onChange={setEditingNoteContent}
                      placeholder="Start typing your note..."
                    />
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold mb-4">{selectedNote.title}</h2>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: toHTML(selectedNote.content) || "<p>No content yet...</p>" 
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}