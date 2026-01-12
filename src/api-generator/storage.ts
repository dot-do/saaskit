/**
 * In-Memory Storage
 *
 * Provides in-memory data storage for the API generator.
 *
 * @module api-generator/storage
 */

/**
 * Represents a stored record with an ID and arbitrary fields
 */
export interface StorageRecord {
  /** Unique identifier for the record */
  id: string
  /** Additional fields based on noun schema */
  [key: string]: unknown
}

/**
 * In-memory storage implementation for API data
 * Provides CRUD operations for each noun type
 */
export class InMemoryStorage {
  /** Map of noun name to record store */
  private data: Map<string, Map<string, StorageRecord>> = new Map()

  constructor(nouns: string[]) {
    for (const noun of nouns) {
      this.data.set(noun, new Map())
    }
  }

  getStore(noun: string): Map<string, StorageRecord> | undefined {
    return this.data.get(noun)
  }

  create(noun: string, record: StorageRecord): StorageRecord {
    const store = this.data.get(noun)
    if (!store) throw new Error(`Unknown noun: ${noun}`)
    store.set(record.id, record)
    return record
  }

  get(noun: string, id: string): StorageRecord | undefined {
    const store = this.data.get(noun)
    if (!store) return undefined
    return store.get(id)
  }

  update(noun: string, id: string, data: Partial<StorageRecord>): StorageRecord | undefined {
    const store = this.data.get(noun)
    if (!store) return undefined
    const existing = store.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...data, id }
    store.set(id, updated)
    return updated
  }

  delete(noun: string, id: string): boolean {
    const store = this.data.get(noun)
    if (!store) return false
    return store.delete(id)
  }

  list(noun: string, options?: { limit?: number; offset?: number; filter?: Record<string, unknown> }): StorageRecord[] {
    const store = this.data.get(noun)
    if (!store) return []
    let records = Array.from(store.values())

    if (options?.filter) {
      records = records.filter(record => {
        for (const [key, value] of Object.entries(options.filter!)) {
          if (record[key] !== value) return false
        }
        return true
      })
    }

    const offset = options?.offset ?? 0
    const limit = options?.limit ?? records.length
    return records.slice(offset, offset + limit)
  }

  count(noun: string, filter?: Record<string, unknown>): number {
    const store = this.data.get(noun)
    if (!store) return 0
    if (!filter) return store.size
    return this.list(noun, { filter }).length
  }

  has(noun: string, id: string): boolean {
    const store = this.data.get(noun)
    if (!store) return false
    return store.has(id)
  }
}
