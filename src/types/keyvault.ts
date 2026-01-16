export interface KeyVaultAccess {
  keyVaultUri: string;
  hasAccess: boolean;
  canListSecrets: boolean;
  errorMessage?: string;
}

export interface KeyVault {
  id: string;
  name: string;
  type: string;
  location: string;
  tags: Tags;
  systemData: SystemData;
  properties: Properties;
}

export interface Tags {
  [key: string]: string;
}

export interface SystemData {
  lastModifiedBy: string;
  lastModifiedByType: string;
  lastModifiedAt: string;
}

export interface Properties {
  sku: Sku;
  tenantId: string;
  accessPolicies: AccessPolicy[];
  enabledForDeployment: boolean;
  enabledForDiskEncryption?: boolean;
  enabledForTemplateDeployment?: boolean;
  enableSoftDelete: boolean;
  softDeleteRetentionInDays?: number;
  enableRbacAuthorization: boolean;
  enablePurgeProtection?: boolean;
  vaultUri: string;
  provisioningState: string;
  publicNetworkAccess: string;
}

export interface Sku {
  family: string;
  name: string;
}

export interface AccessPolicy {
  tenantId: string;
  objectId: string;
  permissions: Permissions;
}

export interface Permissions {
  keys?: string[];
  secrets: string[];
  certificates?: string[];
  storage?: string[];
}