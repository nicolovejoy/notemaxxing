"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, BookOpen, Trash2, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notebook {
  id: string;
  name: string;
  folderId: string;
  color: string;
  createdAt: Date;
}

interface FolderType {
  id: string;
  name: string;
  color: string;
}

export default function FoldersPage() {
  const router = useRouter();
  const [folders] = useState<FolderType[]>([
    { id: "q1", name: "Q1 2025", color: "bg-red-500" },
    { id: "q2", name: "Q2 2025", color: "bg-blue-500" },
    { id: "q3", name: "Q3 2025", color: "bg-purple-500" },
    { id: "q4", name: "Q4 2025", color: "bg-green-500" },
  ]);

  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notemaxxing-notebooks");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [isCreatingNotebook, setIsCreatingNotebook] = useState<string | null>(null);
  const [newNotebookName, setNewNotebookName] = useState("");

  useEffect(() => {
    localStorage.setItem("notemaxxing-notebooks", JSON.stringify(notebooks));
  }, [notebooks]);

  const handleCreateNotebook = (folderId: string) => {
    if (!newNotebookName.trim()) return;

    const colors = ["bg-indigo-200", "bg-pink-200", "bg-yellow-200", "bg-emerald-200", "bg-cyan-200"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newNotebook: Notebook = {
      id: Date.now().toString(),
      name: newNotebookName,
      folderId: folderId,
      color: randomColor,
      createdAt: new Date(),
    };

    setNotebooks([...notebooks, newNotebook]);
    setIsCreatingNotebook(null);
    setNewNotebookName("");
  };

  const handleDeleteNotebook = (notebookId: string) => {
    setNotebooks(notebooks.filter(n => n.id !== notebookId));
    
    // Also delete all notes in this notebook
    if (typeof window !== "undefined") {
      const savedNotes = localStorage.getItem("notemaxxing-notes");
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        const filteredNotes = notes.filter((n: any) => n.notebookId !== notebookId);
        localStorage.setItem("notemaxxing-notes", JSON.stringify(filteredNotes));
      }
    }
  };

  const getNotebooksByFolder = (folderId: string) => 
    notebooks.filter(notebook => notebook.folderId === folderId);

  const getNotesCount = (notebookId: string) => {
    if (typeof window !== "undefined") {
      const savedNotes = localStorage.getItem("notemaxxing-notes");
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        return notes.filter((n: any) => n.notebookId === notebookId).length;
      }
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="p-2 rounded-md hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-800" />
              </Link>
              <h1 className="ml-4 text-xl font-semibold italic">Notemaxxing</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Folders Grid */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Your Folders</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => {
              const folderNotebooks = getNotebooksByFolder(folder.id);
              
              return (
                <div key={folder.id} className="space-y-4">
                  {/* Folder Header */}
                  <div className={`${folder.color} text-white rounded-t-lg p-4 h-32 relative overflow-hidden`}>
                    <h3 className="text-2xl font-bold">{folder.name}</h3>
                    <div className="absolute bottom-4 right-4">
                      <FolderOpen className="h-16 w-16 text-white/30" />
                    </div>
                  </div>

                  {/* Notebooks in Folder */}
                  <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-semibold text-gray-800">Notebooks</h4>
                      <button
                        onClick={() => setIsCreatingNotebook(folder.id)}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>

                    {isCreatingNotebook === folder.id && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="text"
                          placeholder="Notebook name..."
                          value={newNotebookName}
                          onChange={(e) => setNewNotebookName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm text-gray-900 placeholder-gray-600"
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateNotebook(folder.id);
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateNotebook(folder.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
                          >
                            Create
                          </button>
                          <button
                            onClick={() => {
                              setIsCreatingNotebook(null);
                              setNewNotebookName("");
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {folderNotebooks.map((notebook) => {
                        const noteCount = getNotesCount(notebook.id);
                        
                        return (
                          <div
                            key={notebook.id}
                            className={`${notebook.color} rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow group`}
                            onClick={() => router.push(`/notebooks/${notebook.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <BookOpen className="h-4 w-4 text-gray-700 mr-2" />
                                <span className="font-semibold text-gray-900">{notebook.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">{noteCount} notes</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotebook(notebook.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {folderNotebooks.length === 0 && isCreatingNotebook !== folder.id && (
                        <p className="text-center text-gray-600 py-4 text-sm font-medium">
                          No notebooks yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}