const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');

function usageFixture(plan, usage) {
  return loadTs('src/lib/ai/rate-limit.ts', {
    '@prisma/client': { Prisma: { raw: value => value, sql: () => '' } },
    '@/lib/prisma': {
      prisma: {
        profile: { findUnique: async () => ({ subscriptionPlan: plan }) },
        aiUsageWindow: { findUnique: async () => usage },
      },
    },
  });
}

test('guia de uso aplica as cotas do plano gratuito e calcula o próximo reinício', async () => {
  const { getAiUsageStatus } = usageFixture('FREE', {
    textRequests: 3,
    attachmentRequests: 1,
    pdfExports: 2,
  });
  const status = await getAiUsageStatus('owner-a', Date.UTC(2026, 8, 9, 12, 4, 30));
  assert.deepEqual(status.text, { used: 3, limit: 20 });
  assert.deepEqual(status.attachment, { used: 1, limit: 4 });
  assert.deepEqual(status.pdf, { used: 2, limit: 2 });
  assert.equal(status.planLabel, 'Gratuito');
  assert.equal(status.resetsAt, '2026-09-09T12:10:00.000Z');
});

test('guia de uso dá ao plano Pro as cotas ampliadas', async () => {
  const { getAiUsageStatus } = usageFixture('PRO', null);
  const status = await getAiUsageStatus('owner-a', Date.UTC(2026, 8, 9, 12, 0, 0));
  assert.deepEqual(status.text, { used: 0, limit: 60 });
  assert.deepEqual(status.attachment, { used: 0, limit: 12 });
  assert.deepEqual(status.pdf, { used: 0, limit: 12 });
  assert.equal(status.planLabel, 'Pro');
});
