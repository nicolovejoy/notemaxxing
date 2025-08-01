"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Grid3X3,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { BuildTimestamp } from "@/components/build-timestamp";
import { Logo } from "@/components/logo";
import { useFolders, useNotebooks, useSeedData } from "@/lib/store/hooks";
import { Card, Button } from "@/components/ui";
import { useNavigateToRecentNotebook } from "@/lib/hooks/useNavigateToRecentNotebook";
import { useState, useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { folders, loading: foldersLoading } = useFolders();
  const { notebooks, loading: notebooksLoading } = useNotebooks();
  const navigateToRecentNotebook = useNavigateToRecentNotebook();
  const { seedInitialData, loading: seedLoading } = useSeedData();
  const [seedMessage, setSeedMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showSeedButton, setShowSeedButton] = useState(false);
  
  const loading = foldersLoading || notebooksLoading;
  
  // Check if user has no data and show seed button
  useEffect(() => {
    if (!loading && folders.length === 0 && notebooks.length === 0) {
      setShowSeedButton(true);
    } else {
      setShowSeedButton(false);
    }
  }, [loading, folders.length, notebooks.length]);
  
  const handleSeedData = async () => {
    setSeedMessage(null);
    const result = await seedInitialData('default-with-tutorials');
    if (result.success) {
      setSeedMessage({ type: 'success', text: 'Sample data added successfully! Check your folders.' });
      setShowSeedButton(false);
    } else {
      setSeedMessage({ type: 'error', text: result.error || 'Failed to add sample data' });
    }
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
              <div className="flex items-center gap-3 ml-4">
                <Logo size={36} />
                <div className="relative group">
                  <h1 className="text-xl font-semibold italic">Notemaxxing</h1>
                  <BuildTimestamp />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Search className="h-5 w-5 text-gray-800" />
              </button>
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Grid3X3 className="h-5 w-5 text-gray-800" />
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 py-16">
        <Logo size={48} />
        <h1 className="text-4xl font-light italic mb-4 mt-4">Home</h1>
        <div className="w-24 h-0.5 bg-gray-300 mb-8"></div>

        {/* Seed Data Section */}
        {showSeedButton && (
          <div className="mb-8 max-w-md text-center">
            <p className="text-gray-600 mb-4">
              Welcome! Get started with tutorials and sample notes to explore all features.
            </p>
            <Button
              onClick={handleSeedData}
              disabled={seedLoading}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
            >
              <Sparkles className="h-5 w-5" />
              {seedLoading ? 'Adding sample data...' : 'Add Starter Content'}
            </Button>
            {seedMessage && (
              <p className={`mt-4 text-sm ${
                seedMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {seedMessage.text}
              </p>
            )}
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Folders Card */}
          <div 
            className="block cursor-pointer"
            onClick={(e) => {
              // Only navigate to folders page if clicking on the card background
              if (e.target === e.currentTarget || e.currentTarget.contains(e.target as Node)) {
                router.push('/folders');
              }
            }}
          >
            <Card className="p-6 h-64 flex flex-col" hover>
              <h2 className="text-lg font-medium mb-4 italic">Folders</h2>
              <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
                {loading ? (
                  <div className="col-span-2 flex items-center justify-center">
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : folders.slice(0, 4).map((folder) => {
                  const notebookCount = notebooks.filter(
                    (n) => n.folder_id === folder.id && !n.archived
                  ).length;

                  return (
                    <div
                      key={folder.id}
                      className={`${folder.color} rounded-lg p-2 flex flex-col items-center justify-center text-white cursor-pointer hover:opacity-90 transition-opacity`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToRecentNotebook(folder.id);
                      }}
                    >
                      <FolderOpen className="h-5 w-5 opacity-80" />
                      <span className="font-semibold text-xs truncate max-w-full px-1">{folder.name}</span>
                      <span className="text-[10px] opacity-80">
                        {notebookCount} {notebookCount === 1 ? 'notebook' : 'notebooks'}
                      </span>
                    </div>
                  );
                })}
                {!loading && folders.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-600">
                    <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No folders yet</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Typemaxxing Card */}
          <Link href="/typemaxxing" className="block">
            <Card className="p-6 h-64 flex flex-col" hover>
              <h2 className="text-lg font-medium mb-4 italic">Typemaxxing</h2>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-xs">
                  <div className="border-2 border-gray-300 rounded-lg p-2">
                    <div className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square border border-gray-200 rounded-sm"
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Quizzing Card */}
          <Link href="/quizzing" className="block md:col-span-2 md:max-w-md">
            <Card className="p-6 h-64" hover>
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
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
