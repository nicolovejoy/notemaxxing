"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, Grid3X3, User, Plus, Folder, FileText, ArrowLeft } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  createdAt: Date;
}

interface FolderType {
  id: string;
  name: string;
  noteCount: number;
}

export default function FoldersPage() {
  const [folders] = useState<FolderType[]>([
    { id: "q1", name: "Q1", noteCount: 0 },
    { id: "q2", name: "Q2", noteCount: 0 },
    { id: "q3", name: "Q3", noteCount: 0 },
    { id: "q4", name: "Q4", noteCount: 0 },
  ]);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notemaxxing-notes");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    localStorage.setItem("notemaxxing-notes", JSON.stringify(notes));
  }, [notes]);

  const handleCreateNote = () => {
    if (!selectedFolder || !noteTitle.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      title: noteTitle,
      content: noteContent,
      folderId: selectedFolder,
      createdAt: new Date(),
    };

    setNotes([...notes, newNote]);
    setSelectedNote(newNote);
    setIsCreatingNote(false);
    setNoteTitle("");
    setNoteContent("");
  };

  const handleUpdateNote = (content: string) => {
    if (!selectedNote) return;

    const updatedNotes = notes.map((note) =>
      note.id === selectedNote.id ? { ...note, content } : note
    );
    setNotes(updatedNotes);
    setSelectedNote({ ...selectedNote, content });
  };

  const folderNotes = notes.filter((note) => note.folderId === selectedFolder);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="p-2 rounded-md hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <h1 className="ml-4 text-xl font-semibold italic">Notemaxxing</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Search className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Grid3X3 className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100">
                <User className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Folders */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <h2 className="text-lg font-medium mb-4 italic">Folders</h2>
          <div className="space-y-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors ${
                  selectedFolder === folder.id ? "bg-gray-100" : ""
                }`}
              >
                <div className="flex items-center">
                  <Folder className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="font-medium">{folder.name}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {folderNotes.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes List */}
        {selectedFolder && (
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                {folders.find((f) => f.id === selectedFolder)?.name} Notes
              </h3>
              <button
                onClick={() => setIsCreatingNote(true)}
                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {isCreatingNote && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                <input
                  type="text"
                  placeholder="Note title..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateNote}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingNote(false);
                      setNoteTitle("");
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {folderNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`w-full text-left p-3 rounded-lg hover:bg-white transition-colors ${
                    selectedNote?.id === note.id ? "bg-white shadow-sm" : ""
                  }`}
                >
                  <div className="flex items-start">
                    <FileText className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{note.title}</h4>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {note.content || "No content yet..."}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {folderNotes.length === 0 && !isCreatingNote && (
                <p className="text-center text-gray-500 py-8">
                  No notes yet. Create your first note!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Note Editor */}
        {selectedNote && (
          <div className="flex-1 bg-white p-8">
            <input
              type="text"
              value={selectedNote.title}
              onChange={(e) => {
                const updatedNotes = notes.map((note) =>
                  note.id === selectedNote.id
                    ? { ...note, title: e.target.value }
                    : note
                );
                setNotes(updatedNotes);
                setSelectedNote({ ...selectedNote, title: e.target.value });
              }}
              className="text-2xl font-semibold mb-4 w-full outline-none"
            />
            <textarea
              value={selectedNote.content}
              onChange={(e) => handleUpdateNote(e.target.value)}
              placeholder="Start typing your note..."
              className="w-full h-[calc(100vh-16rem)] p-4 text-gray-700 outline-none resize-none"
            />
          </div>
        )}

        {/* Empty State */}
        {!selectedFolder && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a folder to get started
              </h3>
              <p className="text-gray-500">
                Choose a quarter folder to view and create notes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}