import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { getUrl } from 'aws-amplify/storage'
import {
  BASE_PATH,
  MARKER_FILE,
  buildBreadcrumbs,
  formatBytes,
  getMediaKind,
  parentPath,
  type ListedFile,
  type MediaKind,
} from '../lib/publicStorage'
import { getOfflineRecord } from '../lib/offlineMedia'
import { useStorageDirectory } from '../hooks/useStorageDirectory'
import { useOfflineMedia } from '../hooks/useOfflineMedia'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { browserStyles as styles } from './storageBrowserStyles'

type PlayableKind = Exclude<MediaKind, 'other'>
type ViewMode = 'all' | 'offline'

type ActiveMedia = {
  name: string
  path: string
  url: string
  kind: PlayableKind
  objectUrl?: string
}

type MediaEntry = ListedFile & { kind: PlayableKind }

const KIND_ICON: Record<PlayableKind, string> = {
  video: '▶',
  image: '🖼',
  pdf: '📄',
}

const KIND_LABEL: Record<PlayableKind, string> = {
  video: 'Video',
  image: 'Image',
  pdf: 'PDF',
}

function recordToEntry(record: {
  path: string
  name: string
  size?: number
  kind: PlayableKind
}): MediaEntry {
  return {
    path: record.path,
    name: record.name,
    size: record.size,
    kind: record.kind,
  }
}

