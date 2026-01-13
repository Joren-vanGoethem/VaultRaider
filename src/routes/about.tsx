import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="text-5xl font-bold mb-8 gradient-text text-center">
          About VaultRaider
        </h1>

        <div className="card space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Secure Vault Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Professional Azure Key Vault client
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              VaultRaider is a secure Azure Key Vault management application designed to help you manage your secrets, keys, and certificates with ease.
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 space-y-3">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Built With</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Tauri</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">React</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">TanStack Router</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Tailwind CSS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">TypeScript</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Rust</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="btn-primary inline-block"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}

