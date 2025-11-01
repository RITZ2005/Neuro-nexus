import { Editor } from '@tiptap/react'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  Sigma,
  GitBranch,
  Terminal,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Palette,
  PlusCircle,
  MinusCircle,
  Minus
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EditorToolbarProps {
  editor: Editor | null
}

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  if (!editor) return null
  
  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    icon: Icon, 
    tooltip 
  }: { 
    onClick: () => void
    isActive?: boolean
    icon: typeof Bold
    tooltip: string
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onClick}
            className="h-8 w-8 p-0"
          >
            <Icon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
  
  return (
    <div className="border-b bg-muted/30 p-2 flex gap-1 flex-wrap items-center sticky top-0 z-10">
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        tooltip="Bold (Ctrl+B)"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        tooltip="Italic (Ctrl+I)"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        icon={UnderlineIcon}
        tooltip="Underline (Ctrl+U)"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        icon={Strikethrough}
        tooltip="Strikethrough"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        icon={Code}
        tooltip="Inline Code"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        icon={Highlighter}
        tooltip="Highlight Text"
      />
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* Subscript/Superscript */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive('subscript')}
        icon={SubscriptIcon}
        tooltip="Subscript (H₂O)"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive('superscript')}
        icon={SuperscriptIcon}
        tooltip="Superscript (E=mc²)"
      />
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        tooltip="Heading 1"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        tooltip="Heading 2"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        icon={Heading3}
        tooltip="Heading 3"
      />
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        tooltip="Bullet List"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        tooltip="Numbered List"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote}
        tooltip="Blockquote"
      />
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* Text Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        icon={AlignLeft}
        tooltip="Align Left"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        icon={AlignCenter}
        tooltip="Align Center"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        icon={AlignRight}
        tooltip="Align Right"
      />
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* Link */}
      <ToolbarButton
        onClick={() => {
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}
        isActive={editor.isActive('link')}
        icon={LinkIcon}
        tooltip="Add Link"
      />
      
      {/* Image */}
      <ToolbarButton
        onClick={() => {
          const url = window.prompt('Enter image URL:')
          if (url) {
            editor.chain().focus().setImage({ src: url }).run()
          }
        }}
        icon={ImageIcon}
        tooltip="Insert Image"
      />
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* Color Picker */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Palette className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-2">Text Color</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      '#000000', '#374151', '#DC2626', '#EA580C', '#D97706',
                      '#65A30D', '#059669', '#0891B2', '#2563EB', '#7C3AED',
                      '#C026D3', '#DB2777', '#64748B', '#FFFFFF'
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => editor.chain().focus().setColor(color).run()}
                        className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => editor.chain().focus().unsetColor().run()}
                    className="w-full mt-2 px-3 py-1 text-sm border rounded hover:bg-accent"
                  >
                    Reset Color
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent>
            <p>Text Color</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* Table */}
      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        icon={TableIcon}
        tooltip="Insert Table"
      />
      
      {/* Table manipulation buttons - only show when cursor is in a table */}
      {editor.isActive('table') && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            icon={PlusCircle}
            tooltip="Add Row Below"
          />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            icon={PlusCircle}
            tooltip="Add Column Right"
          />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            icon={MinusCircle}
            tooltip="Delete Row"
          />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            icon={MinusCircle}
            tooltip="Delete Column"
          />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            icon={TableIcon}
            tooltip="Delete Table"
          />
        </>
      )}
      
      {/* Task List */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        icon={CheckSquare}
        tooltip="Task List"
      />
      
      {/* Code Block */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        icon={Terminal}
        tooltip="Code Block"
      />
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* Math Equation */}
      <ToolbarButton
        onClick={() => {
          const latex = window.prompt('Enter LaTeX equation:', 'E = mc^2')
          if (latex) {
            editor.chain().focus().insertContent({
              type: 'math',
              attrs: { latex, display: false },
            }).run()
          }
        }}
        icon={Sigma}
        tooltip="Insert Math Equation"
      />
      
      {/* Mermaid Diagram */}
      <ToolbarButton
        onClick={() => {
          editor.chain().focus().insertContent({
            type: 'mermaid',
            attrs: { code: 'graph TD\n    A[Start] --> B[Process]\n    B --> C[End]' },
          }).run()
        }}
        icon={GitBranch}
        tooltip="Insert Diagram (Mermaid)"
      />
      
      {/* Horizontal Rule */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        icon={Minus}
        tooltip="Insert Divider"
      />
      
      <Separator orientation="vertical" className="h-8" />
      
      {/* History */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        icon={Undo}
        tooltip="Undo (Ctrl+Z)"
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        icon={Redo}
        tooltip="Redo (Ctrl+Y)"
      />
    </div>
  )
}
