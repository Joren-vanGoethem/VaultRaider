import { type QueryClient, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchSecret } from "../../services/azureService";
import type { Secret, SecretBundle } from "../../types/secrets";
import type { ComparedSecret, ComparisonStats, ComparisonStatus } from "./ComparisonTypes";
import { getSecretName } from "./ComparisonTypes";

interface UseCompareSecretsParams {
  sourceSecrets: Secret[];
  targetSecrets: Secret[];
  sourceVaultUri: string;
  targetVaultUri: string;
  queryClient: QueryClient;
}

export function useCompareSecrets({
  sourceSecrets,
  targetSecrets,
  sourceVaultUri,
  targetVaultUri,
  queryClient,
}: UseCompareSecretsParams) {
  // Get all unique secret names from both vaults
  const allSecretNames = useMemo(() => {
    const sourceNames = sourceSecrets.map((s) => getSecretName(s.id));
    const targetNames = targetSecrets.map((s) => getSecretName(s.id));
    return [...new Set([...sourceNames, ...targetNames])].sort();
  }, [sourceSecrets, targetSecrets]);

  // Fetch secret values automatically when target vault is selected
  const secretValueQueries = useQueries({
    queries: targetVaultUri
      ? allSecretNames.flatMap((name) => {
          const queries = [];
          const sourceSecret = sourceSecrets.find((s) => getSecretName(s.id) === name);
          const targetSecret = targetSecrets.find((s) => getSecretName(s.id) === name);

          if (sourceSecret) {
            queries.push({
              queryKey: ["secret", sourceVaultUri, name],
              queryFn: () => fetchSecret(sourceVaultUri, name),
              staleTime: 5 * 60 * 1000,
              meta: { vaultUri: sourceVaultUri, secretName: name },
            });
          }
          if (targetSecret && targetVaultUri) {
            queries.push({
              queryKey: ["secret", targetVaultUri, name],
              queryFn: () => fetchSecret(targetVaultUri, name),
              staleTime: 5 * 60 * 1000,
              meta: { vaultUri: targetVaultUri, secretName: name },
            });
          }
          return queries;
        })
      : [],
  });

  // Track loading states for secret values
  const secretValuesLoading = secretValueQueries.some((q) => q.isLoading);
  const secretValuesLoaded =
    secretValueQueries.length > 0 && secretValueQueries.every((q) => q.isSuccess);
  const secretValuesLoadedCount = secretValueQueries.filter((q) => q.isSuccess).length;
  const secretValuesTotalCount = secretValueQueries.length;

  // Build a list of query keys in the same order as secretValueQueries
  const queryKeys = useMemo(() => {
    if (!targetVaultUri) return [];
    const keys: { vaultUri: string; secretName: string }[] = [];
    for (const name of allSecretNames) {
      const sourceSecret = sourceSecrets.find((s) => getSecretName(s.id) === name);
      const targetSecret = targetSecrets.find((s) => getSecretName(s.id) === name);
      if (sourceSecret) {
        keys.push({ vaultUri: sourceVaultUri, secretName: name });
      }
      if (targetSecret && targetVaultUri) {
        keys.push({ vaultUri: targetVaultUri, secretName: name });
      }
    }
    return keys;
  }, [allSecretNames, sourceSecrets, targetSecrets, sourceVaultUri, targetVaultUri]);

  // Create a map for efficient query result lookup by vault and secret name
  const queryMap = useMemo(() => {
    const map = new Map<string, (typeof secretValueQueries)[0]>();
    for (let i = 0; i < secretValueQueries.length && i < queryKeys.length; i++) {
      const keyInfo = queryKeys[i];
      const key = `${keyInfo.vaultUri}:${keyInfo.secretName}`;
      map.set(key, secretValueQueries[i]);
    }
    return map;
  }, [secretValueQueries, queryKeys]);

  // Build comparison data
  const comparedSecrets = useMemo((): ComparedSecret[] => {
    if (!targetVaultUri) return [];

    return allSecretNames.map((name) => {
      const sourceSecret = sourceSecrets.find((s) => getSecretName(s.id) === name);
      const targetSecret = targetSecrets.find((s) => getSecretName(s.id) === name);

      // Get query results from map
      const sourceQuery = queryMap.get(`${sourceVaultUri}:${name}`);
      const targetQuery = queryMap.get(`${targetVaultUri}:${name}`);

      // Get the actual data from the queries
      const sourceValueData = sourceQuery?.data;
      const targetValueData = targetQuery?.data;

      // A value is "fetched" if the query has completed (success or error)
      // OR if the secret doesn't exist in that vault (no need to fetch)
      const sourceValueFetched =
        !sourceSecret || sourceQuery?.status === "success" || sourceQuery?.status === "error";
      const targetValueFetched =
        !targetSecret || targetQuery?.status === "success" || targetQuery?.status === "error";

      let status: ComparisonStatus;
      if (sourceSecret && !targetSecret) {
        status = "source-only";
      } else if (!sourceSecret && targetSecret) {
        status = "target-only";
      } else if (sourceValueFetched && targetValueFetched && sourceValueData && targetValueData) {
        // Compare values - treat null/undefined as empty string for comparison
        const srcVal = sourceValueData.value ?? "";
        const tgtVal = targetValueData.value ?? "";
        status = srcVal === tgtVal ? "match" : "mismatch";
      } else {
        status = "match"; // Default to match when values aren't loaded yet
      }

      return {
        name,
        status,
        sourceSecret,
        targetSecret,
        sourceValue: sourceValueData?.value,
        targetValue: targetValueData?.value,
        sourceValueFetched,
        targetValueFetched,
      };
    });
  }, [allSecretNames, sourceSecrets, targetSecrets, sourceVaultUri, targetVaultUri, queryMap]);

  // Summary stats
  const stats: ComparisonStats = useMemo(() => {
    return {
      total: comparedSecrets.length,
      matches: comparedSecrets.filter((s) => s.status === "match").length,
      mismatches: comparedSecrets.filter((s) => s.status === "mismatch").length,
      sourceOnly: comparedSecrets.filter((s) => s.status === "source-only").length,
      targetOnly: comparedSecrets.filter((s) => s.status === "target-only").length,
    };
  }, [comparedSecrets]);

  return {
    comparedSecrets,
    stats,
    secretValuesLoading,
    secretValuesLoaded,
    secretValuesLoadedCount,
    secretValuesTotalCount,
  };
}
