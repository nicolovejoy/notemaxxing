"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, Search, Grid3X3, User, FolderOpen, BookOpen } from "lucide-react";

interface Notebook {
  id: string;
  name: string;
  folderId: string;
  color: string;
  createdAt: Date;
}

export default function Home() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notemaxxing-notebooks");
      setNotebooks(saved ? JSON.parse(saved) : []);
    }
  }, []);

  const folders = [
    { id: "q1", name: "Q1", color: "bg-red-500" },
    { id: "q2", name: "Q2", color: "bg-blue-500" },
    { id: "q3", name: "Q3", color: "bg-purple-500" },
    { id: "q4", name: "Q4", color: "bg-green-500" },
  ];

  const getNotebookCount = (folderId: string) => {
    return notebooks.filter(n => n.folderId === folderId).length;
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Menu className="h-5 w-5 text-gray-800" />
              </button>
              <h1 className="ml-4 text-xl font-semibold italic">Notemaxxing</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Search className="h-5 w-5 text-gray-800" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Grid3X3 className="h-5 w-5 text-gray-800" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100">
                <User className="h-5 w-5 text-gray-800" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-4xl font-light italic mb-4">Notemaxxing</h1>
        <div className="w-24 h-0.5 bg-gray-300 mb-8"></div>
        <p className="text-xl text-gray-900 mb-16 italic">Enhance your note-taking skills</p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Folders Card */}
          <Link href="/folders" className="block">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64 hover:shadow-lg transition-shadow flex flex-col cursor-pointer">
              <h2 className="text-lg font-medium mb-4 italic">Folders</h2>
              <div className="flex-1 space-y-3">
                {folders.map((folder) => {
                  const folderNotebooks = notebooks.filter(n => n.folderId === folder.id);
                  if (folderNotebooks.length === 0) return null;
                  
                  return (
                    <div key={folder.id} className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 ${folder.color} rounded`}></div>
                        <span className="text-xs font-semibold text-gray-700">{folder.name}</span>
                      </div>
                      {folderNotebooks.slice(0, 2).map((notebook) => (
                        <div
                          key={notebook.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `/notebooks/${notebook.id}`;
                          }}
                          className={`${notebook.color} rounded-md p-2 cursor-pointer hover:shadow-sm transition-shadow`}
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-3 w-3 text-gray-700" />
                            <span className="text-sm font-medium text-gray-800">{notebook.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {notebooks.length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No notebooks yet</p>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Typemaxxing Card */}
          <Link href="/typemaxxing" className="block">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64 hover:shadow-lg transition-shadow flex flex-col">
              <h2 className="text-lg font-medium mb-4 italic">Typemaxxing</h2>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-xs">
                  <div className="border-2 border-gray-300 rounded-lg p-2">
                    <div className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div key={i} className="aspect-square border border-gray-200 rounded-sm"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Quizzing Card */}
          <Link href="/quizzing" className="block md:col-span-2 md:max-w-md">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-medium mb-4 italic">Quizzing</h2>
              <div className="flex items-center justify-center h-32 relative">
                <div className="bg-gray-100 rounded-lg p-4 w-48 h-24 flex items-center justify-center">
                  <div className="bg-gray-200 w-full h-full rounded"></div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                  <span className="text-sm italic">Test Prepara...</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="bg-gray-50 rounded-lg px-3 py-2 inline-flex items-center">
                  <span className="text-sm italic">Neuroscience...</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}