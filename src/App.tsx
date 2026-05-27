import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import VideoFolderManager from './components/VideoFolderManager'

const client = generateClient<Schema>()
void client

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <h1 style={{ margin: 0, color: '#111827' }}>
              Welcome, {user?.signInDetails?.loginId}
            </h1>
            <button
              type="button"
              onClick={signOut}
              style={{
                padding: '0.5rem 1rem',
                background: '#ffffff',
                color: '#1f2937',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Sign Out
            </button>
          </header>

          <VideoFolderManager />
        </main>
      )}
    </Authenticator>
  )
}
