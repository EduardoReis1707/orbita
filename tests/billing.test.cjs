const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');

const { formatSubscriptionStatus, planForSubscriptionStatus } = loadTs('src/lib/billing.ts', {
  '@prisma/client': {},
});

test('somente assinaturas ativas ou em teste recebem o plano Pro', () => {
  assert.equal(planForSubscriptionStatus('active'), 'PRO');
  assert.equal(planForSubscriptionStatus('trialing'), 'PRO');
  assert.equal(planForSubscriptionStatus('past_due'), 'FREE');
  assert.equal(planForSubscriptionStatus('canceled'), 'FREE');
});

test('status de cobrança é apresentado em português', () => {
  assert.equal(formatSubscriptionStatus('active'), 'Ativa');
  assert.equal(formatSubscriptionStatus('past_due'), 'Pagamento pendente');
  assert.equal(formatSubscriptionStatus(null), 'Sem assinatura');
});
