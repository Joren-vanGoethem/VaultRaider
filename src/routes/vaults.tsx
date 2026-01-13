import { createFileRoute, Link } from '@tanstack/react-router'

// Note: For production use, you can add zod for search param validation
// npm install zod
// import { z } from 'zod'
// Then add: validateSearch: z.object({ filter: z.string().optional(), page: z.number().optional() })

export const Route = createFileRoute('/vaults')({
  component: Vaults,
})

function Vaults() {
  // Get search params from URL (e.g., /vaults?filter=production&page=2)
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  const filter = (searchParams as any).filter || 'all'
  const page = Number((searchParams as any).page) || 1

  const handleFilterChange = (newFilter: string) => {
    navigate({
      search: { filter: newFilter, page: 1 }
    })
  }

  const handlePageChange = (newPage: number) => {
    navigate({
      search: { filter, page: newPage }
    })
  }

  return (
    <div className="container">
      <h1>Azure Key Vaults</h1>

      <div className="card">
        <h2>Filter</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => handleFilterChange('all')}
            style={{ background: filter === 'all' ? '#646cff' : '#333' }}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange('production')}
            style={{ background: filter === 'production' ? '#646cff' : '#333' }}
          >
            Production
          </button>
          <button
            onClick={() => handleFilterChange('development')}
            style={{ background: filter === 'development' ? '#646cff' : '#333' }}
          >
            Development
          </button>
        </div>

        <p>Current Filter: <strong>{filter}</strong></p>
        <p>Current Page: <strong>{page}</strong></p>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button onClick={() => handlePageChange(page + 1)}>
            Next
          </button>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#888' }}>
          <p>URL: /vaults?filter={filter}&page={page}</p>
          <p>This demonstrates search params (query parameters) in TanStack Router</p>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Link to="/">← Back to Home</Link>
      </div>
    </div>
  )
}

