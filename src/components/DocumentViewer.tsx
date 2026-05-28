import { useMemo, useState } from 'react'
import { getUrl } from 'aws-amplify/storage'
import {
  BASE_PATH,
  buildBreadcrumbs,
  formatBytes,
  isImageFileName,
  isPdfFileName,
  parentPath,
  type ListedFile,
} from '../lib/publicStorage'
import { useStorageDirectory } from '../hooks/useStorageDirectory'
import { browserStyles as styles } from './storageBrowserStyles'

type PreviewDoc = {
  name: string
  path: string
  url: string
  kind: 'image' | 'pdf'
}

function kindFromName(name: string): PreviewDoc['kind'] | null {
  if (isImageFileName(name)) return 'image'
  if (isPdfFileName(name)) return 'pdf'
  return null
}

export default function DocumentViewer() {
  const [currentPath, setCurrentPath] = useState(BASE_PATH)
  const [previewing, setPreviewing] = useState<PreviewDoc | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath])
  const { childFolders, files, loading, error, setError, loadDirectory, canGoUp } =
    useStorageDirectory(currentPath)

  const images = useMemo(
    () =>
      files.filter(
        (file) => isImageFileName(file.name) && file.name !== '.keep',
      ),
    [files],
  )

  const pdfs = useMemo(
    () => files.filter((file) => isPdfFileName(file.name) && file.name !== '.keep'),
    [files],
  )

  const navigateTo = (path: string) => {
    setError(null)
    setPreviewError(null)
    setPreviewing(null)
    setCurrentPath(path)
  }

  const handleGoUp = () => {
    if (!canGoUp) return
    navigateTo(parentPath(currentPath))
  }

  const handlePreview = async (file: ListedFile) => {
    const kind = kindFromName(file.name)
    if (!kind) return

    setPreviewError(null)
    setLoadingPreview(true)
    try {
      const { url } = await getUrl({ path: file.path })
      setPreviewing({
        name: file.name,
        path: file.path,
        url: url.toString(),
        kind,
      })
    } catch (err) {
      console.error('[DocumentViewer] getUrl failed:', err)
      setPreviewError(`Could not open "${file.name}". Please try again.`)
    } finally {
      setLoadingPreview(false)
    }
  }

  const locationLabel =
    currentPath === BASE_PATH
      ? 'public/ (root)'
      : currentPath.slice(BASE_PATH.length)

  return (
    <section style={styles.section}>
      <header style={styles.header}>
        <h2 style={{ margin: 0, color: 'var(--text-h)' }}>Photos & documents</h2>
        <button
          type="button"
          onClick={() => void loadDirectory()}
          disabled={loading}
          style={styles.secondaryButton}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {previewing && (
        <div style={styles.playerWrap}>
          <div style={styles.playerHeader}>
            <p style={styles.playerTitle}>{previewing.name}</p>
            <button
              type="button"
              onClick={() => setPreviewing(null)}
              style={styles.secondaryButton}
            >
              Close preview
            </button>
          </div>
          {previewing.kind === 'image' ? (
            <img
              src={previewing.url}
              alt={previewing.name}
              style={styles.previewImage}
            />
          ) : (
            <>
              <iframe
                key={previewing.path}
                src={previewing.url}
                title={previewing.name}
                style={styles.previewFrame}
              />
              <p style={{ margin: '0.75rem 0 0', color: 'var(--text)' }}>
                Having trouble viewing the PDF?{' '}
                <a
                  href={previewing.url}
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

      {previewError && <p style={styles.error}>{previewError}</p>}

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

        {childFolders.length === 0 &&
          images.length === 0 &&
          pdfs.length === 0 &&
          !loading && <p style={styles.emptyHint}>No folders, photos, or PDFs here yet.</p>}

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

        {images.length > 0 && (
          <div style={{ marginTop: childFolders.length > 0 ? '1rem' : 0 }}>
            <p style={styles.groupLabel}>Images</p>
            <ul style={styles.entryList}>
              {images.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    onClick={() => void handlePreview(file)}
                    disabled={loadingPreview}
                    style={{
                      ...styles.entryButton,
                      ...(previewing?.path === file.path ? styles.entryButtonActive : {}),
                    }}
                  >
                    <span style={styles.entryIcon}>🖼</span>
                    <span style={styles.entryName}>{file.name}</span>
                    <span style={styles.entryMeta}>
                      {formatBytes(file.size)}
                      {file.lastModified && ` · ${file.lastModified.toLocaleDateString()}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pdfs.length > 0 && (
          <div style={{ marginTop: childFolders.length > 0 || images.length > 0 ? '1rem' : 0 }}>
            <p style={styles.groupLabel}>PDFs</p>
            <ul style={styles.entryList}>
              {pdfs.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    onClick={() => void handlePreview(file)}
                    disabled={loadingPreview}
                    style={{
                      ...styles.entryButton,
                      ...(previewing?.path === file.path ? styles.entryButtonActive : {}),
                    }}
                  >
                    <span style={styles.entryIcon}>📄</span>
                    <span style={styles.entryName}>{file.name}</span>
                    <span style={styles.entryMeta}>
                      {formatBytes(file.size)}
                      {file.lastModified && ` · ${file.lastModified.toLocaleDateString()}`}
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

