import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@solidjs/testing-library'
import { KernEditor, setMode } from './KernEditor'

// Mock the document store
const mockApplyEdit = vi.fn()
const mockDocumentView = vi.fn()
const mockIsInitialized = vi.fn()

vi.mock('../store/document', () => ({
  applyEdit: (delta: unknown) => mockApplyEdit(delta),
  documentView: () => mockDocumentView(),
  isInitialized: () => mockIsInitialized(),
}))

describe('KernEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsInitialized.mockReturnValue(true)
    setMode('normal')
  })

  describe('o command (open line below)', () => {
    it('should insert newline after last character, not before', async () => {
      // Setup: document with a single line "hello"
      mockDocumentView.mockReturnValue({
        lines: [{ id: '0', content: 'hello' }],
        version: 1,
      })

      const { container } = render(() => <KernEditor />)
      const editor = container.querySelector('.editor-content')!

      // Focus the editor
      ;(editor as HTMLElement).focus()

      // Simulate 'o' keypress in normal mode
      await fireEvent.keyDown(editor, { key: 'o' })

      // Assert: applyEdit should be called with col=5 (after 'o'), not col=4 (before 'o')
      expect(mockApplyEdit).toHaveBeenCalledTimes(1)
      expect(mockApplyEdit).toHaveBeenCalledWith({
        line: 0,
        col: 5, // Should be lineContent.length (5), not lineContent.length - 1 (4)
        insert: '\n',
      })
    })

    it('should work correctly on empty line', async () => {
      // Setup: document with an empty line
      mockDocumentView.mockReturnValue({
        lines: [{ id: '0', content: '' }],
        version: 1,
      })

      const { container } = render(() => <KernEditor />)
      const editor = container.querySelector('.editor-content')!
      ;(editor as HTMLElement).focus()

      await fireEvent.keyDown(editor, { key: 'o' })

      expect(mockApplyEdit).toHaveBeenCalledWith({
        line: 0,
        col: 0, // Empty line, so col should be 0
        insert: '\n',
      })
    })

    it('should enter insert mode after opening new line', async () => {
      mockDocumentView.mockReturnValue({
        lines: [{ id: '0', content: 'test' }],
        version: 1,
      })

      const { container } = render(() => <KernEditor />)
      const editor = container.querySelector('.editor-content')!
      ;(editor as HTMLElement).focus()

      // Start in normal mode
      setMode('normal')

      await fireEvent.keyDown(editor, { key: 'o' })

      // Import mode to check - we need to check the mode signal
      const { mode } = await import('./KernEditor')
      expect(mode()).toBe('insert')
    })

    it('should insert newline at end of line regardless of initial cursor position', async () => {
      mockDocumentView.mockReturnValue({
        lines: [{ id: '0', content: 'hello' }],
        version: 1,
      })

      const { container } = render(() => <KernEditor />)
      const editor = container.querySelector('.editor-content')!
      ;(editor as HTMLElement).focus()

      // Move cursor to middle of line first (simulate user navigating)
      await fireEvent.keyDown(editor, { key: 'l' }) // move right
      await fireEvent.keyDown(editor, { key: 'l' }) // move right again

      // Now press 'o'
      await fireEvent.keyDown(editor, { key: 'o' })

      // Should still insert at end of line, not at cursor position
      expect(mockApplyEdit).toHaveBeenLastCalledWith({
        line: 0,
        col: 5,
        insert: '\n',
      })
    })

    it('should work correctly on non-first line in multi-line document', async () => {
      mockDocumentView.mockReturnValue({
        lines: [
          { id: '0', content: 'first' },
          { id: '1', content: 'second' },
          { id: '2', content: 'third' },
        ],
        version: 1,
      })

      const { container } = render(() => <KernEditor />)
      const editor = container.querySelector('.editor-content')!
      ;(editor as HTMLElement).focus()

      // Move to second line
      await fireEvent.keyDown(editor, { key: 'j' })

      await fireEvent.keyDown(editor, { key: 'o' })

      expect(mockApplyEdit).toHaveBeenCalledWith({
        line: 1,
        col: 6, // 'second'.length
        insert: '\n',
      })
    })
  })

  describe('O command (open line above)', () => {
    it('should insert newline at start of current line', async () => {
      mockDocumentView.mockReturnValue({
        lines: [{ id: '0', content: 'hello' }],
        version: 1,
      })

      const { container } = render(() => <KernEditor />)
      const editor = container.querySelector('.editor-content')!
      ;(editor as HTMLElement).focus()

      await fireEvent.keyDown(editor, { key: 'O' })

      expect(mockApplyEdit).toHaveBeenCalledWith({
        line: 0,
        col: 0, // Should insert at start of line
        insert: '\n',
      })
    })
  })

  describe('insert mode', () => {
    it('should insert characters at cursor position', async () => {
      mockDocumentView.mockReturnValue({
        lines: [{ id: '0', content: 'hello' }],
        version: 1,
      })

      const { container } = render(() => <KernEditor />)
      const editor = container.querySelector('.editor-content')!
      ;(editor as HTMLElement).focus()

      // Enter insert mode
      setMode('insert')

      await fireEvent.keyDown(editor, { key: 'x' })

      expect(mockApplyEdit).toHaveBeenCalledWith({
        line: 0,
        col: 0, // Cursor starts at 0
        insert: 'x',
      })
    })

    it('should insert newline on Enter', async () => {
      mockDocumentView.mockReturnValue({
        lines: [{ id: '0', content: 'hello' }],
        version: 1,
      })

      const { container } = render(() => <KernEditor />)
      const editor = container.querySelector('.editor-content')!
      ;(editor as HTMLElement).focus()

      setMode('insert')

      await fireEvent.keyDown(editor, { key: 'Enter' })

      expect(mockApplyEdit).toHaveBeenCalledWith({
        line: 0,
        col: 0,
        insert: '\n',
      })
    })
  })
})
