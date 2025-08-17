'use client'

import { useState, useEffect } from 'react'
import { Plus, FolderOpen, BookOpen, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { ColorPicker } from '@/components/forms/ColorPicker'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { Card, CardBody } from '@/components/ui/Card'
import { SharedIndicator } from '@/components/SharedIndicator'
import { ShareDialog } from '@/components/ShareDialog'
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from '@/lib/constants'
import { useFoldersView, useCreateFolder } from '@/lib/query/hooks'
import { useAuth } from '@/lib/hooks/useAuth'

export default function BackpackPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // React Query - Data is cached from home page! No duplicate fetches!
  const { data: foldersView, isLoading: loading, error } = useFoldersView()
  const createFolderMutation = useCreateFolder()

  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState<string>(DEFAULT_FOLDER_COLOR)
  const [shareFolder, setShareFolder] = useState<{ id: string; name: string } | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  // Get folders directly - no filtering (should be done server-side)
  const folders = foldersView?.folders || []

  // For now, do client-side filtering but in a stable way
  const filteredFolders = search
    ? folders.filter((folder) => folder.name.toLowerCase().includes(search.toLowerCase()))
    : folders

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    // Use React Query mutation - it will automatically invalidate cache and navigate!
    createFolderMutation.mutate(
      {
        name: newFolderName.trim(),
        color: newFolderColor,
      },
      {
        onSuccess: () => {
          // Reset and close on success
          setNewFolderName('')
          setNewFolderColor(DEFAULT_FOLDER_COLOR)
          setShowCreateModal(false)
        },
      }
    )
  }

  const handleFolderClick = (folderId: string) => {
    // Navigate to folder detail page (shows notebooks in that folder)
    router.push(`/folders/${folderId}`)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <StatusMessage
          type="error"
          message={error instanceof Error ? error.message : 'Failed to load folders'}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[{ label: 'Backpack' }]}
        rightContent={
          <div className="flex items-center gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search folders..."
              className="w-64"
            />
            <LoadingButton onClick={() => setShowCreateModal(true)} icon={Plus} variant="primary">
              New Folder
            </LoadingButton>
          </div>
        }
      />

      {/* Stats Bar - Horizontal strip below header */}
      {foldersView && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-12">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-blue-500" />
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">
                    {foldersView.stats?.total_folders || 0}
                  </span>
                  <span className="text-sm text-gray-600">Folders</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-green-500" />
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">
                    {foldersView.stats?.total_notebooks || 0}
                  </span>
                  <span className="text-sm text-gray-600">Notebooks</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-purple-500">📝</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">
                    {foldersView.stats?.total_notes || 0}
                  </span>
                  <span className="text-sm text-gray-600">Notes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Folders Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filteredFolders.length === 0 ? (
          <EmptyState
            title={search ? 'No folders found' : 'No folders yet'}
            description={
              search ? 'Try a different search' : 'Create your first folder to get started'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFolders.map((folder) => (
              <Card key={folder.id} className="overflow-hidden">
                <CardBody className="p-0">
                  {/* Folder Header with gradient */}
                  <div
                    className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white cursor-pointer hover:from-blue-100 transition-all"
                    onClick={() => handleFolderClick(folder.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded ${folder.color}`}>
                        <FolderOpen className="h-4 w-4 text-white" />
                      </div>
                      {folder.sharedByMe && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShareFolder(folder)
                          }}
                          className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 transition-colors"
                        >
                          <Share2 className="h-3 w-3" />
                          Manage Sharing
                        </button>
                      )}
                      {folder.sharedWithMe && (
                        <SharedIndicator
                          shared={true}
                          permission={folder.permission === 'owner' ? undefined : folder.permission}
                        />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {folder.notebook_count} notebooks · {folder.note_count} notes
                      {folder.archived_count > 0 && ` · ${folder.archived_count} archived`}
                    </p>
                  </div>

                  {/* Notebook List (not cards) */}
                  {folder.notebooks && folder.notebooks.length > 0 ? (
                    <div className="p-3">
                      <div className="space-y-2">
                        {folder.notebooks.slice(0, 3).map((notebook) => (
                          <button
                            key={notebook.id}
                            onClick={() => {
                              // Store notebook data for optimistic loading
                              if (typeof window !== 'undefined') {
                                sessionStorage.setItem(
                                  `notebook-preview-${notebook.id}`,
                                  JSON.stringify({
                                    id: notebook.id,
                                    name: notebook.name,
                                    color: notebook.color,
                                    note_count: notebook.note_count,
                                  })
                                )
                              }
                              router.push(`/notebooks/${notebook.id}?from=backpack`)
                            }}
                            className="w-full px-3 py-2 rounded hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-700">{notebook.name}</span>
                              </div>
                              <span className="text-xs text-gray-400">
                                {notebook.note_count} notes
                              </span>
                            </div>
                          </button>
                        ))}
                        {folder.notebooks.length > 3 && (
                          <button
                            onClick={() => handleFolderClick(folder.id)}
                            className="w-full px-3 py-2 rounded hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="text-xs text-gray-600 font-medium">
                              +{folder.notebooks.length - 3} more notebooks
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Folder Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Folder"
      >
        <div className="space-y-4">
          <FormField
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Folder Color</label>
            <ColorPicker
              colors={FOLDER_COLORS}
              selected={newFolderColor}
              onChange={setNewFolderColor}
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <LoadingButton variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </LoadingButton>
          <LoadingButton
            variant="primary"
            onClick={handleCreateFolder}
            loading={createFolderMutation.isPending}
            disabled={!newFolderName.trim()}
          >
            Create Folder
          </LoadingButton>
        </div>
      </Modal>

      {/* Share Dialog for Folder */}
      {shareFolder && (
        <ShareDialog
          resourceId={shareFolder.id}
          resourceType="folder"
          resourceName={shareFolder.name}
          onClose={() => setShareFolder(null)}
        />
      )}
    </div>
  )
}
