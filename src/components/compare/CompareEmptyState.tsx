import { GitCompareIcon } from "lucide-react";
import { EmptyState } from "../common";

interface CompareEmptyStateProps {
  sourceName: string;
}

export function CompareEmptyState({ sourceName }: CompareEmptyStateProps) {
  return (
    <EmptyState
      icon={<GitCompareIcon className="w-12 h-12" />}
      title="Select a target vault to compare"
      description={`Choose a subscription and key vault above to compare secrets with ${sourceName}`}
    />
  );
}
