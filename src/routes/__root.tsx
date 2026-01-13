import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ThemeToggle } from '../components/ThemeToggle'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex gap-6">
              <Link
                to="/"
                className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-medium"
                activeProps={{
                  className: "text-primary-500 dark:text-primary-400 font-bold underline underline-offset-4"
                }}
              >
                Home
              </Link>
              <Link
                to="/dashboard"
                className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-medium"
                activeProps={{
                  className: "text-primary-500 dark:text-primary-400 font-bold underline underline-offset-4"
                }}
              >
                Dashboard
              </Link>
              <Link
                to="/vaults"
                className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-medium"
                activeProps={{
                  className: "text-primary-500 dark:text-primary-400 font-bold underline underline-offset-4"
                }}
              >
                Vaults
              </Link>
              <Link
                to="/about"
                className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-medium"
                activeProps={{
                  className: "text-primary-500 dark:text-primary-400 font-bold underline underline-offset-4"
                }}
              >
                About
              </Link>
            </div>
            <ThemeToggle />
          </nav>
        </div>
      </div>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})

