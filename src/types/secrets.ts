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

export interface DeletedSecretItem {
  id: string;
  attributes: SecretAttributes;
  recoveryId?: string;
  deletedDate?: number;
  scheduledPurgeDate?: number;
}

export interface DeletedSecretBundle {
  id: string;
  attributes: SecretAttributes;
  value?: string;
  recoveryId?: string;
  deletedDate?: number;
  scheduledPurgeDate?: number;
}
