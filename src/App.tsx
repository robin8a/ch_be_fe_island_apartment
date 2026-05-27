import { useState } from 'react'
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import VideoFolderManager from './components/VideoFolderManager'
import VideoPlayer from './components/VideoPlayer'

function TopBar() {
  return (
    <div className="spi-topbar">
      <span className="spi-brand">
        <span className="spi-dot" aria-hidden />
        Island Apartment
      </span>
      <span className="spi-tag">South Padre Island · Texas</span>
      <span className="spi-spacer" />
    </div>
  )
}

function AuthenticatedView() {
  const { signOut, user } = useAuthenticator((context) => [
    context.signOut,
    context.user,
  ])

  return (
    <>
      <TopBar />
      <section
        className="spi-hero"
        style={{ padding: '2.25rem 2rem 3.5rem' }}
      >
        <div className="spi-hero-inner">
          <span className="spi-eyebrow">Staff portal</span>
          <h1 style={{ fontSize: 32 }}>Manage island videos</h1>
          <p>
            Upload and organize tour videos for guests staying at the
            apartment.
          </p>
        </div>
      </section>

      <main className="spi-page">
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ margin: 0, color: 'var(--text)' }}>
            Signed in as{' '}
            <strong style={{ color: 'var(--text-h)' }}>
              {user?.signInDetails?.loginId}
            </strong>
          </p>
          <button
            type="button"
            onClick={signOut}
            style={{
              padding: '0.45rem 1rem',
              background: 'var(--surface)',
              color: 'var(--accent-strong)',
              border: '1px solid var(--accent-border)',
              borderRadius: 999,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Sign Out
          </button>
        </header>

        <VideoFolderManager />
      </main>
    </>
  )
}

function GuestLanding() {
  const [showStaffLogin, setShowStaffLogin] = useState(false)

  return (
    <>
      <TopBar />
      <section className="spi-hero">
        <div className="spi-hero-inner">
          <span className="spi-eyebrow">The Caribbean of Texas</span>
          <h1>Welcome to your island apartment</h1>
          <p>
            Crystal-clear Gulf waters, soft sand and unforgettable sunsets —
            browse the apartment&nbsp;tour videos below and start dreaming of
            your stay.
          </p>
        </div>
      </section>

      <main className="spi-page">
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
              color: 'var(--accent-strong)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              letterSpacing: '0.02em',
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
    </>
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
