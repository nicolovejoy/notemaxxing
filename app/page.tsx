"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Sparkles,
  BookOpen,
  Keyboard,
  Brain,
  Plus,
  ArrowRight,
  FileText,
} from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { BuildTimestamp } from "@/components/build-timestamp";
import { Logo } from "@/components/logo";
import { useFolders, useNotebooks, useNotes, useSyncState, useDataActions } from "@/lib/store";
import { Card, CardBody } from "@/components/ui";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useNavigateToRecentNotebook } from "@/lib/hooks/useNavigateToRecentNotebook";
import { useState, useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const folders = useFolders();
  const notebooks = useNotebooks();
  const notes = useNotes();
  const syncState = useSyncState();
  const { seedInitialData } = useDataActions();
  const navigateToRecentNotebook = useNavigateToRecentNotebook();
  const [seedMessage, setSeedMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showSeedButton, setShowSeedButton] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const loading = syncState.status === 'loading';
  
  // Check if user has no data and show seed button
  useEffect(() => {
    if (!loading && folders.length === 0 && notebooks.length === 0) {
      setShowSeedButton(true);
    } else {
      setShowSeedButton(false);
    }
  }, [loading, folders.length, notebooks.length]);
  
  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedMessage(null);
    const result = await seedInitialData('default-with-tutorials');
    if (result.success) {
      setSeedMessage({ type: 'success', text: 'Sample data added successfully! Check your folders.' });
      setShowSeedButton(false);
    } else {
      setSeedMessage({ type: 'error', text: result.error || 'Failed to add sample data' });
    }
    setIsSeeding(false);
  };

  // Calculate stats
  const totalNotes = notes.length;
  const archivedNotebooks = notebooks.filter(n => n.archived).length;
  const recentNotes = notes
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <div className="relative group">
                <h1 className="text-xl font-semibold italic">Notemaxxing</h1>
                <BuildTimestamp />
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light mb-2">Welcome Back</h1>
          <p className="text-gray-600">Your personal knowledge management system</p>
        </div>

        {/* Stats Overview */}
        {!loading && (folders.length > 0 || notebooks.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-semibold">{folders.length}</p>
                  <p className="text-sm text-gray-600">Folders</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-semibold">{notebooks.filter(n => !n.archived).length}</p>
                  <p className="text-sm text-gray-600">Active Notebooks</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-semibold">{totalNotes}</p>
                  <p className="text-sm text-gray-600">Total Notes</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-semibold">{archivedNotebooks}</p>
                  <p className="text-sm text-gray-600">Archived</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Seed Data Section for New Users */}
        {showSeedButton && (
          <div className="mb-8 text-center">
            <Card className="p-8 max-w-md mx-auto">
              <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Get Started</h2>
              <p className="text-gray-600 mb-6">
                Welcome to Notemaxxing! Add sample content to explore all features with guided tutorials.
              </p>
              <LoadingButton
                onClick={handleSeedData}
                loading={isSeeding}
                loadingText="Adding content..."
                variant="primary"
                icon={Sparkles}
                className="mx-auto"
              >
                Add Starter Content
              </LoadingButton>
              {seedMessage && (
                <div className="mt-4">
                  <StatusMessage type={seedMessage.type} message={seedMessage.text} />
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Folders & Notes */}
          <Card 
            className="relative overflow-hidden cursor-pointer group"
            hover
            onClick={() => router.push('/folders')}
          >
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Folders & Notes</h2>
                <FolderOpen className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-gray-600 mb-4">
                Organize your thoughts in folders and notebooks
              </p>
              {!loading && folders.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-500">Recent folders:</p>
                  <div className="flex gap-2 flex-wrap">
                    {folders.slice(0, 3).map((folder) => (
                      <div
                        key={folder.id}
                        className={`${folder.color} px-3 py-1 rounded text-white text-xs font-medium`}
                      >
                        {folder.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                <span className="text-sm font-medium">
                  {folders.length === 0 ? 'Create your first folder' : 'View all folders'}
                </span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardBody>
          </Card>

          {/* Typemaxxing */}
          <Card 
            className="relative overflow-hidden cursor-pointer group"
            hover
            onClick={() => router.push('/typemaxxing')}
          >
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Typemaxxing</h2>
                <Keyboard className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-gray-600 mb-4">
                Practice typing with your own notes
              </p>
              <div className="bg-gray-100 rounded p-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-1 bg-green-500 rounded" style={{ width: '60%' }}></div>
                  <span className="text-gray-700 font-mono text-xs">85 WPM</span>
                </div>
              </div>
              <div className="flex items-center text-green-600 group-hover:text-green-700">
                <span className="text-sm font-medium">Start practice</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardBody>
          </Card>

          {/* Quizzing */}
          <Card 
            className="relative overflow-hidden cursor-pointer group"
            hover
            onClick={() => router.push('/quizzing')}
          >
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Quizzing</h2>
                <Brain className="h-6 w-6 text-purple-500" />
              </div>
              <p className="text-gray-600 mb-4">
                Test your knowledge with custom quizzes
              </p>
              <div className="bg-purple-50 rounded p-3 mb-4">
                <p className="text-sm text-purple-700">
                  Create quizzes from your notes
                </p>
              </div>
              <div className="flex items-center text-purple-600 group-hover:text-purple-700">
                <span className="text-sm font-medium">Browse quizzes</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Recent Notes */}
        {!loading && recentNotes.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Notes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentNotes.map((note) => {
                const notebook = notebooks.find(n => n.id === note.notebook_id);
                return (
                  <Card
                    key={note.id}
                    className="cursor-pointer group"
                    hover
                    onClick={() => router.push(`/notebooks/${note.notebook_id}?note=${note.id}`)}
                  >
                    <CardBody className="p-4">
                      <h3 className="font-medium mb-1 group-hover:text-blue-600 transition-colors">
                        {note.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{notebook?.name}</span>
                        <span>{new Date(note.updated_at || note.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Start for New Users */}
        {!loading && folders.length === 0 && !showSeedButton && (
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No folders yet</h2>
            <p className="text-gray-600 mb-6">Create your first folder to start organizing your notes</p>
            <LoadingButton
              onClick={() => router.push('/folders')}
              variant="primary"
              icon={Plus}
            >
              Create First Folder
            </LoadingButton>
          </div>
        )}
      </main>
    </div>
  );
}