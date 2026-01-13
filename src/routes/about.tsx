import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="container">
      <h1>About VaultRaider</h1>
      <div className="card">
        <p>VaultRaider is a secure Azure Key Vault management application.</p>
        <p>Built with Tauri, React, and TanStack Router.</p>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Link to="/" className="button">
          Go back home
        </Link>
      </div>
    </div>
  )
}

