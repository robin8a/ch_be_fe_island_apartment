import { useMemo, useState } from 'react'
import { FileUploader } from '@aws-amplify/ui-react-storage'
import { uploadData } from 'aws-amplify/storage'
import {
  BASE_PATH,
  MARKER_FILE,
  buildBreadcrumbs,
  formatBytes,
  parentPath,
} from '../lib/publicStorage'
import { useStorageDirectory } from '../hooks/useStorageDirectory'
import { browserStyles as styles } from './storageBrowserStyles'

const SAFE_FOLDER_NAME = /^[a-zA-Z0-9-_ ]{1,64}$/

export default function VideoFolderManager() {
  const [currentPath, setCurrentPath] = useState(BASE_PATH)
  const [newFolderName, setNewFolderName] = useState('')
  const [info, setInfo] = useState<string | null>(null)

  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath])
  const {
    childFolders,
    files,
    loading,
    error,
    setError,
    loadDirectory,
    canGoUp,
  } = useStorageDirectory(currentPath)

  const navigateTo = (path: string) => {
    setInfo(null)
    setError(null)
    setCurrentPath(path)
  }

  const handleGoUp = () => {
    if (!canGoUp) return
    navigateTo(parentPath(currentPath))
  }

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim()
    setError(null)
    setInfo(null)

    if (!SAFE_FOLDER_NAME.test(trimmed)) {
      setError(
        'Folder name must be 1-64 chars and contain only letters, numbers, spaces, "-" or "_".',
      )
      return
    }

    if (childFolders.some((f) => f.name === trimmed)) {
      setError('A folder with that name already exists here.')
      return
    }

    const folderPath = `${currentPath}${trimmed}/`
    const markerPath = `${folderPath}${MARKER_FILE}`
    try {
      const uploaded = await uploadData({
        path: markerPath,
        data: new Blob([''], { type: 'text/plain' }),
      }).result
      console.info('[VideoFolderManager] created marker', uploaded.path)
      setInfo(`Folder "${trimmed}" created.`)
      setNewFolderName('')
      navigateTo(folderPath)
    } catch (err) {
      console.error('[VideoFolderManager] upload failed:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Could not create the folder: ${message}`)
    }
  }

  const processFile = async ({ file, key }: { file: File; key: string }) => {
    if (!file.type.startsWith('video/')) {
      throw new Error('Only video files are allowed.')
    }
    return { file, key }
  }

  const locationLabel =
    currentPath === BASE_PATH
      ? 'public/ (root)'
      : currentPath.slice(BASE_PATH.length)

  return (
    <section style={styles.section}>
      <header style={styles.header}>
        <h2 style={{ margin: 0, color: 'var(--text-h)' }}>Manage videos</h2>
        <button
          type="button"
          onClick={() => void loadDirectory()}
          disabled={loading}
          style={styles.secondaryButton}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

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
          <button
            type="button"
            onClick={handleGoUp}
            style={styles.secondaryButton}
          >
            ↑ Up to parent
          </button>
        )}
        <span style={styles.locationHint}>
          Current: <code style={styles.code}>{locationLabel}</code>
        </span>
      </div>

      <div style={styles.row}>
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New subfolder name"
          style={styles.input}
          maxLength={64}
        />
        <button
          type="button"
          onClick={() => void handleCreateFolder()}
          disabled={!newFolderName.trim() || loading}
          style={styles.primaryButton}
        >
          Create folder here
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {info && <p style={styles.info}>{info}</p>}

      <div style={styles.browser}>
        <p style={styles.sectionTitle}>
          Contents {loading && <span style={styles.loadingHint}>…</span>}
        </p>

        {childFolders.length === 0 && files.length === 0 && !loading && (
          <p style={styles.emptyHint}>This folder is empty.</p>
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

        {files.length > 0 && (
          <div style={{ marginTop: childFolders.length > 0 ? '1rem' : 0 }}>
            <p style={styles.groupLabel}>Files</p>
            <ul style={styles.entryList}>
              {files.map((file) => (
                <li key={file.path} style={styles.fileRow}>
                  <span style={styles.entryIcon}>🎬</span>
                  <span style={styles.entryName}>{file.name}</span>
                  <span style={styles.entryMeta}>
                    {formatBytes(file.size)}
                    {file.lastModified &&
                      ` · ${file.lastModified.toLocaleDateString()}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <p style={styles.sectionTitle}>Upload videos here</p>
        <FileUploader
          key={currentPath}
          acceptedFileTypes={['video/*']}
          path={currentPath}
          maxFileCount={10}
          maxFileSize={5 * 1024 * 1024 * 1024}
          isResumable
          processFile={processFile}
          onUploadSuccess={() => {
            setInfo('Upload completed.')
            void loadDirectory()
          }}
          onUploadError={(err) => {
            console.error(err)
            setError('Upload failed. Only video files are allowed.')
          }}
        />
      </div>
    </section>
  )
}
