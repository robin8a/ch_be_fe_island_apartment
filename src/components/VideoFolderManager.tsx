import { useCallback, useEffect, useState } from 'react'
import { FileUploader } from '@aws-amplify/ui-react-storage'
import { list, uploadData } from 'aws-amplify/storage'

const BASE_PATH = 'public/'
const MARKER_FILE = '.keep'
const ROOT_FOLDER_NAME = 'Public'

const SAFE_FOLDER_NAME = /^[a-zA-Z0-9-_ ]{1,64}$/

type Folder = {
  name: string
  path: string
  isRoot?: boolean
}

const ROOT_FOLDER: Folder = {
  name: ROOT_FOLDER_NAME,
  path: BASE_PATH,
  isRoot: true,
}

export default function VideoFolderManager() {
  const [folders, setFolders] = useState<Folder[]>([ROOT_FOLDER])
  const [selectedFolder, setSelectedFolder] = useState<string>(BASE_PATH)
  const [newFolderName, setNewFolderName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const loadFolders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await list({
        path: BASE_PATH,
        options: {
          subpathStrategy: { strategy: 'exclude', delimiter: '/' },
          listAll: true,
        },
      })

      const excluded = (result as { excludedSubpaths?: string[] })
        .excludedSubpaths ?? []

      const seen = new Set<string>()
      const subfolders: Folder[] = []
      for (const subpath of excluded) {
        const rest = subpath.startsWith(BASE_PATH)
          ? subpath.slice(BASE_PATH.length)
          : subpath
        const folderName = rest.replace(/\/+$/, '')
        if (!folderName || seen.has(folderName)) continue
        seen.add(folderName)
        subfolders.push({
          name: folderName,
          path: `${BASE_PATH}${folderName}/`,
        })
      }
      subfolders.sort((a, b) => a.name.localeCompare(b.name))
      setFolders([ROOT_FOLDER, ...subfolders])
    } catch (err) {
      console.error('[VideoFolderManager] list failed:', err)
      setError('Could not load folders. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

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

    if (
      trimmed.toLowerCase() === ROOT_FOLDER_NAME.toLowerCase() ||
      folders.some((f) => f.name === trimmed)
    ) {
      setError('A folder with that name already exists.')
      return
    }

    const folderPath = `${BASE_PATH}${trimmed}/`
    const markerPath = `${folderPath}${MARKER_FILE}`
    try {
      const uploaded = await uploadData({
        path: markerPath,
        data: new Blob([''], { type: 'text/plain' }),
      }).result
      console.info('[VideoFolderManager] created marker', uploaded.path)
      setInfo(`Folder "${trimmed}" created under public/.`)
      setNewFolderName('')
      setSelectedFolder(folderPath)
      await loadFolders()
    } catch (err) {
      console.error('[VideoFolderManager] upload failed:', err)
      const message =
        err instanceof Error ? err.message : 'Unknown error'
      setError(`Could not create the folder: ${message}`)
    }
  }

  const processFile = async ({ file, key }: { file: File; key: string }) => {
    if (!file.type.startsWith('video/')) {
      throw new Error('Only video files are allowed.')
    }
    return { file, key }
  }

  return (
    <section style={styles.section}>
      <header style={styles.header}>
        <h2 style={{ margin: 0, color: '#111827' }}>Video library</h2>
        <button
          type="button"
          onClick={loadFolders}
          disabled={loading}
          style={styles.secondaryButton}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div style={styles.row}>
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name"
          style={styles.input}
          maxLength={64}
        />
        <button
          type="button"
          onClick={handleCreateFolder}
          disabled={!newFolderName.trim()}
          style={styles.primaryButton}
        >
          Create folder
        </button>
      </div>

      <div>
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#111827' }}>
          Folders
        </p>
        <ul style={styles.folderList}>
          {folders.map((folder) => (
            <li key={folder.path}>
              <button
                type="button"
                onClick={() => setSelectedFolder(folder.path)}
                style={{
                  ...styles.folderButton,
                  ...(selectedFolder === folder.path
                    ? styles.folderButtonActive
                    : {}),
                }}
              >
                <span style={styles.folderIcon}>{folder.isRoot ? '📁' : '📂'}</span>
                <span>
                  {folder.name}
                  {folder.isRoot && (
                    <span style={styles.folderHint}> (public/ root)</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.row}>
        <label
          htmlFor="folder-select"
          style={{ fontWeight: 600, color: '#111827' }}
        >
          Upload to:
        </label>
        <select
          id="folder-select"
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          style={styles.select}
        >
          {folders.map((folder) => (
            <option key={folder.path} value={folder.path}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {info && <p style={styles.info}>{info}</p>}

      <FileUploader
        key={selectedFolder}
        acceptedFileTypes={['video/*']}
        path={selectedFolder}
        maxFileCount={10}
        maxFileSize={5 * 1024 * 1024 * 1024}
        isResumable
        processFile={processFile}
        onUploadSuccess={() => {
          setInfo('Upload completed.')
        }}
        onUploadError={(err) => {
          console.error(err)
          setError('Upload failed. Only video files are allowed.')
        }}
      />
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
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  select: {
    flex: '1 1 200px',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: '0.95rem',
    background: '#ffffff',
    color: '#111827',
  },
  folderList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  folderButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: '#ffffff',
    color: '#111827',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.95rem',
  },
  folderButtonActive: {
    borderColor: '#2563eb',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 600,
  },
  folderIcon: {
    fontSize: '1.1rem',
  },
  folderHint: {
    color: '#4b5563',
    fontWeight: 400,
    fontSize: '0.85rem',
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
