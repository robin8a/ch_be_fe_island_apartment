import { Authenticator } from '@aws-amplify/ui-react'
import { FileUploader } from '@aws-amplify/ui-react-storage'
import '@aws-amplify/ui-react/styles.css'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'

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

          <section style={{ marginTop: '2rem' }}>
            <h2>Upload a file</h2>
            <FileUploader
              acceptedFileTypes={['image/*', 'application/pdf']}
              path={({ identityId }) => `private/${identityId}/`}
              maxFileCount={5}
              isResumable
            />
          </section>
        </main>
      )}
    </Authenticator>
  )
}
