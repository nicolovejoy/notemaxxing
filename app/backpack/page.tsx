'use client'

import { useState, useEffect } from 'react'
import { Plus, FolderOpen, Archive, BookOpen } from 'lucide-react'
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        {foldersView && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-semibold">
                      {foldersView.stats?.total_folders || 0}
                    </p>
                    <p className="text-sm text-gray-600">Folders</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <Archive className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-semibold">
                      {foldersView.stats?.total_notebooks || 0}
                    </p>
                    <p className="text-sm text-gray-600">Notebooks</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 text-purple-500">📝</div>
                  <div>
                    <p className="text-2xl font-semibold">{foldersView.stats?.total_notes || 0}</p>
                    <p className="text-sm text-gray-600">Notes</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

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
                  {/* Folder Header - Clickable */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleFolderClick(folder.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: folder.color }}>
                        <FolderOpen className="h-6 w-6 text-white" />
                      </div>
                      {folder.permission && folder.permission !== 'owner' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {folder.permission}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{folder.name}</h3>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{folder.notebook_count} notebooks</span>
                      <span>{folder.note_count} notes</span>
                      {folder.archived_count > 0 && <span>{folder.archived_count} archived</span>}
                    </div>
                  </div>

                  {/* Notebooks Grid */}
                  {folder.notebooks && folder.notebooks.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      <div className="p-3 grid grid-cols-2 gap-2">
                        {folder.notebooks.slice(0, 4).map((notebook) => (
                          <div
                            key={notebook.id}
                            className="bg-white rounded-lg p-3 hover:shadow-sm cursor-pointer transition-all border border-gray-100 hover:border-gray-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/notebooks/${notebook.id}`)
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: notebook.color + '20' }}
                              >
                                <BookOpen className="h-4 w-4" style={{ color: notebook.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {notebook.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {notebook.note_count}{' '}
                                  {notebook.note_count === 1 ? 'note' : 'notes'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {folder.notebooks.length > 4 && (
                          <div
                            className="bg-gray-100 rounded-lg p-3 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFolderClick(folder.id)
                            }}
                          >
                            <span className="text-xs text-gray-600 font-medium">
                              +{folder.notebooks.length - 4} more
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Orphaned Shared Notebooks */}
        {foldersView?.orphanedNotebooks && foldersView.orphanedNotebooks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Shared Notebooks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {foldersView.orphanedNotebooks.map((notebook) => (
                <Card
                  key={notebook.id}
                  hover
                  onClick={() => router.push(`/notebooks/${notebook.id}`)}
                  className="cursor-pointer"
                >
                  <CardBody>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: notebook.color }}>
                        📓
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {notebook.permission}
                      </span>
                    </div>
                    <h3 className="font-semibold">{notebook.name}</h3>
                    {notebook.shared_by && (
                      <p className="text-sm text-gray-600 mt-1">Shared by {notebook.shared_by}</p>
                    )}
                    <p className="text-sm text-gray-600">{notebook.note_count || 0} notes</p>
                  </CardBody>
                </Card>
              ))}
            </div>
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
    </div>
  )
}
