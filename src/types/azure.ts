export interface Subscription {
  id: string;
  subscription_id: string;
  display_name: string;
  state: string;
}

export interface KeyVault {
  id: string;
  name: string;
  location: string;
  properties: {
    vaultUri: string;
  };
}
