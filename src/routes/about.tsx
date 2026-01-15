import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader } from '../components/PageHeader'
import { TechBadge } from '../components/TechBadge'
import { LockIcon } from '../components/icons'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <PageHeader>About VaultRaider</PageHeader>

        <div className="card space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
              <LockIcon className="w-8 h-8 text-white" />
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
                <TechBadge name="Tauri" color="orange" />
                <TechBadge name="React" color="blue" />
                <TechBadge name="TanStack Router" color="purple" />
                <TechBadge name="Tailwind CSS" color="cyan" />
                <TechBadge name="TypeScript" color="yellow" />
                <TechBadge name="Rust" color="red" />
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

