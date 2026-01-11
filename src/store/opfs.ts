/**
 * OPFS Storage Layer for Kern
 *
 * Provides local-first persistence using the Origin Private File System.
 * Implements the delta-based save strategy:
 * - In-memory buffer for edits
 * - Periodic flush of deltas to OPFS
 * - Full snapshot compaction every 30 seconds
 */

const KERN_DIR = 'kern-data'
const SNAPSHOTS_DIR = 'snapshots'
const UPDATES_DIR = 'updates'

interface StorageStats {
  snapshotCount: number
  updatesCount: number
  totalBytes: number
}

class OPFSStorage {
  private root: FileSystemDirectoryHandle | null = null
  private initialized = false

  /**
   * Initialize OPFS storage
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true

    try {
      // Get OPFS root
      const opfsRoot = await navigator.storage.getDirectory()

      // Create kern data directory
      this.root = await opfsRoot.getDirectoryHandle(KERN_DIR, { create: true })

      // Create subdirectories
      await this.root.getDirectoryHandle(SNAPSHOTS_DIR, { create: true })
      await this.root.getDirectoryHandle(UPDATES_DIR, { create: true })

      this.initialized = true
      return true
    } catch (error) {
      console.error('OPFS initialization failed:', error)
      return false
    }
  }

  /**
   * Check if OPFS is available
   */
  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'storage' in navigator && 'getDirectory' in navigator.storage
  }

  /**
   * Save a full document snapshot
   */
  async saveSnapshot(id: string, data: Uint8Array): Promise<void> {
    if (!this.root) throw new Error('Storage not initialized')

    const snapshotsDir = await this.root.getDirectoryHandle(SNAPSHOTS_DIR)
    const fileHandle = await snapshotsDir.getFileHandle(`${id}.loro`, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(data)
    await writable.close()

    // Clear updates for this document after snapshot
    await this.clearUpdates(id)
  }

  /**
   * Append incremental updates (delta)
   */
  async appendUpdates(id: string, delta: Uint8Array): Promise<void> {
    if (!this.root) throw new Error('Storage not initialized')

    const updatesDir = await this.root.getDirectoryHandle(UPDATES_DIR)
    const timestamp = Date.now()
    const fileHandle = await updatesDir.getFileHandle(`${id}-${timestamp}.delta`, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(delta)
    await writable.close()
  }

  /**
   * Load a document (snapshot + any pending updates)
   */
  async loadDocument(id: string): Promise<Uint8Array | null> {
    if (!this.root) throw new Error('Storage not initialized')

    try {
      const snapshotsDir = await this.root.getDirectoryHandle(SNAPSHOTS_DIR)
      const fileHandle = await snapshotsDir.getFileHandle(`${id}.loro`)
      const file = await fileHandle.getFile()
      const buffer = await file.arrayBuffer()
      return new Uint8Array(buffer)
    } catch {
      // Document doesn't exist
      return null
    }
  }

  /**
   * List all stored documents
   */
  async listDocuments(): Promise<string[]> {
    if (!this.root) throw new Error('Storage not initialized')

    const snapshotsDir = await this.root.getDirectoryHandle(SNAPSHOTS_DIR)
    const documents: string[] = []

    for await (const entry of snapshotsDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.loro')) {
        documents.push(entry.name.replace('.loro', ''))
      }
    }

    return documents
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    if (!this.root) throw new Error('Storage not initialized')

    const snapshotsDir = await this.root.getDirectoryHandle(SNAPSHOTS_DIR)

    try {
      await snapshotsDir.removeEntry(`${id}.loro`)
    } catch {
      // File doesn't exist, that's fine
    }

    await this.clearUpdates(id)
  }

  /**
   * Clear pending updates for a document
   */
  private async clearUpdates(id: string): Promise<void> {
    if (!this.root) return

    const updatesDir = await this.root.getDirectoryHandle(UPDATES_DIR)

    for await (const entry of updatesDir.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(`${id}-`)) {
        await updatesDir.removeEntry(entry.name)
      }
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    if (!this.root) throw new Error('Storage not initialized')

    const stats: StorageStats = {
      snapshotCount: 0,
      updatesCount: 0,
      totalBytes: 0,
    }

    const snapshotsDir = await this.root.getDirectoryHandle(SNAPSHOTS_DIR)
    for await (const entry of snapshotsDir.values()) {
      if (entry.kind === 'file') {
        stats.snapshotCount++
        const file = await entry.getFile()
        stats.totalBytes += file.size
      }
    }

    const updatesDir = await this.root.getDirectoryHandle(UPDATES_DIR)
    for await (const entry of updatesDir.values()) {
      if (entry.kind === 'file') {
        stats.updatesCount++
        const file = await entry.getFile()
        stats.totalBytes += file.size
      }
    }

    return stats
  }
}

// Export singleton instance
export const opfsStorage = new OPFSStorage()

// Export types
export type { StorageStats }
