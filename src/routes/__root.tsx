import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ThemeToggle } from '../components/ThemeToggle'
import { AuthProvider, useAuth } from '../contexts/AuthContext'

function Navigation() {
  const { isAuthenticated, userInfo, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
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
          <div className="flex items-center gap-4">
            {isAuthenticated && userInfo && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                    {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : userInfo.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:inline">{userInfo.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 hover:border-red-600 dark:hover:border-red-400 rounded transition-colors"
                  title="Sign out"
                >
                  Sign Out
                </button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Navigation />
      <Outlet />
      <TanStackRouterDevtools />
    </AuthProvider>
  ),
})

