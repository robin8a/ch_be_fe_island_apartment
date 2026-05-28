import { useMemo, useState } from 'react'
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
import { useStorageDirectory } from '../hooks/useStorageDirectory'
import { browserStyles as styles } from './storageBrowserStyles'

type PlayableKind = Exclude<MediaKind, 'other'>

type ActiveMedia = {
  name: string
  path: string
  url: string
  kind: PlayableKind
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

export default function MediaBrowser() {
  const [currentPath, setCurrentPath] = useState(BASE_PATH)
  const [active, setActive] = useState<ActiveMedia | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath])
  const { childFolders, files, loading, error, setError, loadDirectory, canGoUp } =
    useStorageDirectory(currentPath)

  const entries = useMemo<MediaEntry[]>(() => {
    return files
      .filter((file) => file.name !== MARKER_FILE)
      .map((file) => ({ ...file, kind: getMediaKind(file.name) as PlayableKind }))
      .filter((entry) => entry.kind !== ('other' as PlayableKind))
  }, [files])

  const navigateTo = (path: string) => {
    setError(null)
    setOpenError(null)
    setActive(null)
    setCurrentPath(path)
  }

  const handleGoUp = () => {
    if (!canGoUp) return
    navigateTo(parentPath(currentPath))
  }

  const handleOpen = async (entry: MediaEntry) => {
    setOpenError(null)
    setOpening(true)
    try {
      const { url } = await getUrl({ path: entry.path })
      setActive({
        name: entry.name,
        path: entry.path,
        url: url.toString(),
        kind: entry.kind,
      })
    } catch (err) {
      console.error('[MediaBrowser] getUrl failed:', err)
      setOpenError(`Could not open "${entry.name}". Please try again.`)
    } finally {
      setOpening(false)
    }
  }

  const locationLabel =
    currentPath === BASE_PATH
      ? 'public/ (root)'
      : currentPath.slice(BASE_PATH.length)

  return (
    <section style={styles.section}>
      <header style={styles.header}>
        <h2 style={{ margin: 0, color: 'var(--text-h)' }}>Media library</h2>
        <button
          type="button"
          onClick={() => void loadDirectory()}
          disabled={loading}
          style={styles.secondaryButton}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {active && (
        <div style={styles.playerWrap}>
          <div style={styles.playerHeader}>
            <p style={styles.playerTitle}>{active.name}</p>
            <button
              type="button"
              onClick={() => setActive(null)}
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

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.browser}>
        <p style={styles.sectionTitle}>
          Browse {loading && <span style={styles.loadingHint}>…</span>}
        </p>

        {childFolders.length === 0 && entries.length === 0 && !loading && (
          <p style={styles.emptyHint}>No folders or media here yet.</p>
        )}

        {childFolders.length > 0 && (
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

        {entries.length > 0 && (
          <div style={{ marginTop: childFolders.length > 0 ? '1rem' : 0 }}>
            <p style={styles.groupLabel}>Files</p>
            <ul style={styles.entryList}>
              {entries.map((entry) => (
                <li key={entry.path}>
                  <button
                    type="button"
                    onClick={() => void handleOpen(entry)}
                    disabled={opening}
                    style={{
                      ...styles.entryButton,
                      ...(active?.path === entry.path
                        ? styles.entryButtonActive
                        : {}),
                    }}
                  >
                    <span style={styles.entryIcon}>{KIND_ICON[entry.kind]}</span>
                    <span style={styles.entryName}>{entry.name}</span>
                    <span style={styles.entryMeta}>
                      {KIND_LABEL[entry.kind]} · {formatBytes(entry.size)}
                      {entry.lastModified &&
                        ` · ${entry.lastModified.toLocaleDateString()}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
