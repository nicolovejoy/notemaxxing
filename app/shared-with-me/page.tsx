'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { NotebookCard } from '@/components/cards/NotebookCard'
import { useFoldersView, useViewActions, useViewLoading } from '@/lib/store/view-store'

export default function SharedWithMePage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const foldersView = useFoldersView()
  const loading = useViewLoading()
  const { loadFoldersView } = useViewActions()

  // Load folders view on mount
  useEffect(() => {
    loadFoldersView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sharedNotebooks = foldersView?.orphanedNotebooks || []

  // Filter by search
  const filteredNotebooks = sharedNotebooks.filter((notebook) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return notebook.name.toLowerCase().includes(searchLower)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[{ label: 'Shared with Me' }]}
        rightContent={
          <div className="flex items-center gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search shared notebooks..."
              className="w-64"
            />
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-500 text-white rounded-lg">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Shared with Me</h1>
            <p className="text-gray-600">Notebooks that have been shared with you</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotebooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {search
                ? 'No shared notebooks match your search'
                : 'No notebooks have been shared with you yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                id={notebook.id}
                name={notebook.name}
                color={notebook.color}
                noteCount={notebook.note_count}
                archived={false}
                shared={true}
                sharedByMe={false}
                permission={notebook.permission}
                isEditing={false}
                editingName=""
                onEditingNameChange={() => {}}
                onClick={() => router.push(`/notebooks/${notebook.id}`)}
                onEdit={() => {}}
                onArchive={() => {}}
                onRestore={() => {}}
                onDelete={() => {}}
                onUpdate={() => {}}
                onCancelEdit={() => {}}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
