"use client";

import { useState, useEffect } from "react";
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
import {
  getFolders,
  getNotebooks,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  type Folder,
  type Notebook,
  type Note
} from "@/lib/storage";

type SortOption = "recent" | "alphabetical" | "created";

export default function NotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as string;

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [folderNotebooks, setFolderNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load notebook and folder data
    const notebooks = getNotebooks();
    const currentNotebook = notebooks.find((n) => n.id === notebookId);
    
    if (!currentNotebook) {
      router.push("/folders");
      return;
    }

    setNotebook(currentNotebook);
    
    // Load folder
    const folders = getFolders();
    const currentFolder = folders.find((f) => f.id === currentNotebook.folderId);
    setFolder(currentFolder || null);
    
    // Load all notebooks in this folder
    const sameFolderNotebooks = notebooks.filter(
      (n) => n.folderId === currentNotebook.folderId && !n.archived
    );
    setFolderNotebooks(sameFolderNotebooks);
    
    // Load notes
    loadNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId, router]);

  const loadNotes = () => {
    const allNotes = getNotes();
    const notebookNotes = allNotes.filter((n) => n.notebookId === notebookId);
    
    // Sort notes
    const sortedNotes = [...notebookNotes].sort((a, b) => {
      switch (sortOption) {
        case "recent":
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
    
    setNotes(sortedNotes);
  };

  useEffect(() => {
    loadNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOption]);

  const handleCreateNote = () => {
    // Create a temporary note (not saved yet)
    const tempNote: Note = {
      id: `temp-${Date.now()}`,
      title: "",
      content: "",
      notebookId: notebookId,
      createdAt: new Date(),
    };
    setSelectedNote(tempNote);
    setEditingNoteTitle("");
    setEditingNoteContent("");
    setIsEditingNote(true);
  };

  // Auto-save with debouncing
  useEffect(() => {
    if (!selectedNote || !isEditingNote) return;
    
    // Don't save if both title and content are empty
    if (!editingNoteTitle.trim() && !editingNoteContent.trim()) {
      return;
    }
    
    setIsSaving(true);
    const timeoutId = setTimeout(() => {
      // If it's a new note (temp id), create it properly
      if (selectedNote.id.startsWith('temp-')) {
        // If no title, use first 3 words of content
        let title = editingNoteTitle.trim();
        if (!title && editingNoteContent.trim()) {
          const words = editingNoteContent.trim().split(/\s+/);
          title = words.slice(0, 3).join(' ');
          if (words.length > 3) title += '...';
        }
        
        const newNote = createNote(
          title || "Untitled Note",
          editingNoteContent,
          notebookId
        );
        setSelectedNote(newNote);
      } else {
        // Update existing note
        let title = editingNoteTitle.trim();
        
        // If title is empty but content exists, use first 3 words
        if (!title && editingNoteContent.trim()) {
          const words = editingNoteContent.trim().split(/\s+/);
          title = words.slice(0, 3).join(' ');
          if (words.length > 3) title += '...';
        }
        
        updateNote(selectedNote.id, {
          title: title || "Untitled Note",
          content: editingNoteContent,
          updatedAt: new Date()
        });
      }
      loadNotes();
      setIsSaving(false);
    }, 500); // Auto-save after 500ms of no typing
    
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingNoteTitle, editingNoteContent, selectedNote, isEditingNote]);

  const handleDeleteNote = (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    deleteNote(noteId);
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setIsEditingNote(false);
    }
    loadNotes();
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
              <div className="flex items-center gap-3 ml-4">
                <Logo size={36} />
                <div className="relative group">
                  <h1 className="text-xl font-semibold italic">Notemaxxing</h1>
                  <BuildTimestamp />
                </div>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
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
                <button
                  onClick={handleCreateNote}
                  className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-gray-400 hover:shadow-md transition-all h-48 flex flex-col items-center justify-center group"
                >
                  <Plus className="h-8 w-8 text-gray-400 group-hover:text-gray-600 mb-2" />
                  <span className="text-gray-600 font-medium">Add new note</span>
                </button>

                {/* Note Cards */}
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setEditingNoteTitle(note.title);
                      setEditingNoteContent(note.content);
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
                      {note.content || "No content yet..."}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(note.updatedAt || note.createdAt)}
                    </p>
                  </div>
                ))}
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
                    />
                    <textarea
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      placeholder="Start typing your note..."
                      className="w-full h-[calc(100vh-20rem)] p-4 text-gray-900 placeholder-gray-600 outline-none resize-none border border-gray-200 rounded-lg"
                    />
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold mb-4">{selectedNote.title}</h2>
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{selectedNote.content || "No content yet..."}</p>
                    </div>
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