export default function MediaBrowser() {
  const isOnline = useOnlineStatus()
  const {
    savedPaths,
    offlineRecords,
    savingPath,
    error: offlineError,
    save,
    remove,
    setError: setOfflineError,
  } = useOfflineMedia()

  const [currentPath, setCurrentPath] = useState(BASE_PATH)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [active, setActive] = useState<ActiveMedia | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  const activeObjectUrlRef = useRef<string | null>(null)

  const showOfflineOnly = viewMode === 'offline' || !isOnline

  useEffect(() => {
    if (!isOnline) setViewMode('offline')
  }, [isOnline])

  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath])
  const { childFolders, files, loading, error, setError, loadDirectory, canGoUp } =
    useStorageDirectory(currentPath, { enabled: !showOfflineOnly })

  const entries = useMemo<MediaEntry[]>(() => {
    return files
      .filter((file) => file.name !== MARKER_FILE)
      .map((file) => ({ ...file, kind: getMediaKind(file.name) as PlayableKind }))
      .filter((entry) => entry.kind !== ('other' as PlayableKind))
  }, [files])

  const offlineEntries = useMemo<MediaEntry[]>(
    () => offlineRecords.map((r) => recordToEntry(r)),
    [offlineRecords],
  )

  const displayEntries = showOfflineOnly ? offlineEntries : entries

  const revokeActiveObjectUrl = useCallback(() => {
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current)
      activeObjectUrlRef.current = null
    }
  }, [])

  const clearActive = useCallback(() => {
    revokeActiveObjectUrl()
    setActive(null)
  }, [revokeActiveObjectUrl])

  useEffect(() => () => revokeActiveObjectUrl(), [revokeActiveObjectUrl])

  const navigateTo = (path: string) => {
    setError(null)
    setOpenError(null)
    clearActive()
    setCurrentPath(path)
  }

  const handleGoUp = () => {
    if (!canGoUp) return
    navigateTo(parentPath(currentPath))
  }

  const handleOpen = async (entry: MediaEntry) => {
    setOpenError(null)
    setOpening(true)
    clearActive()

    try {
      const cached = await getOfflineRecord(entry.path)
      if (cached) {
        const objectUrl = URL.createObjectURL(cached.blob)
        activeObjectUrlRef.current = objectUrl
        setActive({
          name: entry.name,
          path: entry.path,
          url: objectUrl,
          kind: entry.kind,
          objectUrl,
        })
        return
      }

      if (!isOnline) {
        setOpenError(
          `"${entry.name}" is not saved on this device. Save it while online to view offline.`,
        )
        return
      }

      const { url } = await getUrl({ path: entry.path })
      setActive({
        name: entry.name,
        path: entry.path,
        url: url.toString(),
        kind: entry.kind,
      })
    } catch (err) {
      console.error('[MediaBrowser] open failed:', err)
      setOpenError(`Could not open "${entry.name}". Please try again.`)
    } finally {
      setOpening(false)
    }
  }

  const handleSaveOffline = async (event: MouseEvent, entry: MediaEntry) => {
    event.stopPropagation()
    if (!isOnline) {
      setOfflineError('Connect to the internet to save new files offline.')
      return
    }
    setOfflineError(null)
    try {
      await save(entry)
    } catch {
      // error state set in hook
    }
  }

  const handleRemoveOffline = async (event: MouseEvent, path: string) => {
    event.stopPropagation()
    setOfflineError(null)
    if (active?.path === path) clearActive()
    try {
      await remove(path)
    } catch {
      // error state set in hook
    }
  }

  const locationLabel =
    currentPath === BASE_PATH
      ? 'public/ (root)'
      : currentPath.slice(BASE_PATH.length)

  const renderEntryRow = (entry: MediaEntry) => {
    const isSaved = savedPaths.has(entry.path)
    const isSaving = savingPath === entry.path

    return (
      <li key={entry.path} style={styles.entryRow}>
        <button
          type="button"
          onClick={() => void handleOpen(entry)}
          disabled={opening}
          style={{
            ...styles.entryButton,
            ...styles.entryRowMain,
            ...(active?.path === entry.path ? styles.entryButtonActive : {}),
          }}
        >
          <span style={styles.entryIcon}>{KIND_ICON[entry.kind]}</span>
          <span style={styles.entryName}>
            {entry.name}
            {isSaved && <span style={styles.offlineBadge}>Offline</span>}
          </span>
          <span style={styles.entryMeta}>
            {KIND_LABEL[entry.kind]} · {formatBytes(entry.size)}
            {entry.lastModified && ` · ${entry.lastModified.toLocaleDateString()}`}
          </span>
        </button>
        {isOnline && !showOfflineOnly && (
          isSaved ? (
            <button
              type="button"
              title="Remove from offline storage"
              disabled={isSaving}
              onClick={(e) => void handleRemoveOffline(e, entry.path)}
              style={styles.savedButton}
            >
              Saved
            </button>
          ) : (
            <button
              type="button"
              title="Save for offline"
              disabled={isSaving}
              onClick={(e) => void handleSaveOffline(e, entry)}
              style={styles.saveButton}
            >
              {isSaving ? '…' : 'Save'}
            </button>
          )
        )}
      </li>
    )
  }

  return (
    <section style={styles.section}>
      <header style={styles.header}>
        <h2 style={{ margin: 0, color: 'var(--text-h)' }}>Media library</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isOnline && (
            <button
              type="button"
              onClick={() => void loadDirectory()}
              disabled={loading || showOfflineOnly}
              style={styles.secondaryButton}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
      </header>

      <div style={styles.offlineToggle} role="tablist" aria-label="Library view">
        <button
          type="button"
          role="tab"
          aria-selected={!showOfflineOnly}
          disabled={!isOnline}
          onClick={() => setViewMode('all')}
          style={{
            ...styles.offlineToggleButton,
            ...(!showOfflineOnly ? styles.offlineToggleButtonActive : {}),
          }}
        >
          All media
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={showOfflineOnly}
          onClick={() => setViewMode('offline')}
          style={{
            ...styles.offlineToggleButton,
            ...(showOfflineOnly ? styles.offlineToggleButtonActive : {}),
          }}
        >
          Saved offline ({offlineRecords.length})
        </button>
      </div>

      {active && (
        <div style={styles.playerWrap}>
          <div style={styles.playerHeader}>
            <p style={styles.playerTitle}>{active.name}</p>
            <button
              type="button"
              onClick={clearActive}
              style={styles.secondaryButton}
            >
              Close preview
            </button>
          </div>

          {active.kind === 'video' && (
            <video
              key={active.path}
              src={active.url}
              controls
              autoPlay
              playsInline
              style={styles.video}
            >
              Your browser does not support HTML5 video.
            </video>
          )}

          {active.kind === 'image' && (
            <img src={active.url} alt={active.name} style={styles.previewImage} />
          )}

          {active.kind === 'pdf' && (
            <>
              <iframe
                key={active.path}
                src={active.url}
                title={active.name}
                style={styles.previewFrame}
              />
              <p style={{ margin: '0.75rem 0 0', color: 'var(--text)' }}>
                Having trouble viewing the PDF?{' '}
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-strong)', fontWeight: 600 }}
                >
                  Open in a new tab
                </a>
                .
              </p>
            </>
          )}
        </div>
      )}

      {openError && <p style={styles.error}>{openError}</p>}
      {offlineError && <p style={styles.error}>{offlineError}</p>}

      {!showOfflineOnly && (
        <>
          <nav aria-label="Folder path" style={styles.breadcrumbs}>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.path} style={styles.breadcrumbItem}>
                {index > 0 && <span style={styles.breadcrumbSep}>/</span>}
                <button
                  type="button"
                  onClick={() => navigateTo(crumb.path)}
                  disabled={crumb.path === currentPath}
                  style={{
                    ...styles.breadcrumbButton,
                    ...(crumb.path === currentPath
                      ? styles.breadcrumbButtonCurrent
                      : {}),
                  }}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>

          <div style={styles.toolbar}>
            {canGoUp && (
              <button type="button" onClick={handleGoUp} style={styles.secondaryButton}>
                ↑ Up to parent
              </button>
            )}
            <span style={styles.locationHint}>
              Current: <code style={styles.code}>{locationLabel}</code>
            </span>
          </div>
        </>
      )}

      {error && !showOfflineOnly && <p style={styles.error}>{error}</p>}

      <div style={styles.browser}>
        <p style={styles.sectionTitle}>
          {showOfflineOnly ? 'Saved on this device' : 'Browse'}
          {loading && !showOfflineOnly && (
            <span style={styles.loadingHint}> …</span>
          )}
        </p>

        {showOfflineOnly && displayEntries.length === 0 && (
          <p style={styles.emptyHint}>
            No media saved offline yet. While online, open All media and tap Save on
            any file.
          </p>
        )}

        {!showOfflineOnly && childFolders.length === 0 && entries.length === 0 && !loading && (
          <p style={styles.emptyHint}>No folders or media here yet.</p>
        )}

        {!showOfflineOnly && childFolders.length > 0 && (
          <div>
            <p style={styles.groupLabel}>Folders</p>
            <ul style={styles.entryList}>
              {childFolders.map((folder) => (
                <li key={folder.path}>
                  <button
                    type="button"
                    onClick={() => navigateTo(folder.path)}
                    style={styles.entryButton}
                  >
                    <span style={styles.entryIcon}>📂</span>
                    <span style={styles.entryName}>{folder.name}</span>
                    <span style={styles.entryMeta}>Open →</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {displayEntries.length > 0 && (
          <div style={{ marginTop: !showOfflineOnly && childFolders.length > 0 ? '1rem' : 0 }}>
            <p style={styles.groupLabel}>Files</p>
            <ul style={styles.entryList}>{displayEntries.map(renderEntryRow)}</ul>
          </div>
        )}
      </div>
    </section>
  )
}
