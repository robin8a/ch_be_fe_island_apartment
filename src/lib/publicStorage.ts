export const BASE_PATH = 'public/'
export const MARKER_FILE = '.keep'
export const ROOT_LABEL = 'Public'

export type Breadcrumb = {
  label: string
  path: string
}

export type ChildFolder = {
  name: string
  path: string
}

export type ListedFile = {
  name: string
  path: string
  size?: number
  lastModified?: Date
}

const VIDEO_EXTENSION = /\.(mp4|webm|ogg|mov|m4v|mkv|avi)$/i

export function isVideoFileName(name: string): boolean {
  return VIDEO_EXTENSION.test(name)
}

export function parentPath(path: string): string {
  if (path === BASE_PATH) return BASE_PATH
  const relative = path.slice(BASE_PATH.length).replace(/\/+$/, '')
  const parts = relative.split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `${BASE_PATH}${parts.join('/')}/` : BASE_PATH
}

export function fileNameFromPath(path: string): string {
  return path.replace(/\/+$/, '').split('/').pop() ?? path
}

export function formatBytes(bytes?: number): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function buildBreadcrumbs(path: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ label: ROOT_LABEL, path: BASE_PATH }]
  const relative = path.slice(BASE_PATH.length).replace(/\/+$/, '')
  if (!relative) return crumbs

  const parts = relative.split('/').filter(Boolean)
  let accumulated = BASE_PATH
  for (const part of parts) {
    accumulated = `${accumulated}${part}/`
    crumbs.push({ label: part, path: accumulated })
  }
  return crumbs
}
