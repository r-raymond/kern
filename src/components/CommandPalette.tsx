import { createSignal, createEffect, For, type JSX } from 'solid-js'
import { setTheme } from '../store/theme'

interface Command {
  id: string
  label: string
  action: () => void
}

interface CommandPaletteProps {
  onClose: () => void
}

const commands: Command[] = [
  {
    id: 'theme-dark',
    label: 'Theme: Gruvbox Dark',
    action: () => setTheme('gruvbox-dark'),
  },
  {
    id: 'theme-light',
    label: 'Theme: Gruvbox Light',
    action: () => setTheme('gruvbox-light'),
  },
]

export function CommandPalette(props: CommandPaletteProps): JSX.Element {
  const [query, setQuery] = createSignal('')
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  let inputRef: HTMLInputElement | undefined

  const filteredCommands = () => {
    const q = query().toLowerCase()
    if (!q) return commands
    return commands.filter(cmd => cmd.label.toLowerCase().includes(q))
  }

  createEffect(() => {
    inputRef?.focus()
  })

  createEffect(() => {
    const filtered = filteredCommands()
    if (selectedIndex() >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1))
    }
  })

  const executeSelected = () => {
    const filtered = filteredCommands()
    if (filtered.length > 0) {
      filtered[selectedIndex()].action()
      props.onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const filtered = filteredCommands()

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        executeSelected()
        break
      case 'Escape':
        e.preventDefault()
        props.onClose()
        break
    }
  }

  return (
    <div class="command-palette-overlay" onClick={props.onClose}>
      <div class="command-palette" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          class="command-input"
          placeholder="Type a command..."
          value={query()}
          onInput={e => {
            setQuery(e.currentTarget.value)
            setSelectedIndex(0)
          }}
          onKeyDown={handleKeyDown}
        />
        <div class="command-list">
          <For each={filteredCommands()}>
            {(cmd, index) => (
              <div
                class={`command-item ${index() === selectedIndex() ? 'selected' : ''}`}
                onClick={() => {
                  cmd.action()
                  props.onClose()
                }}
                onMouseEnter={() => setSelectedIndex(index())}
              >
                {cmd.label}
              </div>
            )}
          </For>
          {filteredCommands().length === 0 && (
            <div class="command-empty">No commands found</div>
          )}
        </div>
      </div>
    </div>
  )
}
