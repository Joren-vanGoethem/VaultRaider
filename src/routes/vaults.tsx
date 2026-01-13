import { createFileRoute, Link } from '@tanstack/react-router'

// Note: For production use, you can add zod for search param validation
// npm install zod
// import { z } from 'zod'
// Then add: validateSearch: z.object({ filter: z.string().optional(), page: z.number().optional() })

interface SearchParams {
  filter?: string;
  page?: number;
}

export const Route = createFileRoute('/vaults')({
  component: Vaults,
})

function Vaults() {
  // Get search params from URL (e.g., /vaults?filter=production&page=2)
  const searchParams = Route.useSearch() as SearchParams
  const navigate = Route.useNavigate()

  const filter = searchParams.filter || 'all'
  const page = Number(searchParams.page) || 1

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
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-8 gradient-text text-center">
          Azure Key Vaults
        </h1>

        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Filter Vaults
          </h2>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('production')}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === 'production'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Production
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('development')}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === 'development'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Development
            </button>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Filter</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">{filter}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Page</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{page}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Previous
              </span>
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              className="btn-primary flex-1"
            >
              <span className="flex items-center justify-center gap-2">
                Next
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span className="font-semibold">Current URL:</span> /vaults?filter={filter}&page={page}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This demonstrates search params (query parameters) in TanStack Router
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

