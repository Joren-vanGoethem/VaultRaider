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
    <div className="container">
      <h1>Dashboard</h1>
      <div className="card">
        <p>Welcome to your protected dashboard!</p>
        <p>This page is only accessible when you're logged in.</p>
        <p>Try logging out and accessing /dashboard - you'll be redirected to home.</p>
      </div>
    </div>
  )
}

