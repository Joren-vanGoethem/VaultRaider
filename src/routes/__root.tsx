import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ChevronLeft, ChevronRight, Search, Settings, Shield } from "lucide-react";
import { useState } from "react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ThemeToggle } from "../components/ThemeToggle";
import { UserProfile } from "../components/UserProfile";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ToastProvider } from "../contexts/ToastContext";

function Sidebar() {
  const { isAuthenticated, userInfo, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to login page after logout
      navigate({ to: "/" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside
      className={`sticky top-0 flex-none border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-screen transition-all duration-300 ${isCollapsed ? "w-16" : "w-56"}`}
    >
      {/* Logo and Toggle */}
      <div className="flex-none p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
            VaultRaider
          </p>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 ${isCollapsed ? "mx-auto" : ""}`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links - Scrollable */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {isAuthenticated && (
            <>
              <li>
                <Link
                  to="/subscriptions"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isCollapsed ? "justify-center" : ""}`}
                  activeProps={{
                    className: `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 ${isCollapsed ? "justify-center" : ""}`,
                  }}
                  title={isCollapsed ? "Key Vaults" : ""}
                >
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>Key Vaults</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isCollapsed ? "justify-center" : ""}`}
                  activeProps={{
                    className: `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 ${isCollapsed ? "justify-center" : ""}`,
                  }}
                  title={isCollapsed ? "Global Search" : ""}
                >
                  <Search className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>Global Search</span>}
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Bottom section: Settings, User profile & theme toggle - Fixed at bottom */}
      <div className="flex-none p-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isCollapsed ? "justify-center" : ""}`}
          activeProps={{
            className: `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 ${isCollapsed ? "justify-center" : ""}`,
          }}
          title={isCollapsed ? "Settings" : ""}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
        <ThemeToggle isCollapsed={isCollapsed} />
        {isAuthenticated && userInfo && (
          <UserProfile
            userInfo={userInfo}
            onLogout={handleLogout}
            compact={!isCollapsed}
            isCollapsed={isCollapsed}
          />
        )}
      </div>
    </aside>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => (
    <AuthProvider>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Breadcrumbs />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
          <ReactQueryDevtools />
          <TanStackRouterDevtools position="bottom-right" />
        </div>
      </ToastProvider>
    </AuthProvider>
  ),
});
