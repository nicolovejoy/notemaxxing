import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { toPlainText, toHTML } from '@/lib/utils/content';

interface NoteCardProps {
  title: string;
  content: string;
  updatedAt: string;
  onClick: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}

export function NoteCard({ 
  title, 
  content, 
  updatedAt, 
  onClick, 
  onDelete, 
  formatDate 
}: NoteCardProps) {
  return (
    <Card 
      onClick={onClick}
      className="p-6 h-48 flex flex-col group"
    >
      <div className="flex items-start justify-between mb-2">
        <FileText className="h-5 w-5 text-gray-400" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 line-clamp-3 flex-1">
        {content ? 
          toPlainText(toHTML(content)).substring(0, 150) : 
          "No content yet..."
        }
      </p>
      <p className="text-xs text-gray-500 mt-2">
        {formatDate(updatedAt)}
      </p>
    </Card>
  );
}

interface AddNoteCardProps {
  onClick: () => void;
}

export function AddNoteCard({ onClick }: AddNoteCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-gray-400 hover:shadow-md transition-all h-48 flex flex-col items-center justify-center group"
    >
      <FileText className="h-8 w-8 text-gray-400 group-hover:text-gray-600 mb-2" />
      <span className="text-gray-600 font-medium">Add new note</span>
    </button>
  );
}