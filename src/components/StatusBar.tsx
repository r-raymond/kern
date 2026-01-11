import type { JSX } from 'solid-js'
import type { EditorMode } from './KernEditor'

interface StatusBarProps {
  mode: EditorMode
}

export function StatusBar(props: StatusBarProps): JSX.Element {
  return (
    <>
      <span class={`mode-indicator mode-${props.mode}`}>
        -- {props.mode.toUpperCase()} --
      </span>
      <span>
        <kbd>^K</kbd> Search
      </span>
      <span>
        <kbd>^S</kbd> Save
      </span>
      <span>
        <kbd>^N</kbd> New Page
      </span>
      <span>
        <kbd>^P</kbd> Command Palette
      </span>
      <span style={{ "margin-left": "auto", color: "var(--text-muted)" }}>
        Kern v0.1.0 | Local
      </span>
    </>
  )
}
