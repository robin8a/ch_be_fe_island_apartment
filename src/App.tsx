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

function AppBody() {
  const { authStatus, signOut, user } = useAuthenticator((context) => [
    context.authStatus,
    context.signOut,
    context.user,
  ])
  const isAuthenticated = authStatus === 'authenticated'

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

        {isAuthenticated && <VideoFolderManager />}

        <section
          style={{
            marginTop: '2.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          {isAuthenticated ? (
            <div
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
                  padding: '0.5rem 1.1rem',
                  background: 'var(--cta)',
                  color: '#ffffff',
                  border: '1px solid var(--cta)',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  boxShadow:
                    '0 6px 14px -6px rgba(255, 127, 80, 0.6)',
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
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
                  alignSelf: 'flex-start',
                }}
              >
                {showStaffLogin ? 'Hide staff sign in' : 'Staff sign in'}
              </button>
              {showStaffLogin && (
                <div style={{ marginTop: '1rem' }}>
                  <Authenticator />
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  )
}

export default function App() {
  return (
    <Authenticator.Provider>
      <AppBody />
    </Authenticator.Provider>
  )
}
