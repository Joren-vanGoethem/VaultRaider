import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Clock,
	Filter,
	Info,
	Loader2,
	RefreshCcw,
	Search,
	User,
	XCircle,
} from "lucide-react";
import { Suspense, useCallback, useMemo, useState } from "react";
import { Button, PageError, PageLoadingSpinner, StatusBadge } from "../components/common";
import type { ActivityLogEvent } from "../types/activityLog";
import {
	fetchActivityLogs,
	fetchActivityLogsKey,
	resolveCallers,
	resolveCallersKey,
	type ResolvedCaller,
} from "../services/azureService";
import { requireAuth } from "../utils/routeGuards";

type AuditLogsSearch = {
	vaultId: string;
	name: string;
	vaultUri: string;
	subscriptionId?: string;
	resourceGroup?: string;
};

export const Route = createFileRoute("/audit-logs")({
	component: AuditLogs,
	pendingComponent: PageLoadingSpinner,
	errorComponent: ({ error }) => <PageError error={error} />,
	validateSearch: (search: Record<string, unknown>): AuditLogsSearch => {
		return {
			vaultId: search.vaultId as string,
			name: search.name as string,
			vaultUri: search.vaultUri as string,
			subscriptionId: search.subscriptionId as string | undefined,
			resourceGroup: search.resourceGroup as string | undefined,
		};
	},
	beforeLoad: requireAuth,
});

// ============================================================================
// Helper Utilities
// ============================================================================

function getLevelVariant(level?: string): "success" | "error" | "warning" | "info" | "neutral" {
	switch (level?.toLowerCase()) {
		case "critical":
		case "error":
			return "error";
		case "warning":
			return "warning";
		case "informational":
			return "info";
		default:
			return "neutral";
	}
}

function getResultIcon(resultType?: string) {
	switch (resultType?.toLowerCase()) {
		case "success":
			return <CheckCircle className="w-4 h-4 text-green-500" />;
		case "failure":
		case "failed":
			return <XCircle className="w-4 h-4 text-red-500" />;
		case "start":
			return <Loader2 className="w-4 h-4 text-blue-500" />;
		default:
			return <Info className="w-4 h-4 text-gray-400" />;
	}
}

