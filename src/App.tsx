import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'

// Typed data client for future CRUD (e.g. client.models.Placeholder.list())
const client = generateClient<Schema>()
void client

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main style={{ padding: '2rem' }}>
          <h1>Welcome, {user?.signInDetails?.loginId}</h1>
          <button type="button" onClick={signOut}>
            Sign Out
          </button>
        </main>
      )}
    </Authenticator>
  )
}
