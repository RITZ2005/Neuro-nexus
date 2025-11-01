import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const MathComponent = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [latex, setLatex] = useState(node.attrs.latex || '')

  const renderMath = (latexString: string): { html: string; error: string } => {
    try {
      const html = katex.renderToString(latexString, {
        throwOnError: false,
        displayMode: node.attrs.display || false,
      })
      return { html, error: '' }
    } catch (err) {
      return { html: '', error: err instanceof Error ? err.message : 'Failed to render equation' }
    }
  }

  const rendered = node.attrs.latex ? renderMath(node.attrs.latex) : { html: '', error: '' }

  const handleSave = () => {
    updateAttributes({ latex })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLatex(node.attrs.latex || '')
    setIsEditing(false)
  }

  return (
    <NodeViewWrapper className={`math-wrapper ${selected ? 'ProseMirror-selectednode' : ''}`}>
      <div className={`inline-block border rounded p-2 my-1 ${node.attrs.display ? 'block text-center' : ''}`}>
        {isEditing ? (
          <div className="space-y-2 min-w-[300px]">
            <input
              type="text"
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              className="w-full p-2 font-mono text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="E = mc^2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm border rounded hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={deleteNode}
                className="px-3 py-1 text-sm border border-destructive text-destructive rounded hover:bg-destructive/10 ml-auto"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {rendered.error ? (
              <div className="text-destructive text-sm">{rendered.error}</div>
            ) : node.attrs.latex ? (
              <div
                dangerouslySetInnerHTML={{ __html: rendered.html }}
                onClick={() => setIsEditing(true)}
                className="cursor-pointer hover:bg-accent/50 p-1 rounded"
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="cursor-pointer text-muted-foreground text-sm p-1"
              >
                Click to add equation
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const MathExtension = Node.create({
  name: 'math',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
      display: {
        default: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'math' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent)
  },
})

// Block-level math extension
export const MathBlockExtension = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
      display: {
        default: true,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'math-block' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent)
  },
})