function getOperationLabel(operationName?: { value?: string; localizedValue?: string }): string {
	if (!operationName) return "Unknown Operation";
	// Prefer localized value, fall back to raw value
	const label = operationName.localizedValue || operationName.value || "Unknown Operation";
	// Strip the provider prefix for readability
	return label.replace(/^Microsoft\.KeyVault\/vaults\//i, "");
}

function formatTimestamp(isoString?: string): string {
	if (!isoString) return "—";
	const date = new Date(isoString);
	return date.toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function formatRelativeTime(isoString?: string): string {
	if (!isoString) return "";
	const date = new Date(isoString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return "";
}

function getCallerDisplay(
	caller?: string,
	callerMap?: Record<string, ResolvedCaller>,
): { display: string; resolved: boolean } {
	if (!caller) return { display: "Unknown", resolved: false };
	// Check if we have a resolved name for this caller
	if (callerMap?.[caller]) {
		const resolved = callerMap[caller];
		const name = resolved.displayName || resolved.userPrincipalName || caller;
		return { display: name, resolved: true };
	}
	// If it looks like an email, return it
	if (caller.includes("@")) return { display: caller, resolved: false };
	// If it's a GUID (service principal), truncate it
	if (/^[0-9a-f-]{36}$/i.test(caller)) return { display: `SP: ${caller.slice(0, 8)}...`, resolved: false };
	return { display: caller, resolved: false };
}

const DAYS_OPTIONS = [
	{ label: "Last 24 Hours", value: 1 },
	{ label: "Last 3 Days", value: 3 },
	{ label: "Last 7 Days", value: 7 },
	{ label: "Last 14 Days", value: 14 },
	{ label: "Last 30 Days", value: 30 },
];

const RESULT_FILTER_OPTIONS = ["All", "Success", "Failure", "Start"] as const;

// ============================================================================
// Event Detail Row (expandable)
// ============================================================================

function EventDetailRow({
	event,
	callerMap,
}: { event: ActivityLogEvent; callerMap: Record<string, ResolvedCaller> }) {
	return (
		<tr>
			<td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					{/* Left column */}
					<div className="space-y-2">
						<div>
							<span className="font-medium text-gray-700 dark:text-gray-300">
								Full Operation:
							</span>
							<span className="ml-2 text-gray-600 dark:text-gray-400 break-all">
								{event.operationName?.value || "—"}
							</span>
						</div>
						{event.caller && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">Caller:</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400 break-all">
									{getCallerDisplay(event.caller, callerMap).display}
								</span>
								{getCallerDisplay(event.caller, callerMap).resolved && (
									<span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-mono">
										({event.caller})
									</span>
								)}
							</div>
						)}
						{event.correlationId && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">
									Correlation ID:
								</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
									{event.correlationId}
								</span>
							</div>
						)}
						{event.operationId && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">
									Operation ID:
								</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
									{event.operationId}
								</span>
							</div>
						)}
						{event.description && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">
									Description:
								</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400">
									{event.description}
								</span>
							</div>
						)}
					</div>

					{/* Right column */}
					<div className="space-y-2">
						{event.authorization?.action && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">
									Action:
								</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400 break-all">
									{event.authorization.action}
								</span>
							</div>
						)}
						{event.httpRequest?.clientIpAddress && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">
									Client IP:
								</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400">
									{event.httpRequest.clientIpAddress}
								</span>
							</div>
						)}
						{event.httpRequest?.method && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">
									HTTP Method:
								</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400">
									{event.httpRequest.method}
								</span>
							</div>
						)}
						{event.status?.localizedValue && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400">
									{event.status.localizedValue}
								</span>
							</div>
						)}
						{event.subStatus?.localizedValue && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">
									Sub-Status:
								</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400">
									{event.subStatus.localizedValue}
								</span>
							</div>
						)}
						{event.resultSignature && (
							<div>
								<span className="font-medium text-gray-700 dark:text-gray-300">
									Result:
								</span>
								<span className="ml-2 text-gray-600 dark:text-gray-400">
									{event.resultSignature}
								</span>
							</div>
						)}
					</div>
				</div>
			</td>
		</tr>
	);
}

// ============================================================================
// Main Component
// ============================================================================

