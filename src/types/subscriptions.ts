export interface Subscription {
  id: string;
  authorizationSource: string;
  // biome-ignore lint/suspicious/noExplicitAny: not interested in this type
  managedByTenants: any[];
  subscriptionId: string;
  tenantId: string;
  displayName: string;
  state: string;
  subscriptionPolicies: SubscriptionPolicy;
}

export interface SubscriptionPolicy {
  locationPlacementId: string;
  quotaId: string;
  spendingLimit: string;
}
