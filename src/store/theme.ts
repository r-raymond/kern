import { createSignal } from 'solid-js'

export type Theme = 'gruvbox-dark' | 'gruvbox-light'

const STORAGE_KEY = 'kern-theme'
const DEFAULT_THEME: Theme = 'gruvbox-dark'

const [theme, setThemeSignal] = createSignal<Theme>(DEFAULT_THEME)

function applyTheme(t: Theme) {
  if (t === 'gruvbox-dark') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = t
  }
}

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  const initialTheme = stored && (stored === 'gruvbox-dark' || stored === 'gruvbox-light')
    ? stored
    : DEFAULT_THEME
  setThemeSignal(initialTheme)
  applyTheme(initialTheme)
}

export function setTheme(t: Theme) {
  setThemeSignal(t)
  localStorage.setItem(STORAGE_KEY, t)
  applyTheme(t)
}

export { theme }
