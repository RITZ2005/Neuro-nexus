import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { common, createLowlight } from 'lowlight'
import { MermaidExtension } from './extensions/MermaidExtension'
import { MathExtension, MathBlockExtension } from './extensions/MathExtension'
import { EditorToolbar } from './EditorToolbar'
import { useEffect } from 'react'
import './editor.css'

const lowlight = createLowlight(common)

interface CollaborativeEditorProps {
  documentId: string
  initialContent: string
  onUpdate?: (content: string) => void
  userName?: string
  userColor?: string
}

export const CollaborativeEditor = ({ 
  documentId, 
  initialContent, 
  onUpdate,
  userName = "Anonymous",
  userColor = "#3b82f6" 
}: CollaborativeEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block to use lowlight
      }),
      Placeholder.configure({
        placeholder: 'Start typing your document...',
      }),
      CharacterCount,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2 bg-gray-100 font-bold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'list-none pl-0',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto',
        },
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded',
        },
      }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      HorizontalRule.configure({
        HTMLAttributes: {
          class: 'my-4 border-t-2 border-border',
        },
      }),
      MermaidExtension,
      MathExtension,
      MathBlockExtension,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate?.(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4',
      },
    },
  })
  
  // Update editor content when document changes
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent)
    }
  }, [documentId, initialContent, editor])
  
  if (!editor) {
    return <div className="flex items-center justify-center p-8">Loading editor...</div>
  }
  
  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Formatting Toolbar */}
      <EditorToolbar editor={editor} />
      
      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      
      {/* Character Count */}
      {editor.storage.characterCount && (
        <div className="text-xs text-muted-foreground text-right p-2 border-t bg-muted/30">
          {editor.storage.characterCount.characters()} characters
        </div>
      )}
    </div>
  )
}
