export interface ResourceGroup {
  id: string;
  location: string;
  managedBy?: string;
  name: string;
  properties: Properties;
  tags: { [key: string]: string };
  type: string
}

export interface Properties {
  provisioningState: string;
}
