"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, BookOpen, Trash2, FolderOpen, Edit2, Check, X, Archive, ArchiveRestore, Search, SortAsc, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/user-menu";
import { BuildTimestamp } from "@/components/build-timestamp";
import { Logo } from "@/components/logo";
import { Modal } from "@/components/ui/Modal";
import { ColorPicker } from "@/components/forms/ColorPicker";
import { EntityCard } from "@/components/cards/EntityCard";
import { 
  useFolders, 
  useFolderActions,
  useNotebooks,
  useNotebookActions,
  useNotes,
  useSyncState,
  useNotebookSort,
  useGlobalSearch
} from "@/lib/store";
import { useStore } from "@/lib/store/useStore";
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR, NOTEBOOK_COLORS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/Skeleton";

export default function FoldersPage() {
  const router = useRouter();
  const { folders, loading: foldersLoading } = useFolders();
  const { notebooks, loading: notebooksLoading } = useNotebooks(null, true);
  const { notes } = useNotes();
  const { createFolder, updateFolder, deleteFolder } = useFolderActions();
  const { createNotebook, updateNotebook, archiveNotebook, restoreNotebook, deleteNotebook } = useNotebookActions();
  const { error, setSyncError } = useSyncState();
  const { loadNotebooks } = useStore();
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<string>(DEFAULT_FOLDER_COLOR);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [isCreatingNotebook, setIsCreatingNotebook] = useState<string | null>(null);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [editNotebookName, setEditNotebookName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isCreatingFolderLoading, setIsCreatingFolderLoading] = useState(false);
  const [showNotebookSortDropdown, setShowNotebookSortDropdown] = useState(false);
  
  const { notebookSort, setNotebookSort } = useNotebookSort();
  const { globalSearch, setGlobalSearch } = useGlobalSearch();

  // Ensure notebooks are loaded
  useEffect(() => {
    if (folders.length > 0 && notebooks.length === 0 && !notebooksLoading) {
      loadNotebooks(true);
    }
  }, [folders.length, notebooks.length, notebooksLoading, loadNotebooks]);
  
  // Filter folders based on search - now searches folder names, notebook names, and note content
  const filteredFolders = useMemo(() => {
    if (!globalSearch) return folders;
    
    const searchLower = globalSearch.toLowerCase();
    
    return folders.filter(folder => {
      // Check folder name
      if (folder.name.toLowerCase().includes(searchLower)) return true;
      
      // Check notebooks in this folder
      const folderNotebooks = notebooks.filter(n => n.folder_id === folder.id);
      for (const notebook of folderNotebooks) {
        // Check notebook name
        if (notebook.name.toLowerCase().includes(searchLower)) return true;
        
        // Check notes in this notebook
        const notebookNotes = notes.filter(n => n.notebook_id === notebook.id);
        for (const note of notebookNotes) {
          // Check note title or content
          if (note.title.toLowerCase().includes(searchLower) ||
              note.content.toLowerCase().includes(searchLower)) {
            return true;
          }
        }
      }
      
      return false;
    });
  }, [folders, notebooks, notes, globalSearch]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolderLoading(true);
    try {
      await createFolder(newFolderName, newFolderColor);
      setIsCreatingFolder(false);
      setNewFolderName("");
      setNewFolderColor(DEFAULT_FOLDER_COLOR);
    } catch (error) {
      console.error('Failed to create folder:', error);
      setSyncError(
        error instanceof Error 
          ? error.message 
          : 'Failed to create folder. Please check your connection and try again.'
      );
    } finally {
      setIsCreatingFolderLoading(false);
    }
  };

  const handleUpdateFolder = async (id: string) => {
    if (!editFolderName.trim()) return;

    try {
      await updateFolder(id, { name: editFolderName });
      setEditingFolderId(null);
      setEditFolderName("");
    } catch (error) {
      console.error('Failed to update folder:', error);
      setSyncError(
        error instanceof Error 
          ? error.message 
          : 'Failed to update folder. Please try again.'
      );
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this folder? All notebooks and notes inside will be deleted.")) {
      return;
    }

    try {
      await deleteFolder(id);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const handleCreateNotebook = async (folderId: string) => {
    if (!newNotebookName.trim()) return;

    const randomColor = NOTEBOOK_COLORS[Math.floor(Math.random() * NOTEBOOK_COLORS.length)];

    try {
      await createNotebook(newNotebookName, folderId, randomColor);
      setIsCreatingNotebook(null);
      setNewNotebookName("");
    } catch (error) {
      console.error('Failed to create notebook:', error);
    }
  };

  const handleUpdateNotebook = async (id: string) => {
    if (!editNotebookName.trim()) return;

    try {
      await updateNotebook(id, { name: editNotebookName });
      setEditingNotebookId(null);
      setEditNotebookName("");
    } catch (error) {
      console.error('Failed to update notebook:', error);
    }
  };

  const handleArchiveNotebook = async (notebookId: string) => {
    try {
      await archiveNotebook(notebookId);
    } catch (error) {
      console.error('Failed to archive notebook:', error);
    }
  };

  const handleRestoreNotebook = async (notebookId: string) => {
    try {
      await restoreNotebook(notebookId);
    } catch (error) {
      console.error('Failed to restore notebook:', error);
    }
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    if (!confirm("Are you sure you want to permanently delete this notebook? All notes inside will be deleted. Consider archiving instead.")) {
      return;
    }

    try {
      await deleteNotebook(notebookId);
    } catch (error) {
      console.error('Failed to delete notebook:', error);
    }
  };

  const getNotebooksByFolder = (folderId: string) => {
    let filtered = notebooks.filter(notebook => notebook.folder_id === folderId);
    
    // If there's a search, filter notebooks that match directly OR contain matching notes
    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase();
      filtered = filtered.filter(notebook => {
        // Check notebook name
        if (notebook.name.toLowerCase().includes(searchLower)) return true;
        
        // Check notes in this notebook
        const notebookNotes = notes.filter(n => n.notebook_id === notebook.id);
        return notebookNotes.some(note => 
          note.title.toLowerCase().includes(searchLower) ||
          note.content.toLowerCase().includes(searchLower)
        );
      });
    }
    
    filtered = showArchived ? filtered : filtered.filter(n => !n.archived);
    
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
          // Sort by most recently edited note
          const aNotesLatest = notes
            .filter(n => n.notebook_id === a.id)
            .reduce((latest, note) => {
              const noteTime = new Date(note.updated_at || note.created_at).getTime();
              return noteTime > latest ? noteTime : latest;
            }, 0);
            
          const bNotesLatest = notes
            .filter(n => n.notebook_id === b.id)
            .reduce((latest, note) => {
              const noteTime = new Date(note.updated_at || note.created_at).getTime();
              return noteTime > latest ? noteTime : latest;
            }, 0);
            
          return bNotesLatest - aNotesLatest;
      }
    });
    
    return sorted;
  };

  const getNotesCount = (notebookId: string) => {
    return notes.filter((n) => n.notebook_id === notebookId).length;
  };
  
  const getSearchMatchInfo = (folderId: string) => {
    if (!globalSearch) return null;
    
    const searchLower = globalSearch.toLowerCase();
    const folder = folders.find(f => f.id === folderId);
    const folderNotebooks = notebooks.filter(n => n.folder_id === folderId);
    
    let matchCount = 0;
    const matchTypes = new Set<string>();
    
    // Check folder name
    if (folder?.name.toLowerCase().includes(searchLower)) {
      matchTypes.add('folder');
    }
    
    // Check notebooks and notes
    for (const notebook of folderNotebooks) {
      if (notebook.name.toLowerCase().includes(searchLower)) {
        matchCount++;
        matchTypes.add('notebook');
      }
      
      const notebookNotes = notes.filter(n => n.notebook_id === notebook.id);
      const matchingNotes = notebookNotes.filter(note => 
        note.title.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower)
      );
      
      if (matchingNotes.length > 0) {
        matchCount += matchingNotes.length;
        matchTypes.add('note');
      }
    }
    
    if (matchTypes.size === 0) return null;
    
    const typeText = Array.from(matchTypes).join(', ');
    return `Found in: ${typeText}${matchCount > 0 ? ` (${matchCount} matches)` : ''}`;
  };
  
  const handleFolderClick = (folderId: string) => {
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
  };

  const loading = foldersLoading || notebooksLoading;

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
              <Link href="/" className="flex items-center gap-3 ml-4 hover:opacity-80 transition-opacity">
                <Logo size={36} />
                <div className="relative group">
                  <h1 className="text-xl font-semibold italic">Notemaxxing</h1>
                  <BuildTimestamp />
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  showArchived 
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Archive className="h-4 w-4" />
                {showArchived ? "Hide" : "Show"} Archived
              </button>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                New Folder
              </button>
              <UserMenu />
            </div>
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

      {/* Create Folder Modal */}
      <Modal
        isOpen={isCreatingFolder}
        onClose={() => {
          setIsCreatingFolder(false);
          setNewFolderName("");
          setNewFolderColor(DEFAULT_FOLDER_COLOR);
        }}
        title="Create New Folder"
      >
        <div>
          <input
            type="text"
            placeholder="Folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-gray-900 placeholder-gray-600"
            autoFocus
          />
          <ColorPicker
            colors={FOLDER_COLORS}
            selected={newFolderColor}
            onChange={setNewFolderColor}
            className="mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateFolder}
              disabled={isCreatingFolderLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isCreatingFolderLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
            <button
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName("");
                setNewFolderColor(DEFAULT_FOLDER_COLOR);
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Folders Grid */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Controls Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Your Folders</h2>
            <div className="flex items-center gap-3">
              {/* Universal Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search everything..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64"
                />
              </div>
              {/* Notebook Sort */}
              <div className="relative">
                <button
                  onClick={() => setShowNotebookSortDropdown(!showNotebookSortDropdown)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <SortAsc className="h-4 w-4" />
                  Sort Notebooks
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showNotebookSortDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        setNotebookSort('recent');
                        setShowNotebookSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        notebookSort === 'recent' ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      Recently edited
                    </button>
                    <button
                      onClick={() => {
                        setNotebookSort('alphabetical');
                        setShowNotebookSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        notebookSort === 'alphabetical' ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      Alphabetical (A-Z)
                    </button>
                    <button
                      onClick={() => {
                        setNotebookSort('alphabetical-reverse');
                        setShowNotebookSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        notebookSort === 'alphabetical-reverse' ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      Alphabetical (Z-A)
                    </button>
                    <button
                      onClick={() => {
                        setNotebookSort('created');
                        setShowNotebookSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        notebookSort === 'created' ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      Date created (Newest)
                    </button>
                    <button
                      onClick={() => {
                        setNotebookSort('created-reverse');
                        setShowNotebookSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        notebookSort === 'created-reverse' ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      Date created (Oldest)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  {/* Folder Header Skeleton */}
                  <div className="bg-gray-200 animate-pulse rounded-t-lg p-4 h-32">
                    <Skeleton width="60%" height={24} className="mb-2" />
                    <Skeleton width="40%" height={16} />
                  </div>
                  {/* Notebooks List Skeleton */}
                  <div className="bg-white rounded-b-lg shadow-sm">
                    <div className="p-4 space-y-3">
                      <Skeleton height={48} className="rounded-lg" />
                      <Skeleton height={48} className="rounded-lg" />
                      <Skeleton height={48} className="rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFolders.map((folder) => {
                const folderNotebooks = getNotebooksByFolder(folder.id);
                
                return (
                  <div key={folder.id} className="space-y-4">
                    {/* Folder Header */}
                    {editingFolderId === folder.id ? (
                      <div className={`${folder.color} text-white rounded-t-lg p-4 h-32 relative overflow-hidden group`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editFolderName}
                            onChange={(e) => setEditFolderName(e.target.value)}
                            className="bg-white/20 text-white placeholder-white/70 px-2 py-1 rounded"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateFolder(folder.id)}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingFolderId(null);
                              setEditFolderName("");
                            }}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <EntityCard
                        title={folder.name}
                        subtitle={getSearchMatchInfo(folder.id) || undefined}
                        color={folder.color}
                        icon={FolderOpen}
                        isHeader
                        onTitleClick={() => handleFolderClick(folder.id)}
                        actions={
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditFolderName(folder.name);
                              }}
                              className="p-1 hover:bg-white/20 rounded"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(folder.id)}
                              className="p-1 hover:bg-white/20 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        }
                      />
                    )}

                    {/* Notebooks in Folder */}
                    <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base font-semibold text-gray-800">Notebooks</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsCreatingNotebook(folder.id)}
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
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
                              className={`${notebook.color} ${notebook.archived ? 'opacity-60' : ''} rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow group relative`}
                            >
                              {editingNotebookId === notebook.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editNotebookName}
                                    onChange={(e) => setEditNotebookName(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-gray-900"
                                    autoFocus
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateNotebook(notebook.id);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateNotebook(notebook.id);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <Check className="h-4 w-4 text-gray-700" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingNotebookId(null);
                                      setEditNotebookName("");
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <X className="h-4 w-4 text-gray-700" />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => !notebook.archived && router.push(`/notebooks/${notebook.id}`)}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center">
                                    <BookOpen className="h-4 w-4 text-gray-700 mr-2" />
                                    <span className="font-semibold text-gray-900">
                                      {notebook.name}
                                      {notebook.archived && " (Archived)"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">{noteCount} notes</span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingNotebookId(notebook.id);
                                          setEditNotebookName(notebook.name);
                                        }}
                                        className="p-1 hover:bg-gray-200 rounded"
                                      >
                                        <Edit2 className="h-4 w-4 text-gray-600" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (notebook.archived) {
                                            handleRestoreNotebook(notebook.id);
                                          } else {
                                            handleArchiveNotebook(notebook.id);
                                          }
                                        }}
                                        className="p-1 hover:bg-gray-200 rounded"
                                        title={notebook.archived ? "Restore notebook" : "Archive notebook"}
                                      >
                                        {notebook.archived ? (
                                          <ArchiveRestore className="h-4 w-4 text-gray-600" />
                                        ) : (
                                          <Archive className="h-4 w-4 text-gray-600" />
                                        )}
                                      </button>
                                      {notebook.archived && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteNotebook(notebook.id);
                                          }}
                                          className="p-1 hover:bg-gray-200 rounded"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
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
          )}
        </div>
      </main>
    </div>
  );
}