/** Activity Log event from Azure Monitor */
export interface ActivityLogEvent {
	authorization?: {
		action?: string;
		scope?: string;
		role?: string;
	};
	resourceId?: string;
	resourceType?: LocalizableString;
	operationName?: LocalizableString;
	category?: LocalizableString;
	level?: string;
	resultType?: string;
	resultSignature?: string;
	eventTimestamp?: string;
	submissionTimestamp?: string;
	caller?: string;
	correlationId?: string;
	operationId?: string;
	description?: string;
	eventDataId?: string;
	status?: LocalizableString;
	subStatus?: LocalizableString;
	claims?: Record<string, unknown>;
	httpRequest?: {
		clientRequestId?: string;
		clientIpAddress?: string;
		method?: string;
		uri?: string;
	};
	properties?: Record<string, unknown>;
	subscriptionId?: string;
	tenantId?: string;
	resourceGroupName?: string;
	resourceProviderName?: LocalizableString;
}

export interface LocalizableString {
	value?: string;
	localizedValue?: string;
}
