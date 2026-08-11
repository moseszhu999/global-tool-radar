import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeAiexeSharedMediaObservationEvidenceV1} from '../src/consumer.mjs';

test('public consumer rejects artifact result identity drift before accepting AIEXE evidence', () => {
  assert.throws(
    () => consumeAiexeSharedMediaObservationEvidenceV1({
      toolName: 'media_get_artifact',
      toolArguments: {artifactId: 'artifact-requested'},
      mcpResult: {
        content: [{type: 'text', text: '{}'}],
        structuredContent: {
          artifact: {
            artifactId: 'artifact-other',
            technicalResultOnly: true,
            humanDecisionInferred: false,
            consumerDomainDecisionInferred: false,
            businessOutcomeInferred: false,
          },
        },
      },
    }),
    /result identity does not match requested artifactId/,
  );
});

test('public consumer rejects job result identity drift before accepting AIEXE evidence', () => {
  assert.throws(
    () => consumeAiexeSharedMediaObservationEvidenceV1({
      toolName: 'media_get_job',
      toolArguments: {jobId: 'job-requested'},
      mcpResult: {
        content: [{type: 'text', text: '{}'}],
        structuredContent: {
          job: {
            jobId: 'job-other',
            technicalResultOnly: true,
            humanDecisionInferred: false,
            consumerDomainDecisionInferred: false,
            businessOutcomeInferred: false,
          },
        },
      },
    }),
    /result identity does not match requested jobId/,
  );
});
