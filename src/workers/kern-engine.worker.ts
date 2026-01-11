/// <reference lib="webworker" />

// This worker loads the Kern WASM engine and handles document operations
// off the main thread for smooth UI performance

import type { KernEngine } from '../../src-wasm/pkg/kern_wasm'

let engine: KernEngine | null = null

// Message types
export type WorkerMessage =
  | { type: 'init' }
  | { type: 'apply_edit'; delta: EditDelta }
  | { type: 'get_view' }
  | { type: 'export_snapshot' }
  | { type: 'load_from_bytes'; data: Uint8Array }
  | { type: 'set_text'; content: string }
  | { type: 'check_health' }

export interface EditDelta {
  line: number
  col: number
  insert?: string
  delete?: number
}

export interface LineView {
  id: string
  content: string
}

export interface DocumentView {
  lines: LineView[]
  version: number
}

export type WorkerResponse =
  | { type: 'ready'; health: string }
  | { type: 'view'; view: DocumentView }
  | { type: 'edited'; affectedLines: number[] }
  | { type: 'snapshot'; data: Uint8Array }
  | { type: 'loaded' }
  | { type: 'health'; message: string }
  | { type: 'error'; message: string }

// Initialize the WASM engine
async function initEngine() {
  try {
    // Dynamic import of WASM module
    const wasm = await import('../../src-wasm/pkg/kern_wasm')

    // Initialize panic hook
    await wasm.default?.()

    // Check health first
    const health = wasm.check_health()

    // Create engine instance
    engine = new wasm.KernEngine()

    const response: WorkerResponse = { type: 'ready', health }
    self.postMessage(response)
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      message: `Failed to initialize WASM: ${error}`,
    }
    self.postMessage(response)
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data

  try {
    switch (msg.type) {
      case 'init':
        await initEngine()
        break

      case 'check_health': {
        const wasm = await import('../../src-wasm/pkg/kern_wasm')
        const health = wasm.check_health()
        const response: WorkerResponse = { type: 'health', message: health }
        self.postMessage(response)
        break
      }

      case 'apply_edit': {
        if (!engine) throw new Error('Engine not initialized')
        const affectedLines = engine.apply_edit(msg.delta) as number[]
        const response: WorkerResponse = { type: 'edited', affectedLines }
        self.postMessage(response)
        break
      }

      case 'get_view': {
        if (!engine) throw new Error('Engine not initialized')
        const view = engine.get_view() as DocumentView
        const response: WorkerResponse = { type: 'view', view }
        self.postMessage(response)
        break
      }

      case 'export_snapshot': {
        if (!engine) throw new Error('Engine not initialized')
        const data = engine.export_snapshot()
        const response: WorkerResponse = { type: 'snapshot', data: new Uint8Array(data) }
        self.postMessage(response)
        break
      }

      case 'load_from_bytes': {
        if (!engine) throw new Error('Engine not initialized')
        engine.load_from_bytes(msg.data)
        const response: WorkerResponse = { type: 'loaded' }
        self.postMessage(response)
        break
      }

      case 'set_text': {
        if (!engine) throw new Error('Engine not initialized')
        engine.set_text(msg.content)
        const view = engine.get_view() as DocumentView
        const response: WorkerResponse = { type: 'view', view }
        self.postMessage(response)
        break
      }
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      message: `Worker error: ${error}`,
    }
    self.postMessage(response)
  }
}
