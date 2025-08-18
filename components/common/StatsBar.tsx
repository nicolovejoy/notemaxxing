import { FolderOpen, BookOpen } from 'lucide-react'

interface StatsBarProps {
  folders: number
  notebooks: number
  notes: number
}

export function StatsBar({ folders, notebooks, notes }: StatsBarProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center gap-12">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-gray-900">{folders}</span>
              <span className="text-sm text-gray-600">Folders</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-green-500" />
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-gray-900">{notebooks}</span>
              <span className="text-sm text-gray-600">Notebooks</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-purple-500">📝</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-gray-900">{notes}</span>
              <span className="text-sm text-gray-600">Notes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
