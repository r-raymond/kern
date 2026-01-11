/* @refresh reload */
import { render } from 'solid-js/web'
import { onMount, onCleanup } from 'solid-js'
import App from './App'
import { initStore, setupAutoSave } from './store/document'

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
