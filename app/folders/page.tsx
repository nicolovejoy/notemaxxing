'use client'

import { useEffect, useState } from 'react'
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
import {
  useFoldersView,
  useViewLoading,
  useViewError,
  useViewActions,
} from '@/lib/store/view-store'

export default function FoldersPage() {
  const router = useRouter()
  const foldersView = useFoldersView()
  const loading = useViewLoading()
  const error = useViewError()
  const { loadFoldersView } = useViewActions()

  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState<string>(DEFAULT_FOLDER_COLOR)
  const [creating, setCreating] = useState(false)

  // Load folders view on mount
  useEffect(() => {
    loadFoldersView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount, ignore loadFoldersView

  // Get folders directly - no filtering (should be done server-side)
  const folders = foldersView?.folders || []

  // For now, do client-side filtering but in a stable way
  const filteredFolders = search
    ? folders.filter((folder) => folder.name.toLowerCase().includes(search.toLowerCase()))
    : folders

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setCreating(true)
    try {
      // Call API to create folder
      const response = await fetch('/api/folders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          color: newFolderColor,
        }),
      })

      if (!response.ok) throw new Error('Failed to create folder')

      // Reload view
      await loadFoldersView()

      // Reset and close
      setNewFolderName('')
      setNewFolderColor(DEFAULT_FOLDER_COLOR)
      setShowCreateModal(false)
    } catch (err) {
      console.error('Error creating folder:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleFolderClick = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId)

    // Use the most_recent_notebook_id if available
    if (folder?.most_recent_notebook_id) {
      router.push(`/notebooks/${folder.most_recent_notebook_id}`)
    } else if (folder?.notebooks && folder.notebooks.length > 0) {
      // Fallback to first notebook if no most_recent_notebook_id
      router.push(`/notebooks/${folder.notebooks[0].id}`)
    }
    // If no notebooks, just stay on folders page
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <StatusMessage type="error" message={error} />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-semibold">{foldersView.stats.total_folders}</p>
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
                    <p className="text-2xl font-semibold">{foldersView.stats.total_notebooks}</p>
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
                    <p className="text-2xl font-semibold">{foldersView.stats.total_notes}</p>
                    <p className="text-sm text-gray-600">Notes</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <Archive className="h-8 w-8 text-gray-500" />
                  <div>
                    <p className="text-2xl font-semibold">{foldersView.stats.total_archived}</p>
                    <p className="text-sm text-gray-600">Archived</p>
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
                      {folder.shared && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Shared
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
                    <p className="text-sm text-gray-600 mt-1">Shared by {notebook.shared_by}</p>
                    <p className="text-sm text-gray-600">{notebook.note_count} notes</p>
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
            loading={creating}
            disabled={!newFolderName.trim()}
          >
            Create Folder
          </LoadingButton>
        </div>
      </Modal>
    </div>
  )
}
