/**
 * Kern Document Store
 *
 * SolidJS reactive store that manages document state and coordinates
 * between the UI, WASM engine, and OPFS persistence.
 */

import { createSignal, createEffect, onCleanup } from 'solid-js'
import { kernEngine, type DocumentView, type LineView, type EditDelta } from '../workers/kern-engine'
import { opfsStorage } from './opfs'

// Re-export types for convenience
export type { DocumentView, LineView, EditDelta }

// Document state
const [isInitialized, setIsInitialized] = createSignal(false)
const [isLoading, setIsLoading] = createSignal(true)
const [error, setError] = createSignal<string | null>(null)
const [documentView, setDocumentView] = createSignal<DocumentView>({
  lines: [],
  version: 0,
})
const [currentDocId, setCurrentDocId] = createSignal<string>('default')
const [engineHealth, setEngineHealth] = createSignal<string>('')

// Save strategy state
const [pendingUpdates, setPendingUpdates] = createSignal<Uint8Array[]>([])
const [lastSnapshotTime, setLastSnapshotTime] = createSignal<number>(0)

const FLUSH_INTERVAL = 5000 // Flush deltas every 5 seconds
const SNAPSHOT_INTERVAL = 30000 // Full snapshot every 30 seconds

/**
 * Initialize the document store
 */
export async function initStore(): Promise<void> {
  if (isInitialized()) return

  setIsLoading(true)
  setError(null)

  try {
    // Initialize OPFS storage
    const opfsAvailable = opfsStorage.isAvailable()
    if (opfsAvailable) {
      await opfsStorage.init()
    } else {
      console.warn('OPFS not available, running in memory-only mode')
    }

    // Initialize WASM engine
    const health = await kernEngine.init()
    setEngineHealth(health)
    console.log(health)

    // Try to load existing document
    if (opfsAvailable) {
      const savedData = await opfsStorage.loadDocument(currentDocId())
      if (savedData) {
        await kernEngine.loadFromBytes(savedData)
      }
    }

    // Get initial view
    const view = await kernEngine.getView()
    setDocumentView(view)

    setIsInitialized(true)
    setLastSnapshotTime(Date.now())
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    setError(message)
    console.error('Failed to initialize store:', e)
  } finally {
    setIsLoading(false)
  }
}

/**
 * Apply an edit to the document
 */
export async function applyEdit(delta: EditDelta): Promise<void> {
  if (!isInitialized()) return

  try {
    await kernEngine.applyEdit(delta)
    const view = await kernEngine.getView()
    setDocumentView(view)
  } catch (e) {
    console.error('Edit failed:', e)
  }
}

/**
 * Set document content
 */
export async function setDocumentText(content: string): Promise<void> {
  if (!isInitialized()) return

  try {
    const view = await kernEngine.setText(content)
    setDocumentView(view)
  } catch (e) {
    console.error('Set text failed:', e)
  }
}

/**
 * Save document (manual trigger)
 */
export async function saveDocument(): Promise<void> {
  if (!isInitialized() || !opfsStorage.isAvailable()) return

  try {
    const snapshot = await kernEngine.exportSnapshot()
    await opfsStorage.saveSnapshot(currentDocId(), snapshot)
    setLastSnapshotTime(Date.now())
    setPendingUpdates([])
    console.log('Document saved')
  } catch (e) {
    console.error('Save failed:', e)
  }
}

/**
 * Load a different document
 */
export async function loadDocument(docId: string): Promise<void> {
  if (!isInitialized()) return

  setIsLoading(true)

  try {
    // Save current document first
    await saveDocument()

    // Update current doc ID
    setCurrentDocId(docId)

    // Try to load from OPFS
    if (opfsStorage.isAvailable()) {
      const savedData = await opfsStorage.loadDocument(docId)
      if (savedData) {
        await kernEngine.loadFromBytes(savedData)
      } else {
        // New document
        await kernEngine.setText(`# ${docId}\n\nStart typing...`)
      }
    }

    const view = await kernEngine.getView()
    setDocumentView(view)
  } catch (e) {
    console.error('Load failed:', e)
  } finally {
    setIsLoading(false)
  }
}

/**
 * Get all stored document IDs
 */
export async function listDocuments(): Promise<string[]> {
  if (!opfsStorage.isAvailable()) return [currentDocId()]

  try {
    return await opfsStorage.listDocuments()
  } catch {
    return [currentDocId()]
  }
}

/**
 * Set up auto-save effects
 */
export function setupAutoSave(): () => void {
  // Periodic snapshot save
  const snapshotInterval = setInterval(async () => {
    if (isInitialized() && Date.now() - lastSnapshotTime() > SNAPSHOT_INTERVAL) {
      await saveDocument()
    }
  }, SNAPSHOT_INTERVAL)

  // Flush deltas periodically
  const flushInterval = setInterval(async () => {
    const updates = pendingUpdates()
    if (updates.length > 0 && opfsStorage.isAvailable()) {
      for (const update of updates) {
        await opfsStorage.appendUpdates(currentDocId(), update)
      }
      setPendingUpdates([])
    }
  }, FLUSH_INTERVAL)

  // Return cleanup function
  return () => {
    clearInterval(snapshotInterval)
    clearInterval(flushInterval)
  }
}

// Export reactive getters
export {
  isInitialized,
  isLoading,
  error,
  documentView,
  currentDocId,
  engineHealth,
}
