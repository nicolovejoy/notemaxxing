"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Trash2, 
  FolderOpen, 
  BookOpen,
  Search,
  Filter,
  ChevronDown,
  Edit2,
  Clock,
  Calendar,
  SortAsc
} from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { BuildTimestamp } from "@/components/build-timestamp";
import { Logo } from "@/components/logo";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Skeleton } from "@/components/ui/Skeleton";
import { toHTML, toPlainText } from "@/lib/utils/content";
import {
  useFolder,
  useNotebook,
  useNotebooks,
  useNotes,
  useNoteActions,
  useSyncState
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

  const [notes, setNotes] = useState<typeof allNotes>([]);
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedNote, setSelectedNote] = useState<typeof allNotes[0] | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [tempNoteId, setTempNoteId] = useState<string | null>(null);

  // Get notebooks in the same folder
  const folderNotebooks = useMemo(() => {
    if (!notebook?.folder_id) return [];
    return allNotebooks.filter(
      (n) => n.folder_id === notebook.folder_id && !n.archived
    );
  }, [allNotebooks, notebook]);

  // Redirect if notebook not found
  useEffect(() => {
    if (!notesLoading && !notebook) {
      router.push("/folders");
    }
  }, [notebook, notesLoading, router]);

  // Sort notes
  useEffect(() => {
    const sortedNotes = [...allNotes].sort((a, b) => {
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
  }, [allNotes, sortOption]);

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
            const words = editingNoteContent.trim().split(/\s+/);
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
            const words = editingNoteContent.trim().split(/\s+/);
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/folders" className="p-2 rounded-md hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-800" />
              </Link>
              <Link href="/" className="flex items-center gap-3 ml-4 hover:opacity-80 transition-opacity">
                <Logo size={36} />
                <div className="relative group">
                  <h1 className="text-xl font-semibold italic">Notemaxxing</h1>
                  <BuildTimestamp />
                </div>
              </Link>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

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
          <div className={`${folder.color} text-white rounded-lg p-3 mb-4`}>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              <span className="font-semibold">{folder.name}</span>
            </div>
          </div>
          
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
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  disabled
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50" disabled>
                <Filter className="h-4 w-4" />
                Filter
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <SortAsc className="h-4 w-4" />
                  Sort
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showSortDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        setSortOption("recent");
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        sortOption === "recent" ? "bg-gray-50 font-medium" : ""
                      }`}
                    >
                      <Clock className="inline h-4 w-4 mr-2" />
                      Recently edited
                    </button>
                    <button
                      onClick={() => {
                        setSortOption("alphabetical");
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        sortOption === "alphabetical" ? "bg-gray-50 font-medium" : ""
                      }`}
                    >
                      <SortAsc className="inline h-4 w-4 mr-2" />
                      Alphabetical
                    </button>
                    <button
                      onClick={() => {
                        setSortOption("created");
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        sortOption === "created" ? "bg-gray-50 font-medium" : ""
                      }`}
                    >
                      <Calendar className="inline h-4 w-4 mr-2" />
                      Date created
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes Grid or Editor */}
          {!selectedNote ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Add Note Card */}
                {!notesLoading && (
                  <button
                    onClick={handleCreateNote}
                    className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-gray-400 hover:shadow-md transition-all h-48 flex flex-col items-center justify-center group"
                  >
                    <Plus className="h-8 w-8 text-gray-400 group-hover:text-gray-600 mb-2" />
                    <span className="text-gray-600 font-medium">Add new note</span>
                  </button>
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
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setEditingNoteTitle(note.title);
                      setEditingNoteContent(toHTML(note.content));
                      setIsEditingNote(true);
                    }}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer h-48 flex flex-col group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {note.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3 flex-1">
                      {note.content ? 
                        toPlainText(toHTML(note.content)).substring(0, 150) : 
                        "No content yet..."
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(note.updated_at || note.created_at)}
                    </p>
                  </div>
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