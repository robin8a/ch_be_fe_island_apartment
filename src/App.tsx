import { useState } from 'react'
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import VideoFolderManager from './components/VideoFolderManager'
import VideoPlayer from './components/VideoPlayer'

function AuthenticatedView() {
  const { signOut, user } = useAuthenticator((context) => [
    context.signOut,
    context.user,
  ])

  return (
    <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto', width: '100%' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ margin: 0, color: 'var(--text-h)', fontSize: '1.75rem' }}>
          Staff — {user?.signInDetails?.loginId}
        </h1>
        <button
          type="button"
          onClick={signOut}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg)',
            color: 'var(--text-h)',
            border: '1px solid var(--border)',
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
  )
}

function GuestLanding() {
  const [showStaffLogin, setShowStaffLogin] = useState(false)

  return (
    <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)', fontSize: '2rem' }}>
          Island Apartment Videos
        </h1>
        <p style={{ margin: 0, color: 'var(--text)' }}>
          Browse folders and play videos — no sign-in required.
        </p>
      </header>

      <VideoPlayer />

      <section
        style={{
          marginTop: '2.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          textAlign: 'left',
        }}
      >
        <button
          type="button"
          onClick={() => setShowStaffLogin((open) => !open)}
          style={{
            padding: '0.4rem 0',
            border: 'none',
            background: 'transparent',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.95rem',
          }}
        >
          {showStaffLogin ? 'Hide staff sign in' : 'Staff sign in'}
        </button>
        {showStaffLogin && (
          <div style={{ marginTop: '1rem' }}>
            <Authenticator />
          </div>
        )}
      </section>
    </main>
  )
}

function AppBody() {
  const authStatus = useAuthenticator((context) => [context.authStatus])[0]

  if (authStatus === 'authenticated') {
    return <AuthenticatedView />
  }

  return <GuestLanding />
}

export default function App() {
  return (
    <Authenticator.Provider>
      <AppBody />
    </Authenticator.Provider>
  )
}
