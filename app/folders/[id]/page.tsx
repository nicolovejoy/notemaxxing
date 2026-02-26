'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Share2, FolderOpen, Edit2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { ColorPicker } from '@/components/forms/ColorPicker'
import { ShareDialog } from '@/components/ShareDialog'
import { NotebookCard } from '@/components/cards/NotebookCard'
import { SharedIndicator } from '@/components/SharedIndicator'
import { useAuth } from '@/lib/hooks/useAuth'
import { DEFAULT_NOTEBOOK_COLOR, NOTEBOOK_COLORS } from '@/lib/constants'
import { useFolderDetailView } from '@/lib/query/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { LoadingGrid } from '@/components/common/LoadingGrid'
import { storeNotebookPreview, type NotebookPreview } from '@/lib/utils/notebook-navigation'
import { apiFetch } from '@/lib/firebase/api-fetch'

export default function FolderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const folderId = params.id as string
  const { user, loading: authLoading } = useAuth()

  // Use React Query for data fetching
  const queryClient = useQueryClient()
  const { data: folderView, isLoading, error, refetch } = useFolderDetailView(folderId)

  // Local state for UI
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [newNotebookColor, setNewNotebookColor] = useState<string>(DEFAULT_NOTEBOOK_COLOR)
  const [creating, setCreating] = useState(false)
  const [isEditingFolder, setIsEditingFolder] = useState(false)

  // Extract data from view
  const folder = folderView?.folder
  const notebooks: Array<{
    id: string
    name: string
    color: string
    note_count?: number
    archived?: boolean
    shared_by_owner?: boolean
  }> = folderView?.notebooks || []
  const userPermission = folderView?.userPermission
  const isOwner = userPermission === 'owner'
  const canWrite = userPermission === 'write' || isOwner

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) return

    setCreating(true)
    try {
      // Use API route instead of direct Supabase call
      const response = await apiFetch('/api/notebooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newNotebookName.trim(),
          color: newNotebookColor,
          folder_id: folderId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create notebook')
      }

      const data = await response.json()

      // Invalidate caches so backpack/folder counts update
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })
      queryClient.invalidateQueries({ queryKey: ['folder-detail', folderId] })

      // Navigate to the new notebook
      router.push(`/notebooks/${data.id}`)
    } catch (error) {
      console.error('Error creating notebook:', error)
    } finally {
      setCreating(false)
      setShowCreateModal(false)
      setNewNotebookName('')
      setNewNotebookColor(DEFAULT_NOTEBOOK_COLOR)
    }
  }

  const handleNotebookClick = (notebook: NotebookPreview) => {
    storeNotebookPreview(notebook)
    router.push(`/notebooks/${notebook.id}?from=folder`)
  }

  const filteredNotebooks = search
    ? notebooks.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()))
    : notebooks

  // Show loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader backUrl="/backpack" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <LoadingGrid count={3} />
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader backUrl="/backpack" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <EmptyState
            title="Error loading folder"
            description={error.message || 'Something went wrong'}
          />
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    router.push('/auth/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: 'Backpack', href: '/backpack' },
          { label: folder?.name || 'Folder' },
        ]}
        rightContent={
          <div className="flex items-center gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search notebooks..."
              className="w-64"
            />
            {/* Only show share button for folder owners */}
            {isOwner && (
              <LoadingButton
                onClick={() => setShowShareDialog(true)}
                icon={Share2}
                variant="secondary"
                title="Share this folder"
              >
                Share
              </LoadingButton>
            )}
            {/* Only show create button if user can write */}
            {canWrite && (
              <LoadingButton onClick={() => setShowCreateModal(true)} icon={Plus} variant="primary">
                New Notebook
              </LoadingButton>
            )}
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Folder Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="h-8 w-8 text-gray-600" />
            {isEditingFolder ? (
              <InlineEdit
                value={folder?.name || ''}
                onSave={async (newName) => {
                  if (newName !== folder?.name) {
                    try {
                      const response = await apiFetch('/api/folders', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: folderId,
                          name: newName.trim(),
                        }),
                      })
                      if (response.ok) {
                        // Update folder detail cache immutably
                        queryClient.setQueryData(
                          ['folder-detail', folderId],
                          (old: typeof folderView) =>
                            old ? { ...old, folder: { ...old.folder, name: newName.trim() } } : old
                        )
                        queryClient.invalidateQueries({ queryKey: ['folders-view'] })
                      }
                    } catch (error) {
                      console.error('Error updating folder:', error)
                    }
                  }
                  setIsEditingFolder(false)
                }}
                onCancel={() => setIsEditingFolder(false)}
                inputClassName="text-3xl font-bold"
                className="flex-1"
              />
            ) : (
              <h1 className="text-3xl font-bold">{folder?.name || 'Folder'}</h1>
            )}
            {isOwner && folder && !isEditingFolder && (
              <button
                onClick={() => setIsEditingFolder(true)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit folder name"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            {(folder?.shared || folder?.sharedByOwner) && (
              <SharedIndicator
                shared={folder?.shared}
                sharedByMe={folder?.sharedByOwner}
                permission={!isOwner ? userPermission : undefined}
                onClick={folder?.sharedByOwner ? () => setShowShareDialog(true) : undefined}
              />
            )}
          </div>
          <p className="text-gray-600">
            {notebooks.length} notebook{notebooks.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Notebooks Grid */}
        {filteredNotebooks.length === 0 ? (
          <EmptyState
            title={search ? 'No notebooks found' : 'No notebooks yet'}
            description={
              search ? 'Try a different search' : 'Create your first notebook to get started'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                id={notebook.id}
                name={notebook.name}
                color={notebook.color}
                noteCount={notebook.note_count || 0}
                archived={notebook.archived || false}
                shared={!isOwner}
                sharedByMe={notebook.shared_by_owner}
                permission={!isOwner ? userPermission : undefined}
                onClick={() =>
                  handleNotebookClick({
                    id: notebook.id,
                    name: notebook.name,
                    color: notebook.color,
                    note_count: notebook.note_count || 0,
                  })
                }
                onUpdate={() => refetch()}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Notebook Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Notebook"
      >
        <div className="space-y-4">
          <FormField
            label="Notebook Name"
            value={newNotebookName}
            onChange={(e) => setNewNotebookName(e.target.value)}
            placeholder="Enter notebook name"
            autoFocus
          />
          <ColorPicker
            colors={NOTEBOOK_COLORS}
            selected={newNotebookColor}
            onChange={setNewNotebookColor}
            label="Notebook Color"
          />
          <div className="flex gap-3 justify-end pt-4">
            <LoadingButton variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </LoadingButton>
            <LoadingButton
              variant="primary"
              onClick={handleCreateNotebook}
              loading={creating}
              disabled={!newNotebookName.trim()}
            >
              Create Notebook
            </LoadingButton>
          </div>
        </div>
      </Modal>

      {/* Share Dialog for Folder */}
      {showShareDialog && folder && (
        <ShareDialog
          resourceId={folderId}
          resourceType="folder"
          resourceName={folder.name}
          onClose={() => {
            setShowShareDialog(false)
            refetch() // Refresh data after sharing changes
          }}
        />
      )}
    </div>
  )
}
