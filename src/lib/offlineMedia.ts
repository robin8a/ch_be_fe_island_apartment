import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { getUrl } from 'aws-amplify/storage'
import {
  getMediaKind,
  type ListedFile,
  type MediaKind,
} from './publicStorage'

const DB_NAME = 'island-apartment-offline'
const DB_VERSION = 1
const STORE_NAME = 'media'

const LARGE_FILE_BYTES = 100 * 1024 * 1024

export type OfflineRecord = {
  path: string
  name: string
  size?: number
  contentType: string
  savedAt: number
  kind: Exclude<MediaKind, 'other'>
  blob: Blob
}

interface OfflineDB extends DBSchema {
  media: {
    key: string
    value: OfflineRecord
  }
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null
let persistRequested = false

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'path' })
        }
      },
    })
  }
  return dbPromise
}

function contentTypeForFile(name: string): string {
  const kind = getMediaKind(name)
  if (kind === 'video') return 'video/mp4'
  if (kind === 'image') {
    const lower = name.toLowerCase()
    if (lower.endsWith('.png')) return 'image/png'
    if (lower.endsWith('.webp')) return 'image/webp'
    if (lower.endsWith('.gif')) return 'image/gif'
    if (lower.endsWith('.svg')) return 'image/svg+xml'
    if (lower.endsWith('.avif')) return 'image/avif'
    return 'image/jpeg'
  }
  if (kind === 'pdf') return 'application/pdf'
  return 'application/octet-stream'
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (persistRequested || !navigator.storage?.persist) return false
  persistRequested = true
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function estimateOfflineQuota(): Promise<{
  usage?: number
  quota?: number
}> {
  if (!navigator.storage?.estimate) return {}
  const { usage, quota } = await navigator.storage.estimate()
  return { usage, quota }
}

export function formatQuota(usage?: number, quota?: number): string {
  if (usage == null || quota == null) return 'storage usage unknown'
  const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0
  const mb = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${mb(usage)} of ${mb(quota)} used (${pct}%)`
}

export async function listOfflineMedia(): Promise<OfflineRecord[]> {
  const db = await getDb()
  const records = await db.getAll(STORE_NAME)
  return records.sort((a, b) => b.savedAt - a.savedAt)
}

export async function getOfflineRecord(path: string): Promise<OfflineRecord | null> {
  const db = await getDb()
  const record = await db.get(STORE_NAME, path)
  return record ?? null
}

export async function getOfflineObjectUrl(path: string): Promise<string | null> {
  const record = await getOfflineRecord(path)
  if (!record) return null
  return URL.createObjectURL(record.blob)
}

export async function removeMediaOffline(path: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, path)
}

export async function confirmLargeOfflineSave(size?: number): Promise<boolean> {
  if (size == null || size <= LARGE_FILE_BYTES) return true
  const { usage, quota } = await estimateOfflineQuota()
  const message = [
    `This file is ${(size / (1024 * 1024)).toFixed(1)} MB.`,
    'Saving large files may take a while and use significant device storage.',
    formatQuota(usage, quota),
    'Continue?',
  ].join('\n\n')
  return window.confirm(message)
}

export async function saveMediaOffline(file: ListedFile): Promise<void> {
  const kind = getMediaKind(file.name)
  if (kind === 'other') {
    throw new Error('Only videos, images, and PDFs can be saved offline.')
  }

  const ok = await confirmLargeOfflineSave(file.size)
  if (!ok) return

  await requestPersistentStorage()

  const { url } = await getUrl({ path: file.path })
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }

  const blob = await response.blob()
  const contentType =
    blob.type && blob.type !== 'application/octet-stream'
      ? blob.type
      : contentTypeForFile(file.name)

  const record: OfflineRecord = {
    path: file.path,
    name: file.name,
    size: file.size ?? blob.size,
    contentType,
    savedAt: Date.now(),
    kind,
    blob,
  }

  const db = await getDb()
  await db.put(STORE_NAME, record)
}
