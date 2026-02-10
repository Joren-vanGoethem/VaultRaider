import type { ComparisonStats, ComparisonStatus } from "./ComparisonTypes";

interface ComparisonStatsProps {
  stats: ComparisonStats;
  statusFilter: ComparisonStatus | "all";
  onFilterChange: (filter: ComparisonStatus | "all") => void;
}

export function ComparisonStatsSection({
  stats,
  statusFilter,
  onFilterChange,
}: ComparisonStatsProps) {
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <button
        type="button"
        onClick={() => onFilterChange("all")}
        className={`text-left rounded-lg p-4 border transition-all ${
          statusFilter === "all"
            ? "bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500 ring-2 ring-gray-400 dark:ring-gray-500"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
      >
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Total Secrets</div>
      </button>
      <button
        type="button"
        onClick={() => onFilterChange(statusFilter === "match" ? "all" : "match")}
        className={`text-left rounded-lg p-4 border transition-all ${
          statusFilter === "match"
            ? "bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 ring-2 ring-green-400 dark:ring-green-600"
            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600"
        }`}
      >
        <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.matches}</div>
        <div className="text-sm text-green-600 dark:text-green-500">Matching</div>
      </button>
      <button
        type="button"
        onClick={() => onFilterChange(statusFilter === "mismatch" ? "all" : "mismatch")}
        className={`text-left rounded-lg p-4 border transition-all ${
          statusFilter === "mismatch"
            ? "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600 ring-2 ring-yellow-400 dark:ring-yellow-600"
            : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600"
        }`}
      >
        <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
          {stats.mismatches}
        </div>
        <div className="text-sm text-yellow-600 dark:text-yellow-500">Different Values</div>
      </button>
      <button
        type="button"
        onClick={() => onFilterChange(statusFilter === "source-only" ? "all" : "source-only")}
        className={`text-left rounded-lg p-4 border transition-all ${
          statusFilter === "source-only"
            ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400 dark:ring-blue-600"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600"
        }`}
      >
        <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
          {stats.sourceOnly}
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-500">Missing in Target</div>
      </button>
      <button
        type="button"
        onClick={() => onFilterChange(statusFilter === "target-only" ? "all" : "target-only")}
        className={`text-left rounded-lg p-4 border transition-all ${
          statusFilter === "target-only"
            ? "bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600 ring-2 ring-purple-400 dark:ring-purple-600"
            : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600"
        }`}
      >
        <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
          {stats.targetOnly}
        </div>
        <div className="text-sm text-purple-600 dark:text-purple-500">Missing in Source</div>
      </button>
    </div>
  );
}
