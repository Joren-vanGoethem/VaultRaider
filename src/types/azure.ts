export interface Subscription {
  id: string;
  authorizationSource: string;
  managedByTenants: any[];
  subscriptionId: string;
  tenantId: string;
  displayName: string;
  state: string;
  subscriptionPolicies: SubscriptionPolicy
}

export interface SubscriptionPolicy {
  locationPlacementId: string;
  quotaId: string;
  spendingLimit: string;
}

export interface KeyVault {
  id: string;
  name: string;
  location: string;
  properties: {
    vaultUri: string;
  };
}
