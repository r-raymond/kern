import { createSignal, For, type JSX } from 'solid-js'

interface EditorLine {
  id: string
  content: string
}

export function KernEditor(): JSX.Element {
  // Placeholder lines for initial scaffold
  const [lines, setLines] = createSignal<EditorLine[]>([
    { id: '1', content: '# Welcome to Kern' },
    { id: '2', content: '' },
    { id: '3', content: 'A minimalist, keyboard-centric PKB.' },
    { id: '4', content: '' },
    { id: '5', content: '## Features' },
    { id: '6', content: '' },
    { id: '7', content: '- **Local-first** with OPFS storage' },
    { id: '8', content: '- **CRDT-powered** via Loro-rs' },
    { id: '9', content: '- **ASCII aesthetics** with monospace grid' },
    { id: '10', content: '' },
  ])

  // Render ghost syntax for markdown characters
  const renderLine = (content: string): JSX.Element => {
    // Pattern to match markdown syntax characters
    const parts: JSX.Element[] = []
    let remaining = content

    // Handle headings
    const headingMatch = remaining.match(/^(#{1,6}\s)/)
    if (headingMatch) {
      parts.push(<span class="ghost-syntax">{headingMatch[1]}</span>)
      remaining = remaining.slice(headingMatch[1].length)
    }

    // Handle list markers
    const listMatch = remaining.match(/^(-\s|\*\s|\d+\.\s)/)
    if (listMatch && parts.length === 0) {
      parts.push(<span class="ghost-syntax">{listMatch[1]}</span>)
      remaining = remaining.slice(listMatch[1].length)
    }

    // Handle bold/italic in remaining content
    const segments = remaining.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)

    for (const segment of segments) {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        parts.push(
          <>
            <span class="ghost-syntax">**</span>
            <strong>{segment.slice(2, -2)}</strong>
            <span class="ghost-syntax">**</span>
          </>
        )
      } else if (segment.startsWith('*') && segment.endsWith('*') && segment.length > 2) {
        parts.push(
          <>
            <span class="ghost-syntax">*</span>
            <em>{segment.slice(1, -1)}</em>
            <span class="ghost-syntax">*</span>
          </>
        )
      } else if (segment.startsWith('`') && segment.endsWith('`')) {
        parts.push(
          <>
            <span class="ghost-syntax">`</span>
            <code>{segment.slice(1, -1)}</code>
            <span class="ghost-syntax">`</span>
          </>
        )
      } else if (segment) {
        parts.push(<>{segment}</>)
      }
    }

    return <>{parts}</>
  }

  return (
    <div class="editor-content">
      <For each={lines()}>
        {(line, index) => (
          <div class="editor-line">
            <span class="line-number">{index() + 1}</span>
            <span class="line-content">
              {renderLine(line.content)}
            </span>
          </div>
        )}
      </For>
    </div>
  )
}
