'use client'

import { useState } from 'react'
import { ChevronRight, BookOpen, FolderOpen, Search, Loader2 } from 'lucide-react'
import { useFoldersView } from '@/lib/query/hooks'
import type { StudySource } from '@/lib/types/study'

interface NotebookPickerProps {
  onSelect: (source: StudySource) => void
}

type Tab = 'notebook' | 'topic'

export function NotebookPicker({ onSelect }: NotebookPickerProps) {
  const [tab, setTab] = useState<Tab>('notebook')
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab('notebook')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'notebook'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          From notebook
        </button>
        <button
          onClick={() => setTab('topic')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'topic'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          From topic
        </button>
      </div>

      {tab === 'notebook' ? (
        <NotebookTab
          search={search}
          onSearchChange={setSearch}
          expandedFolders={expandedFolders}
          onToggleFolder={(id) =>
            setExpandedFolders((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }
          onSelect={onSelect}
        />
      ) : (
        <TopicTab topic={topic} onTopicChange={setTopic} onSelect={onSelect} />
      )}
    </div>
  )
}

function NotebookTab({
  search,
  onSearchChange,
  expandedFolders,
  onToggleFolder,
  onSelect,
}: {
  search: string
  onSearchChange: (v: string) => void
  expandedFolders: Set<string>
  onToggleFolder: (id: string) => void
  onSelect: (source: StudySource) => void
}) {
  const { data: foldersView, isLoading } = useFoldersView()

  const folders = foldersView?.folders || []
  const lower = search.toLowerCase()
  const filtered = search
    ? folders.filter(
        (f) =>
          f.name.toLowerCase().includes(lower) ||
          f.notebooks?.some((n) => n.name.toLowerCase().includes(lower))
      )
    : folders

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search folders and notebooks..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          {search ? 'No matching notebooks' : 'No folders yet'}
        </p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.map((folder) => {
            const isExpanded = expandedFolders.has(folder.id)
            const notebooks = folder.notebooks || []
            const matchingNotebooks = search
              ? notebooks.filter((n) => n.name.toLowerCase().includes(lower))
              : notebooks

            return (
              <div key={folder.id}>
                <button
                  onClick={() => onToggleFolder(folder.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <ChevronRight
                    className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                  <FolderOpen className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{folder.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{notebooks.length}</span>
                </button>

                {isExpanded && matchingNotebooks.length > 0 && (
                  <div className="ml-6 space-y-0.5">
                    {matchingNotebooks.map((notebook) => (
                      <button
                        key={notebook.id}
                        onClick={() =>
                          onSelect({
                            type: 'notebook',
                            notebookId: notebook.id,
                            notebookName: notebook.name,
                          })
                        }
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-left transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600">{notebook.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {isExpanded && matchingNotebooks.length === 0 && (
                  <p className="ml-10 text-xs text-gray-400 py-1">No notebooks</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TopicTab({
  topic,
  onTopicChange,
  onSelect,
}: {
  topic: string
  onTopicChange: (v: string) => void
  onSelect: (source: StudySource) => void
}) {
  const canSubmit = topic.trim().length >= 3

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        Enter a topic and we&apos;ll generate study material for you.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) onSelect({ type: 'topic', topic: topic.trim() })
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="e.g. Photosynthesis, World War II, React hooks..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Go
        </button>
      </form>
    </div>
  )
}