function AuditLogs() {
	const { vaultId, name, vaultUri, subscriptionId, resourceGroup } = Route.useSearch();
	const [days, setDays] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const [resultFilter, setResultFilter] = useState<string>("All");
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	const {
		data: events = [],
		isLoading,
		isError,
		error,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: [fetchActivityLogsKey, vaultId, days],
		queryFn: () => fetchActivityLogs(vaultId, days),
	});

	// Extract unique GUID callers for resolution
	const uniqueCallerGuids = useMemo(() => {
		const guids = new Set<string>();
		for (const event of events) {
			if (event.caller && /^[0-9a-f-]{36}$/i.test(event.caller)) {
				guids.add(event.caller);
			}
		}
		return [...guids];
	}, [events]);

	// Resolve caller GUIDs to display names via Microsoft Graph
	const { data: callerMap = {} } = useQuery({
		queryKey: [resolveCallersKey, ...uniqueCallerGuids],
		queryFn: () => resolveCallers(uniqueCallerGuids),
		enabled: uniqueCallerGuids.length > 0,
		staleTime: 5 * 60 * 1000, // cache for 5 minutes
	});

	const toggleRow = useCallback((eventId: string) => {
		setExpandedRows((prev) => {
			const next = new Set(prev);
			if (next.has(eventId)) {
				next.delete(eventId);
			} else {
				next.add(eventId);
			}
			return next;
		});
	}, []);

	// Filter events
	const filteredEvents = useMemo(() => {
		return events.filter((event) => {
			// Result filter
			if (resultFilter !== "All") {
				const rt = event.resultType?.toLowerCase() || "";
				if (resultFilter === "Failure") {
					if (rt !== "failure" && rt !== "failed") return false;
				} else if (rt !== resultFilter.toLowerCase()) {
					return false;
				}
			}

			// Search filter
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				const opName = (event.operationName?.localizedValue || event.operationName?.value || "").toLowerCase();
				const caller = (event.caller || "").toLowerCase();
				const desc = (event.description || "").toLowerCase();
				const status = (event.status?.localizedValue || "").toLowerCase();
				const action = (event.authorization?.action || "").toLowerCase();

				return (
					opName.includes(q) ||
					caller.includes(q) ||
					desc.includes(q) ||
					status.includes(q) ||
					action.includes(q)
				);
			}

			return true;
		});
	}, [events, resultFilter, searchQuery]);

	// Stats
	const stats = useMemo(() => {
		const succeeded = events.filter((e) => e.resultType?.toLowerCase() === "success").length;
		const failed = events.filter((e) => {
			const rt = e.resultType?.toLowerCase();
			return rt === "failure" || rt === "failed";
		}).length;
		const other = events.length - succeeded - failed;
		return { total: events.length, succeeded, failed, other };
	}, [events]);

	return (
		<Suspense fallback={<PageLoadingSpinner />}>
			<div className="h-full flex flex-col">
				{/* Header */}
				<div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
						<div className="flex items-center gap-3 min-w-0">
							<Link
								to="/keyvault"
								search={{ vaultUri, name, subscriptionId, resourceGroup }}
								className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
								title="Back to vault"
							>
								<ArrowLeft className="w-5 h-5" />
							</Link>
							<div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
								<Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
							</div>
							<div className="min-w-0">
								<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
									Audit Logs
								</h1>
								<p className="text-sm text-gray-500 dark:text-gray-400">{name}</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2 shrink-0">
							{/* Days selector */}
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-gray-500" />
								<select
									value={days}
									onChange={(e) => setDays(Number(e.target.value))}
									className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
								>
									{DAYS_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>

							<Button
								variant="secondary"
								size="sm"
								onClick={() => refetch()}
								disabled={isFetching}
								leftIcon={
									<RefreshCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
								}
							>
								Refresh
							</Button>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto p-6">
					{/* Stats Cards */}
					{!isLoading && !isError && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
							<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
								<div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
									{stats.total}
								</div>
								<div className="text-sm text-gray-500 dark:text-gray-400">Total Events</div>
							</div>
							<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">
									{stats.succeeded}
								</div>
								<div className="text-sm text-gray-500 dark:text-gray-400">Succeeded</div>
							</div>
							<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
								<div className="text-2xl font-bold text-red-600 dark:text-red-400">
									{stats.failed}
								</div>
								<div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
							</div>
							<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
								<div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
									{stats.other}
								</div>
								<div className="text-sm text-gray-500 dark:text-gray-400">Other</div>
							</div>
						</div>
					)}

					{/* Search and Filters */}
					<div className="flex flex-col sm:flex-row gap-3 mb-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								type="text"
								placeholder="Search operations, callers, descriptions..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Filter className="w-4 h-4 text-gray-500" />
							{RESULT_FILTER_OPTIONS.map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => setResultFilter(option)}
									className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
										resultFilter === option
											? "bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
											: "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
									}`}
								>
									{option}
								</button>
							))}
						</div>
					</div>

					{/* Results count */}
					{!isLoading && (
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
							Showing {filteredEvents.length} of {events.length} events
						</p>
					)}

					{/* Loading State */}
					{isLoading && (
						<div className="flex flex-col items-center justify-center py-16 gap-3">
							<Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
							<p className="text-gray-500 dark:text-gray-400">Loading audit logs...</p>
						</div>
					)}

					{/* Error State */}
					{isError && (
						<div className="flex flex-col items-center justify-center py-16 gap-3">
							<AlertCircle className="w-8 h-8 text-red-500" />
							<p className="text-red-600 dark:text-red-400 font-medium">
								Failed to load audit logs
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400 max-w-md text-center">
								{error instanceof Error ? error.message : String(error)}
							</p>
							<Button variant="secondary" size="sm" onClick={() => refetch()}>
								Try Again
							</Button>
						</div>
					)}

					{/* Empty State */}
					{!isLoading && !isError && events.length === 0 && (
						<div className="flex flex-col items-center justify-center py-16 gap-3">
							<Clock className="w-12 h-12 text-gray-300 dark:text-gray-600" />
							<p className="text-gray-500 dark:text-gray-400 font-medium">
								No audit log events found
							</p>
							<p className="text-sm text-gray-400 dark:text-gray-500">
								Try increasing the time range to see more events.
							</p>
						</div>
					)}

					{/* No filtered results */}
					{!isLoading && !isError && events.length > 0 && filteredEvents.length === 0 && (
						<div className="flex flex-col items-center justify-center py-16 gap-3">
							<Search className="w-12 h-12 text-gray-300 dark:text-gray-600" />
							<p className="text-gray-500 dark:text-gray-400 font-medium">
								No events match your filters
							</p>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => {
									setSearchQuery("");
									setResultFilter("All");
								}}
							>
								Clear Filters
							</Button>
						</div>
					)}

					{/* Events Table */}
					{!isLoading && !isError && filteredEvents.length > 0 && (
						<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full min-w-[800px]">
									<thead>
										<tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10" />
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
												Operation
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
												Result
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
												Level
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-70">
												Caller
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-52">
												Time
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
										{filteredEvents.map((event) => {
											const eventKey =
												event.eventDataId || event.operationId || event.correlationId || Math.random().toString();
											const isExpanded = expandedRows.has(eventKey);

											return (
												<>
													<tr
														key={eventKey}
														className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
														onClick={() => toggleRow(eventKey)}
													>
														<td className="px-4 py-3 text-gray-400">
															{isExpanded ? (
																<ChevronUp className="w-4 h-4" />
															) : (
																<ChevronDown className="w-4 h-4" />
															)}
														</td>
														<td className="px-4 py-3">
															<div className="flex items-center gap-2">
																{getResultIcon(event.resultType)}
																<span className="text-sm font-medium text-gray-900 dark:text-gray-100">
																	{getOperationLabel(event.operationName)}
																</span>
															</div>
														</td>
														<td className="px-4 py-3">
															<StatusBadge
																variant={
																	event.resultType?.toLowerCase() === "success"
																		? "success"
																		: event.resultType?.toLowerCase() === "failure" ||
																			  event.resultType?.toLowerCase() === "failed"
																			? "error"
																			: "neutral"
																}
															>
																{event.resultType || "—"}
															</StatusBadge>
														</td>
														<td className="px-4 py-3">
															<StatusBadge variant={getLevelVariant(event.level)}>
																{event.level || "—"}
															</StatusBadge>
														</td>
														<td className="px-4 py-3">
															<div className="flex items-center gap-1.5">
																<User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
																<span
																	className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[275px]"
																	title={event.caller || "Unknown"}
																>
																	{getCallerDisplay(event.caller, callerMap).display}
																</span>
																{getCallerDisplay(event.caller, callerMap).resolved && (
																	<span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
																		{callerMap[event.caller!]?.callerType === "user" ? "User" : "SP"}
																	</span>
																)}
															</div>
														</td>
														<td className="px-4 py-3">
															<div className="text-sm text-gray-600 dark:text-gray-400">
																{formatTimestamp(event.eventTimestamp)}
															</div>
															{formatRelativeTime(event.eventTimestamp) && (
																<div className="text-xs text-gray-400 dark:text-gray-500">
																	{formatRelativeTime(event.eventTimestamp)}
																</div>
															)}
														</td>
													</tr>
													{isExpanded && (
														<EventDetailRow key={`${eventKey}-detail`} event={event} callerMap={callerMap} />
													)}
												</>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			</div>
		</Suspense>
	);
}
