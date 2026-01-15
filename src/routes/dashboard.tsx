import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '../components/PageHeader'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { InfoCard } from '../components/InfoCard'
import { CheckCircleIcon, LockIcon } from '../components/icons'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect after loading is complete
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-12">
        <LoadingSpinner message="Checking authentication..." size="lg" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <PageHeader>Dashboard</PageHeader>

        <div className="card space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Welcome to your protected dashboard!
            </h2>
          </div>

          <InfoCard
            variant="blue"
            title="Protected Route"
            description="This page is only accessible when you're logged in."
            icon={<LockIcon />}
          />

          <InfoCard
            variant="purple"
            title="Try This"
            description="Log out and try accessing /dashboard directly - you'll be redirected to home."
            icon={<LockIcon />}
          />
        </div>
      </div>
    </div>
  )
}

