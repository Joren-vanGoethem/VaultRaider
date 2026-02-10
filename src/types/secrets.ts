export interface Secret {
  id: string;
  attributes: SecretAttributes;
}

export interface SecretBundle extends Secret {
  value: string;
}

export interface SecretAttributes {
  enabled: boolean;
  created: number;
  updated: number;
  recoveryLevel: string;
  recoverableDays: number;
}
