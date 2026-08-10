export const GROUP_WORK_PROVIDER_REQUEST_SCHEMA: "group.work-provider.request.v1";
export const GROUP_WORK_PROVIDER_RESPONSE_SCHEMA: "group.work-provider.response.v1";
export const SHARED_MEDIA_WORK_ITEM_SCHEMA: "shared-media.group-work-item.v1";

export type GroupProviderAccessDecision = "allowed" | "denied" | "unknown";
export type GroupProviderAvailability = "available" | "unavailable" | "unknown";

export interface SharedMediaGroupProviderRequest {
  readonly schema: "group.work-provider.request.v1";
  readonly requestId: string;
  readonly provider: "shared-media";
  readonly consumerDomain: "tradeos";
  readonly consumerOrganizationRef: string;
  readonly purpose: "work_inbox";
  readonly requestedSourceSchemas: readonly ["shared-media.group-work-item.v1"];
  readonly correlation: {
    readonly subjectLinkRef: string;
    readonly organizationLinkRef: string;
    readonly roleContextLinkRef?: string;
    readonly federationStatus: "valid";
    readonly federationFreshness: "fresh";
    readonly federationObservedAt: string;
  };
  readonly requestedAt: string;
  readonly readOnly: true;
  readonly crossDomainAccessPregranted: false;
  readonly persistencePerformed: false;
  readonly externalActionPerformed: false;
}

export interface SharedMediaGroupProviderRenderInput {
  readonly projectionRef: string;
  readonly workItemRef: string;
  readonly result: unknown;
  readonly sourceObservedAt: string;
}

export interface SharedMediaGroupWorkProviderInput {
  readonly request: SharedMediaGroupProviderRequest;
  readonly accessDecision: GroupProviderAccessDecision;
  readonly accessDecisionRef?: string;
  readonly availability: GroupProviderAvailability;
  readonly sourceObservedAt: string;
  readonly observedAt: string;
  readonly provenanceRefs: readonly string[];
  readonly renderResults?: readonly SharedMediaGroupProviderRenderInput[];
  readonly maxAgeSeconds?: number;
}

export interface SharedMediaGroupWorkProviderResponse {
  readonly schema: "group.work-provider.response.v1";
  readonly requestId: string;
  readonly provider: "shared-media";
  readonly consumerOrganizationRef: string;
  readonly accessDecision: GroupProviderAccessDecision;
  readonly accessDecisionRef?: string;
  readonly availability: GroupProviderAvailability;
  readonly freshness: "fresh" | "stale";
  readonly sourceObservedAt: string;
  readonly observedAt: string;
  readonly sourceSchema?: "shared-media.group-work-item.v1";
  readonly workItems: readonly unknown[];
  readonly provenanceRefs: readonly string[];
  readonly readOnly: true;
  readonly providerTruthOwnedExternally: true;
  readonly persistencePerformed: false;
  readonly crossDomainWritePerformed: false;
  readonly authorityGrantCreated: false;
  readonly executionAuthorized: false;
  readonly externalActionPerformed: false;
}

export function buildSharedMediaGroupWorkProviderResponse(
  input: SharedMediaGroupWorkProviderInput,
): SharedMediaGroupWorkProviderResponse;
