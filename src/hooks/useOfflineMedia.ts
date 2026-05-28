import { useCallback, useEffect, useState } from 'react'
import {
  listOfflineMedia,
  removeMediaOffline,
  saveMediaOffline,
  type OfflineRecord,
} from '../lib/offlineMedia'
import type { ListedFile } from '../lib/publicStorage'

export function useOfflineMedia() {
  const [savedPaths, setSavedPaths] = useState<Set<string>>(() => new Set())
  const [offlineRecords, setOfflineRecords] = useState<OfflineRecord[]>([])
  const [savingPath, setSavingPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const records = await listOfflineMedia()
    setOfflineRecords(records)
    setSavedPaths(new Set(records.map((r) => r.path)))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = useCallback(
    async (file: ListedFile) => {
      setError(null)
      setSavingPath(file.path)
      try {
        await saveMediaOffline(file)
        await refresh()
      } catch (err) {
        console.error('[useOfflineMedia] save failed:', err)
        const message = err instanceof Error ? err.message : 'Could not save offline.'
        setError(message)
        throw err
      } finally {
        setSavingPath(null)
      }
    },
    [refresh],
  )

  const remove = useCallback(
    async (path: string) => {
      setError(null)
      try {
        await removeMediaOffline(path)
        await refresh()
      } catch (err) {
        console.error('[useOfflineMedia] remove failed:', err)
        const message = err instanceof Error ? err.message : 'Could not remove offline copy.'
        setError(message)
        throw err
      }
    },
    [refresh],
  )

  return {
    savedPaths,
    offlineRecords,
    savingPath,
    error,
    save,
    remove,
    refresh,
    setError,
  }
}
