'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Sparkles, Undo, Redo } from 'lucide-react';
import { useAI } from '@/lib/hooks/useAI';
import { useState, useRef } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  onBlur
}: RichTextEditorProps) {
  const { enhance, isEnhancing } = useAI();
  const [contentHistory, setContentHistory] = useState<string[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const lastEnhancedContent = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6',
      },
    },
    immediatelyRender: false,
  });

  const handleEnhance = async () => {
    if (!editor || isEnhancing) return;
    
    try {
      const currentContent = editor.getHTML();
      const currentText = editor.getText();
      
      // Save current state to editor's history before enhancing
      // This allows native undo to work
      editor.chain().focus().setContent(currentContent).run();
      
      const enhanced = await enhance(currentText);
      
      // Set enhanced content as a new history entry
      editor.chain().focus().setContent(enhanced).run();
      onChange(enhanced);
      
      // Save to our custom history as well for the undo button
      setContentHistory(prev => [...prev, currentContent]);
      lastEnhancedContent.current = enhanced;
      setShowUndo(true);
      
      // Hide undo button after 10 seconds
      setTimeout(() => setShowUndo(false), 10000);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Enhancement failed:', error);
    }
  };

  const handleUndo = () => {
    if (contentHistory.length > 0 && editor) {
      const previousContent = contentHistory[contentHistory.length - 1];
      editor.chain().focus().setContent(previousContent).run();
      onChange(previousContent);
      setContentHistory(prev => prev.slice(0, -1));
      setShowUndo(false);
      lastEnhancedContent.current = null;
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center gap-1 bg-gray-50">
        {/* Undo/Redo buttons */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Cmd+Z)"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-gray-200' : ''
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-gray-200' : ''
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-gray-200' : ''
          }`}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-gray-200' : ''
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
            }
          }}
          value={
            editor.isActive('heading', { level: 1 }) ? 1 :
            editor.isActive('heading', { level: 2 }) ? 2 :
            editor.isActive('heading', { level: 3 }) ? 3 : 0
          }
          className="px-2 py-1 rounded border border-gray-300 text-sm"
        >
          <option value="0">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        
        {/* AI Enhance Button */}
        <div className="ml-auto flex items-center gap-2">
          {showUndo && contentHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              title="Undo AI enhancement"
            >
              <Undo className="h-4 w-4" />
              Undo AI
            </button>
          )}
          <button
            onClick={handleEnhance}
            disabled={isEnhancing || !editor.getText().trim()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isEnhancing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="min-h-[400px]"
      />
    </div>
  );
}