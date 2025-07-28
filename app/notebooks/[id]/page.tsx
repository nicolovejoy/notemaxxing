"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  notebookId: string;
  createdAt: Date;
}

interface Notebook {
  id: string;
  name: string;
  folderId: string;
  color: string;
  createdAt: Date;
}

export default function NotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as string;

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");

  useEffect(() => {
    // Load notebook
    if (typeof window !== "undefined") {
      const savedNotebooks = localStorage.getItem("notemaxxing-notebooks");
      if (savedNotebooks) {
        const notebooks = JSON.parse(savedNotebooks);
        const currentNotebook = notebooks.find((n: Notebook) => n.id === notebookId);
        if (currentNotebook) {
          setNotebook(currentNotebook);
        } else {
          // Notebook not found, redirect to folders
          router.push("/folders");
        }
      }

      // Load notes
      const savedNotes = localStorage.getItem("notemaxxing-notes");
      if (savedNotes) {
        const allNotes = JSON.parse(savedNotes);
        const notebookNotes = allNotes.filter((n: Note) => n.notebookId === notebookId);
        setNotes(notebookNotes);
        if (notebookNotes.length > 0 && !selectedNote) {
          setSelectedNote(notebookNotes[0]);
        }
      }
    }
  }, [notebookId, router]);

  const handleCreateNote = () => {
    if (!noteTitle.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      title: noteTitle,
      content: "",
      notebookId: notebookId,
      createdAt: new Date(),
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    
    // Save to localStorage
    if (typeof window !== "undefined") {
      const savedNotes = localStorage.getItem("notemaxxing-notes");
      const allNotes = savedNotes ? JSON.parse(savedNotes) : [];
      allNotes.push(newNote);
      localStorage.setItem("notemaxxing-notes", JSON.stringify(allNotes));
    }

    setSelectedNote(newNote);
    setIsCreatingNote(false);
    setNoteTitle("");
  };

  const handleUpdateNote = (content: string) => {
    if (!selectedNote) return;

    const updatedNote = { ...selectedNote, content };
    const updatedNotes = notes.map((note) =>
      note.id === selectedNote.id ? updatedNote : note
    );
    setNotes(updatedNotes);
    setSelectedNote(updatedNote);

    // Save to localStorage
    if (typeof window !== "undefined") {
      const savedNotes = localStorage.getItem("notemaxxing-notes");
      const allNotes = savedNotes ? JSON.parse(savedNotes) : [];
      const updatedAllNotes = allNotes.map((note: Note) =>
        note.id === selectedNote.id ? updatedNote : note
      );
      localStorage.setItem("notemaxxing-notes", JSON.stringify(updatedAllNotes));
    }
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    
    // Update localStorage
    if (typeof window !== "undefined") {
      const savedNotes = localStorage.getItem("notemaxxing-notes");
      const allNotes = savedNotes ? JSON.parse(savedNotes) : [];
      const updatedAllNotes = allNotes.filter((n: Note) => n.id !== noteId);
      localStorage.setItem("notemaxxing-notes", JSON.stringify(updatedAllNotes));
    }

    if (selectedNote?.id === noteId) {
      setSelectedNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
    }
  };

  if (!notebook) {
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
          <div className="flex items-center h-16">
            <Link href="/folders" className="p-2 rounded-md hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-800" />
            </Link>
            <div className="ml-4">
              <h1 className="text-xl font-semibold">{notebook.name}</h1>
              <p className="text-sm text-gray-600">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Notes Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Notes</h3>
            <button
              onClick={() => setIsCreatingNote(true)}
              className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {isCreatingNote && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="text"
                placeholder="Note title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-gray-900 placeholder-gray-600"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNote();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNote}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreatingNote(false);
                    setNoteTitle("");
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`group cursor-pointer rounded-lg p-3 hover:bg-gray-50 transition-colors ${
                  selectedNote?.id === note.id ? "bg-gray-50 border border-gray-200" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{note.title}</h4>
                    <p className="text-sm text-gray-700 line-clamp-2 mt-1">
                      {note.content || "No content yet..."}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-500 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {notes.length === 0 && !isCreatingNote && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No notes yet</p>
                <p className="text-sm text-gray-500 mt-1">Create your first note to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Note Editor */}
        {selectedNote ? (
          <div className="flex-1 bg-white p-8">
            <input
              type="text"
              value={selectedNote.title}
              onChange={(e) => {
                const updatedNote = { ...selectedNote, title: e.target.value };
                const updatedNotes = notes.map((note) =>
                  note.id === selectedNote.id ? updatedNote : note
                );
                setNotes(updatedNotes);
                setSelectedNote(updatedNote);

                // Save to localStorage
                if (typeof window !== "undefined") {
                  const savedNotes = localStorage.getItem("notemaxxing-notes");
                  const allNotes = savedNotes ? JSON.parse(savedNotes) : [];
                  const updatedAllNotes = allNotes.map((note: Note) =>
                    note.id === selectedNote.id ? updatedNote : note
                  );
                  localStorage.setItem("notemaxxing-notes", JSON.stringify(updatedAllNotes));
                }
              }}
              className="text-2xl font-semibold mb-4 w-full outline-none text-gray-900"
            />
            <textarea
              value={selectedNote.content}
              onChange={(e) => handleUpdateNote(e.target.value)}
              placeholder="Start typing your note..."
              className="w-full h-[calc(100vh-16rem)] p-4 text-gray-900 placeholder-gray-600 outline-none resize-none"
            />
          </div>
        ) : (
          <div className="flex-1 bg-white flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No note selected
              </h3>
              <p className="text-gray-600">
                Create or select a note to start editing
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}