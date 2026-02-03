import { Link, useMatches } from '@tanstack/react-router'
import { ChevronRight, Home, Key, Shield } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  to?: string
  search?: Record<string, unknown>
  icon?: React.ReactNode
}

export function Breadcrumbs() {
  const matches = useMatches()

  // Get the current route info
  const currentPath = matches[matches.length - 1]?.pathname || '/'

  // Build breadcrumb items based on current route
  const breadcrumbs: BreadcrumbItem[] = []

  // Always start with Home
  breadcrumbs.push({
    label: 'Home',
    to: '/',
    icon: <Home className="w-4 h-4" />
  })

  // Check for subscriptions route
  if (currentPath.startsWith('/subscriptions') || currentPath.startsWith('/keyvault')) {
    // Get the subscriptionId from the keyvault route if available
    const keyvaultMatch = matches.find(m => m.pathname === '/keyvault')
    const keyvaultSearchParams = keyvaultMatch?.search as { subscriptionId?: string } | undefined

    breadcrumbs.push({
      label: 'Key Vaults',
      to: '/subscriptions',
      search: keyvaultSearchParams?.subscriptionId ? { subscriptionId: keyvaultSearchParams.subscriptionId } : undefined,
      icon: <Shield className="w-4 h-4" />
    })
  }

  // Check for keyvault route - need to get search params
  if (currentPath.startsWith('/keyvault')) {
    // Get the keyvault search params from the current match
    const keyvaultMatch = matches.find(m => m.pathname === '/keyvault')
    const searchParams = keyvaultMatch?.search as { name?: string; subscriptionId?: string; vaultUri?: string } | undefined

    if (searchParams?.name) {
      breadcrumbs.push({
        label: searchParams.name,
        icon: <Key className="w-4 h-4" />
      })
    }
  }

  // Don't render if only home
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 py-2 px-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1

        return (
          <div key={crumb.label} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
            {isLast ? (
              <span className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                {crumb.icon}
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to!}
                search={crumb.search}
                className="flex items-center gap-1.5 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              >
                {crumb.icon}
                {crumb.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
