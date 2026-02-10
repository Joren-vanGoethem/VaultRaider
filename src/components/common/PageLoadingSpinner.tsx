/**
 * Centralized loading spinner for route-level loading states.
 * Use this as pendingComponent in route definitions.
 */
import { LoadingSpinner } from "../LoadingSpinner";

interface PageLoadingSpinnerProps {
  message?: string;
}

export function PageLoadingSpinner({ message }: PageLoadingSpinnerProps) {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <LoadingSpinner size="md" message={message} />
    </div>
  );
}
