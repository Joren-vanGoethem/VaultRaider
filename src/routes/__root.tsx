import {createRootRouteWithContext, Outlet} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/react-router-devtools'
import {ThemeToggle} from '../components/ThemeToggle'
import {NavLink} from '../components/NavLink'
import {UserProfile} from '../components/UserProfile'
import {AuthProvider, useAuth} from '../contexts/AuthContext'
import type {QueryClient} from "@tanstack/react-query";
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'

function Navigation() {
  const {isAuthenticated, userInfo, logout} = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex gap-6">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/vaults">Vaults</NavLink>
            <NavLink to="/secrets">Secrets</NavLink>
            <NavLink to="/about">About</NavLink>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && userInfo && (
              <UserProfile userInfo={userInfo} onLogout={handleLogout}/>
            )}
            <ThemeToggle/>
          </div>
        </nav>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Navigation/>
        <main className="flex-1">
          <Outlet/>
        </main>
        <ReactQueryDevtools/>
        <TanStackRouterDevtools position="bottom-right"/>

      </div>
    </AuthProvider>
  ),
})

