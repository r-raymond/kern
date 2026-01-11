import { createSignal, createEffect, For, onMount, type JSX } from 'solid-js'
import { documentView, applyEdit, isInitialized, type LineView } from '../store/document'
import { HelpOverlay } from './HelpOverlay'

export type EditorMode = 'normal' | 'insert'

// Export mode signal so Layout can pass it to StatusBar
export const [mode, setMode] = createSignal<EditorMode>('normal')

// Pending operator for vim commands like 'd' waiting for motion
type PendingOperator = 'd' | null

export function KernEditor(): JSX.Element {
  const [cursorLine, setCursorLine] = createSignal(0)
  const [cursorCol, setCursorCol] = createSignal(0)
  const [pendingOperator, setPendingOperator] = createSignal<PendingOperator>(null)
  const [showHelp, setShowHelp] = createSignal(false)

  let editorRef: HTMLDivElement | undefined

  // Focus editor on mount
  onMount(() => {
    editorRef?.focus()
  })

  // Get lines from document store, fallback to placeholder if not initialized
  const lines = (): LineView[] => {
    const view = documentView()
    if (view.lines.length > 0) {
      return view.lines
    }
    // Fallback placeholder while loading
    return [
      { id: '0', content: '# Welcome to Kern' },
      { id: '1', content: '' },
      { id: '2', content: 'Loading...' },
    ]
  }

  // Clamp cursor to valid bounds
  const clampCursor = (line: number, col: number): [number, number] => {
    const lineCount = lines().length
    const clampedLine = Math.max(0, Math.min(line, lineCount - 1))
    const lineContent = lines()[clampedLine]?.content || ''
    // In normal mode, cursor can't go past last char; in insert mode, can go one past
    const maxCol = mode() === 'normal'
      ? Math.max(0, lineContent.length - 1)
      : lineContent.length
    const clampedCol = Math.max(0, Math.min(col, maxCol))
    return [clampedLine, clampedCol]
  }

  // Movement helpers
  const moveLeft = () => {
    const [line, col] = clampCursor(cursorLine(), cursorCol() - 1)
    setCursorCol(col)
  }

  const moveRight = () => {
    const [line, col] = clampCursor(cursorLine(), cursorCol() + 1)
    setCursorCol(col)
  }

  const moveUp = () => {
    const [line, col] = clampCursor(cursorLine() - 1, cursorCol())
    setCursorLine(line)
    setCursorCol(col)
  }

  const moveDown = () => {
    const [line, col] = clampCursor(cursorLine() + 1, cursorCol())
    setCursorLine(line)
    setCursorCol(col)
  }

  const moveToLineStart = () => {
    setCursorCol(0)
  }

  const moveToLineEnd = () => {
    const lineContent = lines()[cursorLine()]?.content || ''
    const maxCol = mode() === 'normal'
      ? Math.max(0, lineContent.length - 1)
      : lineContent.length
    setCursorCol(maxCol)
  }

  // Insert character at cursor
  const insertChar = async (char: string) => {
    if (!isInitialized()) return

    await applyEdit({
      line: cursorLine(),
      col: cursorCol(),
      insert: char,
    })
    setCursorCol(c => c + char.length)
  }

  // Delete character before cursor (backspace)
  const deleteCharBefore = async () => {
    if (!isInitialized()) return
    if (cursorCol() === 0) {
      // At start of line - join with previous line
      if (cursorLine() > 0) {
        const prevLineContent = lines()[cursorLine() - 1]?.content || ''
        await applyEdit({
          line: cursorLine(),
          col: 0,
          delete: 1, // Delete the newline
        })
        setCursorLine(l => l - 1)
        setCursorCol(prevLineContent.length)
      }
      return
    }

    await applyEdit({
      line: cursorLine(),
      col: cursorCol(),
      delete: 1,
    })
    setCursorCol(c => Math.max(0, c - 1))
  }

  // Insert newline
  const insertNewline = async () => {
    if (!isInitialized()) return

    await applyEdit({
      line: cursorLine(),
      col: cursorCol(),
      insert: '\n',
    })
    setCursorLine(l => l + 1)
    setCursorCol(0)
  }

  // Find end position for 'w' motion (start of next word)
  const findNextWordStart = (line: string, col: number): number => {
    let pos = col
    // Skip current word (non-whitespace)
    while (pos < line.length && !/\s/.test(line[pos])) pos++
    // Skip whitespace
    while (pos < line.length && /\s/.test(line[pos])) pos++
    // If we reached end of line, return line length
    return pos
  }

  // Delete a range of characters from startCol to endCol
  const deleteRange = async (startCol: number, endCol: number) => {
    if (!isInitialized()) return
    const deleteCount = endCol - startCol
    if (deleteCount <= 0) return

    // Delete from endCol position, going backwards deleteCount chars
    await applyEdit({
      line: cursorLine(),
      col: endCol,
      delete: deleteCount,
    })
  }

  // Delete the entire current line
  const deleteLine = async () => {
    if (!isInitialized()) return
    const lineCount = lines().length

    if (lineCount === 1) {
      // Last remaining line - just clear it
      const lineContent = lines()[0]?.content || ''
      if (lineContent.length > 0) {
        await applyEdit({
          line: 0,
          col: lineContent.length,
          delete: lineContent.length,
        })
      }
      setCursorCol(0)
      return
    }

    // Delete line content + newline
    const lineContent = lines()[cursorLine()]?.content || ''
    const isLastLine = cursorLine() === lineCount - 1

    if (isLastLine) {
      // Delete previous newline + this line's content
      await applyEdit({
        line: cursorLine(),
        col: lineContent.length,
        delete: lineContent.length + 1,
      })
      setCursorLine(l => Math.max(0, l - 1))
    } else {
      // Delete this line's content + following newline
      await applyEdit({
        line: cursorLine(),
        col: lineContent.length + 1,
        delete: lineContent.length + 1,
      })
    }

    // Clamp cursor column to new line
    const newLineContent = lines()[cursorLine()]?.content || ''
    setCursorCol(Math.min(cursorCol(), Math.max(0, newLineContent.length - 1)))
  }

  // Keyboard handler
  const handleKeyDown = async (e: KeyboardEvent) => {
    // Prevent default for keys we handle
    const preventDefault = () => {
      e.preventDefault()
      e.stopPropagation()
    }

    if (mode() === 'normal') {
      switch (e.key) {
        case 'h':
        case 'ArrowLeft':
          preventDefault()
          moveLeft()
          break
        case 'j':
        case 'ArrowDown':
          preventDefault()
          moveDown()
          break
        case 'k':
        case 'ArrowUp':
          preventDefault()
          moveUp()
          break
        case 'l':
        case 'ArrowRight':
          preventDefault()
          moveRight()
          break
        case 'i':
          preventDefault()
          setMode('insert')
          break
        case 'a':
          preventDefault()
          moveRight()
          setMode('insert')
          break
        case 'o':
          preventDefault()
          moveToLineEnd()
          await insertNewline()
          setMode('insert')
          break
        case 'O':
          preventDefault()
          moveToLineStart()
          await insertNewline()
          setCursorLine(l => l - 1)
          setMode('insert')
          break
        case '0':
          preventDefault()
          moveToLineStart()
          break
        case '$':
          preventDefault()
          moveToLineEnd()
          break
        case 'G':
          preventDefault()
          setCursorLine(lines().length - 1)
          const [, col] = clampCursor(cursorLine(), cursorCol())
          setCursorCol(col)
          break
        case 'g':
          // gg to go to top - simplified, just go to top on single g
          if (e.repeat) break
          preventDefault()
          setCursorLine(0)
          setCursorCol(0)
          break
        case 'd':
          preventDefault()
          if (pendingOperator() === 'd') {
            // dd - delete line
            await deleteLine()
            setPendingOperator(null)
          } else {
            setPendingOperator('d')
          }
          break
        case 'w':
          preventDefault()
          if (pendingOperator() === 'd') {
            // dw - delete word
            const lineContent = lines()[cursorLine()]?.content || ''
            const endCol = findNextWordStart(lineContent, cursorCol())
            await deleteRange(cursorCol(), endCol)
            setPendingOperator(null)
          } else {
            // w motion - move to next word start
            const lineContent = lines()[cursorLine()]?.content || ''
            const nextPos = findNextWordStart(lineContent, cursorCol())
            if (nextPos < lineContent.length) {
              setCursorCol(nextPos)
            } else if (cursorLine() < lines().length - 1) {
              // Move to start of next line
              setCursorLine(l => l + 1)
              setCursorCol(0)
            }
          }
          break
        case 'Escape':
          preventDefault()
          if (showHelp()) {
            setShowHelp(false)
          } else {
            setPendingOperator(null)
          }
          break
        case '?':
          preventDefault()
          setShowHelp(h => !h)
          break
      }
    } else if (mode() === 'insert') {
      switch (e.key) {
        case 'Escape':
          preventDefault()
          setMode('normal')
          // In normal mode, cursor can't be past end of line
          const lineContent = lines()[cursorLine()]?.content || ''
          if (cursorCol() > 0 && cursorCol() >= lineContent.length) {
            setCursorCol(Math.max(0, lineContent.length - 1))
          }
          break
        case 'Backspace':
          preventDefault()
          await deleteCharBefore()
          break
        case 'Enter':
          preventDefault()
          await insertNewline()
          break
        case 'ArrowLeft':
          preventDefault()
          moveLeft()
          break
        case 'ArrowRight':
          preventDefault()
          moveRight()
          break
        case 'ArrowUp':
          preventDefault()
          moveUp()
          break
        case 'ArrowDown':
          preventDefault()
          moveDown()
          break
        default:
          // Insert printable characters
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            preventDefault()
            await insertChar(e.key)
          }
      }
    }
  }

  // Render a line with cursor
  const renderLineWithCursor = (content: string, lineIndex: number): JSX.Element => {
    const isCursorLine = lineIndex === cursorLine()
    const col = cursorCol()

    if (!isCursorLine) {
      return <>{renderMarkdown(content)}</>
    }

    // Split content around cursor position
    const before = content.slice(0, col)
    const cursorChar = content[col] || ' ' // Space if at end of line
    const after = content.slice(col + 1)

    return (
      <>
        {before && renderMarkdown(before)}
        <span class={`cursor cursor-${mode()}`}>{cursorChar}</span>
        {after && renderMarkdown(after)}
      </>
    )
  }

  // Render markdown with ghost syntax (simplified for cursor integration)
  const renderMarkdown = (content: string): JSX.Element => {
    if (!content) return <></>

    const parts: JSX.Element[] = []

    // Handle headings at start
    const headingMatch = content.match(/^(#{1,6}\s)/)
    if (headingMatch) {
      parts.push(<span class="ghost-syntax">{headingMatch[1]}</span>)
      content = content.slice(headingMatch[1].length)
    }

    // Handle list markers at start
    const listMatch = content.match(/^(-\s|\*\s|\d+\.\s)/)
    if (listMatch && parts.length === 0) {
      parts.push(<span class="ghost-syntax">{listMatch[1]}</span>)
      content = content.slice(listMatch[1].length)
    }

    // Handle bold/italic/code in remaining content
    const segments = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)

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
    <div
      ref={editorRef}
      class="editor-content"
      tabindex={0}
      onKeyDown={handleKeyDown}
    >
      {showHelp() && <HelpOverlay onClose={() => setShowHelp(false)} />}
      <For each={lines()}>
        {(line, index) => (
          <div class={`editor-line ${index() === cursorLine() ? 'editor-line-active' : ''}`}>
            <span class="line-number">{index() + 1}</span>
            <span class="line-content">
              {renderLineWithCursor(line.content, index())}
            </span>
          </div>
        )}
      </For>
    </div>
  )
}
