import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { Note } from '@/lib/types';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const NoteCard = React.memo(function NoteCard({ note, onClick, onDelete }: NoteCardProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString();
  };

  return (
    <Card
      onClick={onClick}
      className="p-6 h-48 flex flex-col group"
      hover
    >
      <div className="flex items-start justify-between mb-2">
        <FileText className="h-5 w-5 text-gray-400" />
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {note.title}
      </h3>
      <p className="text-sm text-gray-600 line-clamp-3 flex-1">
        {note.content || "No content yet..."}
      </p>
      <p className="text-xs text-gray-500 mt-2">
        {formatDate(note.updated_at || note.created_at)}
      </p>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Only re-render if note data actually changed
  return prevProps.note.id === nextProps.note.id &&
         prevProps.note.updated_at === nextProps.note.updated_at;
});