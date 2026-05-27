import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileUploader } from '@aws-amplify/ui-react-storage'
import { list, uploadData } from 'aws-amplify/storage'

const BASE_PATH = 'public/'
const MARKER_FILE = '.keep'
const ROOT_LABEL = 'Public'

const SAFE_FOLDER_NAME = /^[a-zA-Z0-9-_ ]{1,64}$/

type Breadcrumb = {
  label: string
  path: string
}

type ChildFolder = {
  name: string
  path: string
}

type ListedFile = {
  name: string
  path: string
  size?: number
  lastModified?: Date
}

function parentPath(path: string): string {
  if (path === BASE_PATH) return BASE_PATH
  const relative = path.slice(BASE_PATH.length).replace(/\/+$/, '')
  const parts = relative.split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `${BASE_PATH}${parts.join('/')}/` : BASE_PATH
}

function fileNameFromPath(path: string): string {
  return path.replace(/\/+$/, '').split('/').pop() ?? path
}

function formatBytes(bytes?: number): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function buildBreadcrumbs(path: string): Breadcrumb[] {
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

export default function VideoFolderManager() {
  const [currentPath, setCurrentPath] = useState(BASE_PATH)
  const [childFolders, setChildFolders] = useState<ChildFolder[]>([])
  const [files, setFiles] = useState<ListedFile[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath])
  const canGoUp = currentPath !== BASE_PATH

  const loadDirectory = useCallback(async () => {
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
        .filter((item) => {
          const base = fileNameFromPath(item.path)
          return base !== MARKER_FILE
        })
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
      console.error('[VideoFolderManager] list failed:', err)
      setError('Could not load this folder. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentPath])

  useEffect(() => {
    void loadDirectory()
  }, [loadDirectory])

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
        <h2 style={{ margin: 0, color: '#111827' }}>Video library</h2>
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
          onClick={handleCreateFolder}
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

const styles: Record<string, React.CSSProperties> = {
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    marginTop: '2rem',
    background: '#ffffff',
    color: '#111827',
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breadcrumbs: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.15rem',
    padding: '0.5rem 0.75rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
  },
  breadcrumbItem: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  breadcrumbSep: {
    color: '#9ca3af',
    margin: '0 0.2rem',
  },
  breadcrumbButton: {
    padding: '0.2rem 0.35rem',
    border: 'none',
    background: 'transparent',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '0.9rem',
    borderRadius: 4,
  },
  breadcrumbButtonCurrent: {
    color: '#111827',
    fontWeight: 600,
    cursor: 'default',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.75rem',
  },
  locationHint: {
    color: '#4b5563',
    fontSize: '0.9rem',
  },
  code: {
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.85rem',
    background: '#f3f4f6',
    padding: '0.1rem 0.35rem',
    borderRadius: 4,
    color: '#111827',
  },
  row: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    flex: '1 1 200px',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: '0.95rem',
    background: '#ffffff',
    color: '#111827',
  },
  browser: {
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '0.75rem 1rem',
    background: '#fafafa',
    minHeight: 120,
  },
  sectionTitle: {
    margin: '0 0 0.75rem',
    fontWeight: 600,
    color: '#111827',
  },
  groupLabel: {
    margin: '0 0 0.35rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#6b7280',
  },
  entryList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  entryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.55rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: '#ffffff',
    color: '#111827',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.95rem',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.55rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: '#ffffff',
    color: '#111827',
    fontSize: '0.95rem',
  },
  entryIcon: {
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  entryName: {
    flex: 1,
    fontWeight: 500,
    wordBreak: 'break-all',
  },
  entryMeta: {
    color: '#6b7280',
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  emptyHint: {
    margin: 0,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  loadingHint: {
    color: '#9ca3af',
    fontWeight: 400,
  },
  primaryButton: {
    padding: '0.5rem 1rem',
    background: '#2563eb',
    color: '#ffffff',
    border: '1px solid #2563eb',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
  secondaryButton: {
    padding: '0.4rem 0.9rem',
    background: '#ffffff',
    color: '#1f2937',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
  },
  error: {
    color: '#b91c1c',
    margin: 0,
  },
  info: {
    color: '#047857',
    margin: 0,
  },
}
