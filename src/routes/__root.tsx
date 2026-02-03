import {createRootRouteWithContext, Outlet, Link} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/react-router-devtools'
import {ThemeToggle} from '../components/ThemeToggle'
import {UserProfile} from '../components/UserProfile'
import {AuthProvider, useAuth} from '../contexts/AuthContext'
import {ToastProvider} from '../contexts/ToastContext'
import {Breadcrumbs} from '../components/Breadcrumbs'
import type {QueryClient} from "@tanstack/react-query";
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {Shield, Home} from 'lucide-react'

function Sidebar() {
  const {isAuthenticated, userInfo, logout} = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <aside className="flex-none w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link to="/" className="text-lg font-bold text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
          VaultRaider
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          <li>
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              activeProps={{
                className: "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              }}
              activeOptions={{ exact: true }}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </li>
          {isAuthenticated && (
            <li>
              <Link
                to="/subscriptions"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                activeProps={{
                  className: "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                }}
              >
                <Shield className="w-4 h-4" />
                Key Vaults
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Bottom section: User profile & theme toggle */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <ThemeToggle />
        {isAuthenticated && userInfo && (
          <UserProfile userInfo={userInfo} onLogout={handleLogout} compact />
        )}
      </div>
    </aside>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => (
    <AuthProvider>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar/>
          <div className="flex-1 flex flex-col min-w-0">
            <Breadcrumbs />
            <main className="flex-1 overflow-auto">
              <Outlet/>
            </main>
          </div>
          <ReactQueryDevtools/>
          <TanStackRouterDevtools position="bottom-right"/>
        </div>
      </ToastProvider>
    </AuthProvider>
  ),
})

