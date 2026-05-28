import { useCallback, useEffect, useState } from 'react'
import { list } from 'aws-amplify/storage'
import {
  BASE_PATH,
  MARKER_FILE,
  fileNameFromPath,
  type ChildFolder,
  type ListedFile,
} from '../lib/publicStorage'

type UseStorageDirectoryOptions = {
  enabled?: boolean
}

export function useStorageDirectory(
  currentPath: string,
  options: UseStorageDirectoryOptions = {},
) {
  const { enabled = true } = options
  const [childFolders, setChildFolders] = useState<ChildFolder[]>([])
  const [files, setFiles] = useState<ListedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDirectory = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const result = await list({
        path: currentPath,
        options: {
          subpathStrategy: { strategy: 'exclude', delimiter: '/' },
          listAll: true,
        },
      })

      const excluded = result.excludedSubpaths ?? []
      const seen = new Set<string>()
      const folders: ChildFolder[] = []

      for (const subpath of excluded) {
        const rest = subpath.startsWith(currentPath)
          ? subpath.slice(currentPath.length)
          : subpath
        const name = rest.replace(/\/+$/, '').split('/').filter(Boolean)[0]
        if (!name || seen.has(name)) continue
        seen.add(name)
        folders.push({
          name,
          path: `${currentPath}${name}/`,
        })
      }
      folders.sort((a, b) => a.name.localeCompare(b.name))

      const listedFiles: ListedFile[] = result.items
        .filter((item) => fileNameFromPath(item.path) !== MARKER_FILE)
        .map((item) => ({
          name: fileNameFromPath(item.path),
          path: item.path,
          size: item.size,
          lastModified: item.lastModified,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      setChildFolders(folders)
      setFiles(listedFiles)
    } catch (err) {
      console.error('[useStorageDirectory] list failed:', err)
      setError('Could not load this folder. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentPath, enabled])

  useEffect(() => {
    if (enabled) void loadDirectory()
  }, [loadDirectory, enabled])

  return {
    childFolders,
    files,
    loading,
    error,
    setError,
    loadDirectory,
    canGoUp: currentPath !== BASE_PATH,
  }
}
