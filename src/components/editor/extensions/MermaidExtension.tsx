import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
})

const MermaidComponent = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [code, setCode] = useState(node.attrs.code || '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderDiagram = async () => {
      if (!node.attrs.code) return

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, node.attrs.code)
        setSvg(svg)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setSvg('')
      }
    }

    renderDiagram()
  }, [node.attrs.code])

  const handleSave = () => {
    updateAttributes({ code })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setCode(node.attrs.code || '')
    setIsEditing(false)
  }

  return (
    <NodeViewWrapper className={`mermaid-wrapper ${selected ? 'ProseMirror-selectednode' : ''}`}>
      <div className="border rounded-lg p-4 my-4 bg-card" ref={containerRef}>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Edit Mermaid Diagram</label>
              <a 
                href="https://mermaid.live" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Test in Mermaid Live →
              </a>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 p-3 font-mono text-sm bg-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="graph TD&#10;    A[Start] --> B[Process]&#10;    B --> C[End]"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>💡 Tip: Use Tab for indentation</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Diagram
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteNode}
                className="px-4 py-2 text-sm border border-destructive text-destructive rounded-lg hover:bg-destructive/10 ml-auto transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {error ? (
              <div className="p-4 bg-destructive/10 text-destructive text-sm rounded">
                <p className="font-semibold">Mermaid Error:</p>
                <p>{error}</p>
              </div>
            ) : svg ? (
              <div
                className="flex justify-center"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No diagram code provided
              </div>
            )}
            <div className="flex justify-center">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm border rounded hover:bg-accent"
              >
                Edit Diagram
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const MermaidExtension = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      code: {
        default: 'graph TD\n    A[Start] --> B[Process]\n    B --> C[End]',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'mermaid' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent)
  },
})
