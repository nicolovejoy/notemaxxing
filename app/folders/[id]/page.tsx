'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Share2, FolderOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { ColorPicker } from '@/components/forms/ColorPicker'
import { ShareDialog } from '@/components/ShareDialog'
import { NotebookCard } from '@/components/cards/NotebookCard'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_NOTEBOOK_COLOR, NOTEBOOK_COLORS } from '@/lib/constants'

interface Notebook {
  id: string
  name: string
  color: string
  note_count: number
  created_at: string | null
  archived: boolean | null
}

interface Folder {
  id: string
  name: string
  color: string
  created_at: string | null
  updated_at: string | null
  user_id: string
}

export default function FolderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const folderId = params.id as string
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [folder, setFolder] = useState<Folder | null>(null)
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [newNotebookColor, setNewNotebookColor] = useState<string>(DEFAULT_NOTEBOOK_COLOR)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) {
      return
    }

    if (!user) {
      router.push('/auth/login')
      return
    }

    loadFolderData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, user, authLoading])

  const loadFolderData = async () => {
    if (!supabase) return

    try {
      setLoading(true)

      // Load folder details
      const { data: folderData, error: folderError } = await supabase!
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single()

      if (folderError) throw folderError
      setFolder(folderData)

      // Load notebooks in this folder
      const { data: notebooksData, error: notebooksError } = await supabase!
        .from('notebooks')
        .select('*')
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false })

      if (notebooksError) throw notebooksError

      // Get note counts for each notebook
      const notebooksWithCounts = await Promise.all(
        (notebooksData || []).map(async (notebook) => {
          const { count } = await supabase!
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('notebook_id', notebook.id)

          return { ...notebook, note_count: count || 0 }
        })
      )

      setNotebooks(notebooksWithCounts)
    } catch (error) {
      console.error('Error loading folder data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) return

    setCreating(true)
    try {
      const { data, error } = await supabase!
        .from('notebooks')
        .insert({
          name: newNotebookName.trim(),
          color: newNotebookColor,
          folder_id: folderId,
          user_id: user?.id,
        })
        .select()
        .single()

      if (error) throw error

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

  const handleNotebookClick = (notebookId: string) => {
    router.push(`/notebooks/${notebookId}`)
  }

  const filteredNotebooks = search
    ? notebooks.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()))
    : notebooks

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader backUrl="/backpack" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        backUrl="/backpack"
        rightContent={
          <div className="flex items-center gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search notebooks..."
              className="w-64"
            />
            <LoadingButton
              onClick={() => setShowShareDialog(true)}
              icon={Share2}
              variant="secondary"
              title="Share this folder"
            >
              Share
            </LoadingButton>
            <LoadingButton onClick={() => setShowCreateModal(true)} icon={Plus} variant="primary">
              New Notebook
            </LoadingButton>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Folder Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="h-8 w-8 text-gray-600" />
            <h1 className="text-3xl font-bold">{folder?.name || 'Folder'}</h1>
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
                noteCount={notebook.note_count}
                archived={notebook.archived || false}
                onClick={() => handleNotebookClick(notebook.id)}
                onUpdate={loadFolderData}
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

      {/* Share Dialog */}
      {showShareDialog && folder && (
        <ShareDialog
          resourceId={folderId}
          resourceType="folder"
          resourceName={folder.name}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  )
}
