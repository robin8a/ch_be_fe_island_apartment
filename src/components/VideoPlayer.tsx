import { useMemo, useState } from 'react'
import { getUrl } from 'aws-amplify/storage'
import {
  BASE_PATH,
  buildBreadcrumbs,
  formatBytes,
  isVideoFileName,
  parentPath,
  type ListedFile,
} from '../lib/publicStorage'
import { useStorageDirectory } from '../hooks/useStorageDirectory'
import { browserStyles as styles } from './storageBrowserStyles'

type PlayingVideo = {
  name: string
  path: string
  url: string
}

export default function VideoPlayer() {
  const [currentPath, setCurrentPath] = useState(BASE_PATH)
  const [playing, setPlaying] = useState<PlayingVideo | null>(null)
  const [playError, setPlayError] = useState<string | null>(null)
  const [loadingPlay, setLoadingPlay] = useState(false)

  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath])
  const { childFolders, files, loading, error, setError, loadDirectory, canGoUp } =
    useStorageDirectory(currentPath)

  const videos = useMemo(
    () => files.filter((file) => isVideoFileName(file.name)),
    [files],
  )

  const navigateTo = (path: string) => {
    setError(null)
    setPlayError(null)
    setPlaying(null)
    setCurrentPath(path)
  }

  const handleGoUp = () => {
    if (!canGoUp) return
    navigateTo(parentPath(currentPath))
  }

  const handlePlay = async (file: ListedFile) => {
    setPlayError(null)
    setLoadingPlay(true)
    try {
      const { url } = await getUrl({ path: file.path })
      setPlaying({
        name: file.name,
        path: file.path,
        url: url.toString(),
      })
    } catch (err) {
      console.error('[VideoPlayer] getUrl failed:', err)
      setPlayError(`Could not play "${file.name}". Please try again.`)
    } finally {
      setLoadingPlay(false)
    }
  }

  const locationLabel =
    currentPath === BASE_PATH
      ? 'public/ (root)'
      : currentPath.slice(BASE_PATH.length)

  return (
    <section style={styles.section}>
      <header style={styles.header}>
        <h2 style={{ margin: 0, color: 'var(--text-h)' }}>Video library</h2>
        <button
          type="button"
          onClick={() => void loadDirectory()}
          disabled={loading}
          style={styles.secondaryButton}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {playing && (
        <div style={styles.playerWrap}>
          <div style={styles.playerHeader}>
            <p style={styles.playerTitle}>{playing.name}</p>
            <button
              type="button"
              onClick={() => setPlaying(null)}
              style={styles.secondaryButton}
            >
              Close player
            </button>
          </div>
          <video
            key={playing.path}
            src={playing.url}
            controls
            autoPlay
            playsInline
            style={styles.video}
          >
            Your browser does not support HTML5 video.
          </video>
        </div>
      )}

      {playError && <p style={styles.error}>{playError}</p>}

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

        {childFolders.length === 0 && videos.length === 0 && !loading && (
          <p style={styles.emptyHint}>No folders or videos here yet.</p>
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

        {videos.length > 0 && (
          <div style={{ marginTop: childFolders.length > 0 ? '1rem' : 0 }}>
            <p style={styles.groupLabel}>Videos</p>
            <ul style={styles.entryList}>
              {videos.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    onClick={() => void handlePlay(file)}
                    disabled={loadingPlay}
                    style={{
                      ...styles.entryButton,
                      ...(playing?.path === file.path
                        ? styles.entryButtonActive
                        : {}),
                    }}
                  >
                    <span style={styles.entryIcon}>▶</span>
                    <span style={styles.entryName}>{file.name}</span>
                    <span style={styles.entryMeta}>
                      {formatBytes(file.size)}
                      {file.lastModified &&
                        ` · ${file.lastModified.toLocaleDateString()}`}
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
