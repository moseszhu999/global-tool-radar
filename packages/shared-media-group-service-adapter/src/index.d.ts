export type SharedMediaConsumerDomain = 'tradeos' | 'trainingos' | 'pr-growth' | 'aiexe' | 'other';
export type SharedMediaGroupWorkStatus = 'pending' | 'in_progress' | 'awaiting_human_review' | 'blocked' | 'cancelled';
export type SharedMediaGroupNextAction = 'monitor_render' | 'review_rendered_candidate' | 'inspect_render_failure' | 'none';

export interface SharedMediaGroupAccessContextV1 {
  readonly decisionRef: string;
  readonly consumerOrganizationRef: string;
  readonly readAllowed: boolean;
  readonly decidedAt: string;
}

export interface SharedMediaGroupWorkItemV1 {
  readonly schema: 'shared-media.group-work-item.v1';
  readonly workItemRef: string;
  readonly domain: 'shared-media';
  readonly consumerDomain: SharedMediaConsumerDomain;
  readonly consumerOrganizationRef: string;
  readonly requestId: string;
  readonly jobId: string;
  readonly renderStatus: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  readonly status: SharedMediaGroupWorkStatus;
  readonly reasonCode: string;
  readonly freshness: 'fresh' | 'stale';
  readonly sourceObservedAt: string;
  readonly observedAt: string;
  readonly requiredHumanDecision: boolean;
  readonly nextAction: SharedMediaGroupNextAction;
  readonly terminalEvidence: null | Readonly<Record<string, string | number | boolean>>;
  readonly readOnly: true;
  readonly technicalResultOnly: true;
  readonly humanReviewCompleted: false;
  readonly humanDecisionInferred: false;
  readonly consumerDomainDecisionInferred: false;
  readonly publicationAllowed: false;
  readonly publicationPerformed: false;
  readonly externalActionPerformed: false;
  readonly workItemDigest: string;
}

export interface SharedMediaGroupServiceStatusV1 {
  readonly schema: 'shared-media.group-service-status.v1';
  readonly projectionRef: string;
  readonly accessDecisionRef: string;
  readonly workItem: SharedMediaGroupWorkItemV1;
  readonly readOnly: true;
  readonly technicalResultOnly: true;
  readonly humanReviewCompleted: false;
  readonly humanDecisionInferred: false;
  readonly consumerDomainDecisionInferred: false;
  readonly publicationAllowed: false;
  readonly publicationPerformed: false;
  readonly externalActionPerformed: false;
  readonly projectionDigest: string;
}

export declare const SHARED_MEDIA_GROUP_SERVICE_STATUS_SCHEMA: 'shared-media.group-service-status.v1';
export declare const SHARED_MEDIA_GROUP_WORK_ITEM_SCHEMA: 'shared-media.group-work-item.v1';

export declare function projectMediaRenderResultForGroupService(input: {
  projectionRef: string;
  workItemRef: string;
  accessContext: SharedMediaGroupAccessContextV1;
  consumerDomain: SharedMediaConsumerDomain;
  result: unknown;
  sourceObservedAt: string;
  observedAt: string;
  maxAgeSeconds?: number;
}): SharedMediaGroupServiceStatusV1;
