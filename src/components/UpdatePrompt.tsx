import { useRegisterSW } from 'virtual:pwa-register/react'
import { browserStyles as styles } from './storageBrowserStyles'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div style={styles.updatePrompt} role="status" aria-live="polite">
      <p style={styles.updatePromptText}>A new version is available.</p>
      <div style={styles.updatePromptActions}>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => void updateServiceWorker(true)}
        >
          Reload
        </button>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
      </div>
    </div>
  )
}
