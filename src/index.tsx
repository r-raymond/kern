/* @refresh reload */
import { render } from 'solid-js/web'
import { onMount, onCleanup } from 'solid-js'
import App from './App'
import { initStore, setupAutoSave } from './store/document'
import { initTheme } from './store/theme'

// Initialize theme before render to avoid flash
initTheme()

// Initialize store and render app
const root = document.getElementById('root')

function Root() {
  onMount(async () => {
    // Initialize the document store (WASM + OPFS)
    await initStore()

    // Set up auto-save
    const cleanup = setupAutoSave()
    onCleanup(cleanup)
  })

  return <App />
}

render(() => <Root />, root!)
