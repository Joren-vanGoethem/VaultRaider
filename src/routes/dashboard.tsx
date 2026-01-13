import { createFileRoute, redirect } from '@tanstack/react-router'
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute('/dashboard')({
  // This runs before the component loads
  beforeLoad: async () => {
    try {
      const isAuthenticated = await invoke<boolean>("check_auth");

      if (!isAuthenticated) {
        // Redirect to home if not authenticated
        throw redirect({ to: '/' });
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      throw redirect({ to: '/' });
    }
  },
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <h1 className="text-5xl font-bold mb-8 gradient-text text-center">
          Dashboard
        </h1>

        <div className="card space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Welcome to your protected dashboard!
            </h2>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-3">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Protected Route
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  This page is only accessible when you're logged in.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 space-y-3">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <div>
                <p className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                  Try This
                </p>
                <p className="text-purple-700 dark:text-purple-300">
                  Log out and try accessing /dashboard directly - you'll be redirected to home.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

