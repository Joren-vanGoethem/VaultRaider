import type { Secret } from "../../types/secrets";

export type ComparisonStatus = "match" | "mismatch" | "source-only" | "target-only";

export interface ComparedSecret {
  name: string;
  status: ComparisonStatus;
  sourceSecret?: Secret;
  targetSecret?: Secret;
  sourceValue?: string | null;
  targetValue?: string | null;
  sourceValueFetched: boolean;
  targetValueFetched: boolean;
}

export interface ComparisonStats {
  total: number;
  matches: number;
  mismatches: number;
  sourceOnly: number;
  targetOnly: number;
}

export interface CompareSearch {
  sourceVaultUri: string;
  sourceName: string;
  targetVaultUri?: string;
  targetName?: string;
  sourceSubscriptionId?: string;
  targetSubscriptionId?: string;
}

// Helper function to extract secret name from ID
export function getSecretName(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1];
}
