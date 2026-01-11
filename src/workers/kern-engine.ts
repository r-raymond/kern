/**
 * Kern Engine Worker API
 *
 * This module provides a clean API for the main thread to communicate
 * with the Rust/WASM engine running in a Web Worker.
 */

import type {
  WorkerMessage,
  WorkerResponse,
  DocumentView,
  EditDelta,
} from './kern-engine.worker'

export type { DocumentView, EditDelta, LineView } from './kern-engine.worker'

type MessageHandler = (response: WorkerResponse) => void

class KernEngineAPI {
  private worker: Worker | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private isReady = false
  private pendingMessages: WorkerMessage[] = []

  /**
   * Initialize the worker and WASM engine
   */
  async init(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create worker with WASM support
      this.worker = new Worker(
        new URL('./kern-engine.worker.ts', import.meta.url),
        { type: 'module' }
      )

      // Set up message handler
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleMessage(event.data)
      }

      this.worker.onerror = (error) => {
        console.error('Worker error:', error)
        reject(error)
      }

      // Wait for ready signal
      this.once('ready', (response) => {
        if (response.type === 'ready') {
          this.isReady = true
          // Process pending messages
          for (const msg of this.pendingMessages) {
            this.worker?.postMessage(msg)
          }
          this.pendingMessages = []
          resolve(response.health)
        }
      })

      this.once('error', (response) => {
        if (response.type === 'error') {
          reject(new Error(response.message))
        }
      })

      // Send init command
      this.send({ type: 'init' })
    })
  }

  /**
   * Send a message to the worker
   */
  private send(message: WorkerMessage) {
    if (!this.isReady && message.type !== 'init') {
      this.pendingMessages.push(message)
      return
    }
    this.worker?.postMessage(message)
  }

  /**
   * Handle incoming messages from worker
   */
  private handleMessage(response: WorkerResponse) {
    const handlers = this.handlers.get(response.type) || []
    for (const handler of handlers) {
      handler(response)
    }
  }

  /**
   * Register a one-time handler for a response type
   */
  private once(type: string, handler: MessageHandler) {
    const wrapper: MessageHandler = (response) => {
      this.off(type, wrapper)
      handler(response)
    }
    this.on(type, wrapper)
  }

  /**
   * Register a handler for a response type
   */
  on(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type) || []
    handlers.push(handler)
    this.handlers.set(type, handlers)
  }

  /**
   * Remove a handler
   */
  off(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type) || []
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }

  /**
   * Check WASM engine health
   */
  async checkHealth(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.once('health', (response) => {
        if (response.type === 'health') {
          resolve(response.message)
        }
      })
      this.once('error', (response) => {
        if (response.type === 'error') {
          reject(new Error(response.message))
        }
      })
      this.send({ type: 'check_health' })
    })
  }

  /**
   * Get current document view
   */
  async getView(): Promise<DocumentView> {
    return new Promise((resolve, reject) => {
      this.once('view', (response) => {
        if (response.type === 'view') {
          resolve(response.view)
        }
      })
      this.once('error', (response) => {
        if (response.type === 'error') {
          reject(new Error(response.message))
        }
      })
      this.send({ type: 'get_view' })
    })
  }

  /**
   * Apply an edit to the document
   */
  async applyEdit(delta: EditDelta): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.once('edited', (response) => {
        if (response.type === 'edited') {
          resolve(response.affectedLines)
        }
      })
      this.once('error', (response) => {
        if (response.type === 'error') {
          reject(new Error(response.message))
        }
      })
      this.send({ type: 'apply_edit', delta })
    })
  }

  /**
   * Set entire document content
   */
  async setText(content: string): Promise<DocumentView> {
    return new Promise((resolve, reject) => {
      this.once('view', (response) => {
        if (response.type === 'view') {
          resolve(response.view)
        }
      })
      this.once('error', (response) => {
        if (response.type === 'error') {
          reject(new Error(response.message))
        }
      })
      this.send({ type: 'set_text', content })
    })
  }

  /**
   * Export document snapshot for persistence
   */
  async exportSnapshot(): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      this.once('snapshot', (response) => {
        if (response.type === 'snapshot') {
          resolve(response.data)
        }
      })
      this.once('error', (response) => {
        if (response.type === 'error') {
          reject(new Error(response.message))
        }
      })
      this.send({ type: 'export_snapshot' })
    })
  }

  /**
   * Load document from saved bytes
   */
  async loadFromBytes(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      this.once('loaded', () => {
        resolve()
      })
      this.once('error', (response) => {
        if (response.type === 'error') {
          reject(new Error(response.message))
        }
      })
      this.send({ type: 'load_from_bytes', data })
    })
  }

  /**
   * Terminate the worker
   */
  terminate() {
    this.worker?.terminate()
    this.worker = null
    this.isReady = false
  }
}

// Export singleton instance
export const kernEngine = new KernEngineAPI()
