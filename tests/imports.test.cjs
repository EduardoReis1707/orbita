const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  }}).outputText;
  const compiledModule = { exports: {} };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})')((id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === 'zod') return require('zod');
    throw new Error('Unexpected dependency: ' + id);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const cases = [
  ['treinos', 'confirmWorkoutImportAction', { name: 'Treino', date: '2026-09-07', exercises: [{ name: 'Supino', sets: null, weightKg: 0 }] }],
  ['alimentacao', 'confirmMealImportAction', { type: 'OTHER', date: '2026-09-07', items: [{ name: 'Arroz', calories: null, fatG: 0 }] }],
  ['medidas', 'confirmMeasurementImportAction', { date: '2026-09-07', weightKg: 70, waistCm: 80 }],
];
function setup(domain, name, failAt = Infinity) {
  const committed = [], invalidated = [], importOperations = new Map();
  let calls = 0, transactions = 0;
  const prisma = {
    importOperation: {
      async findUnique({ where }) {
        const key = [where.profileId_kind_requestId.profileId, where.profileId_kind_requestId.kind, where.profileId_kind_requestId.requestId].join(':');
        return importOperations.get(key) ?? null;
      },
    },
    async $transaction(callback) {
    transactions++;
    const pending = [];
    const write = async (args) => {
      if (++calls === failAt) throw new Error('synthetic database failure');
      pending.push(args);
      return {};
    };
    await callback({ importOperation: { create: write }, workout: { create: write }, meal: { create: write },
      weightEntry: { upsert: write }, measurementEntry: { upsert: write } });
    committed.push(...pending);
    for (const entry of pending) {
      if (!entry.data?.requestId) continue;
      const key = [entry.data.profileId, entry.data.kind, entry.data.requestId].join(':');
      importOperations.set(key, entry.data);
    }
  }};
  const serverAction = load('src/app/(app)/' + domain + '/import-actions.ts', {
    '@/lib/prisma': { prisma }, '@/lib/auth': { requireUser: async () => ({ id: 'synthetic-user' }) },
    'next/cache': { revalidatePath: (p) => invalidated.push(p) },
    '@/lib/date': load('src/lib/date.ts', {}),
    '@/lib/workouts': { MUSCLE_GROUPS: [] }, '@/lib/nutrition': { MEAL_TYPE_ORDER: ['OTHER'] },
    '@/lib/import-idempotency': {
      validImportRequestId: (value) => typeof value === 'string' && value.length > 10,
      importPayloadHash: (value) => JSON.stringify(value),
      sameImportPayload: (operation, hash) => operation.payloadHash === hash,
    },
  })[name];
  const requestId = '123e4567-e89b-42d3-a456-426614174000';
  return { action: (items) => serverAction(items, requestId), committed, invalidated, transactions: () => transactions };
}
for (const [domain, name, valid] of cases) {
  test(domain + ': validates entire batch before transaction', async () => {
    for (const bad of [null, { ...valid, date: '2026-02-30' }, { ...valid, date: 123 }]) {
      const h = setup(domain, name);
      assert.equal((await h.action([valid, bad])).status, 'error');
      assert.equal(h.transactions(), 0);
      assert.equal(h.committed.length, 0);
    }
  });
  test(domain + ': rolls back on later write, without invalidation', async () => {
    const h = setup(domain, name, 2);
    await assert.rejects(h.action([valid, valid]), /synthetic database failure/);
    assert.equal(h.transactions(), 1);
    assert.equal(h.committed.length, 0);
    assert.deepEqual(h.invalidated, []);
  });
  test(domain + ': saves valid batch inside one transaction', async () => {
    const h = setup(domain, name);
    assert.equal((await h.action([valid])).status, 'success');
    assert.equal(h.transactions(), 1);
    assert.ok(h.committed.length > 0);
    assert.ok(h.invalidated.length > 0);
  });
}
test('workout and meal nulls remain null; zero remains zero', async () => {
  for (const [domain, name, valid] of cases.slice(0, 2)) {
    const h = setup(domain, name);
    await h.action([valid]);
    const data = h.committed.find((entry) => entry.data.exercises || entry.data.items).data;
    if (domain === 'treinos') {
      assert.equal(data.durationMin, null);
      assert.equal(data.status, 'PLANNED');
      assert.equal(data.exercises.create[0].sets, null);
      assert.equal(data.exercises.create[0].weightKg, 0);
    } else {
      assert.equal(data.items.create[0].calories, null);
      assert.equal(data.items.create[0].fatG, 0);
    }
  }
});
test('measurement patch preserves omitted and null fields', async () => {
  const h = setup('medidas', cases[2][1]);
  await h.action([{ date: '2026-09-07', waistCm: 85, neckCm: null }]);
  const measurement = h.committed.find((entry) => entry.update);
  assert.deepEqual(measurement.update, { waistCm: 85 });
  const existing = { neckCm: 40, chestCm: 100, waistCm: 90 };
  assert.deepEqual({ ...existing, ...measurement.update }, { neckCm: 40, chestCm: 100, waistCm: 85 });
});
test('invalid nested objects, numeric types and oversized batches are rejected', async () => {
  for (const [domain, name, valid] of cases) {
    const bad = domain === 'treinos' ? { ...valid, exercises: [null] }
      : domain === 'alimentacao' ? { ...valid, items: [{ name: 'Food', calories: '10' }] }
      : { ...valid, weightKg: NaN };
    for (const batch of [[valid, bad], Array(61).fill(valid)]) {
      const h = setup(domain, name);
      assert.equal((await h.action(batch)).status, 'error');
      assert.equal(h.transactions(), 0);
    }
  }
});


test('workout import preserves mixed reviewed statuses and defaults missing status to planned', async () => {
  const [domain, name, valid] = cases[0];
  const h = setup(domain, name);
  const result = await h.action([
    { ...valid, status: 'COMPLETED' },
    { ...valid, status: 'PLANNED' },
    valid,
  ]);
  assert.equal(result.status, 'success');
  assert.equal(h.transactions(), 1);
  assert.deepEqual(h.committed.filter(record => record.data.status).map(record => record.data.status), ['COMPLETED', 'PLANNED', 'PLANNED']);
});

test('workout import rejects skipped and invalid statuses before any write', async () => {
  const [domain, name, valid] = cases[0];
  for (const status of ['SKIPPED', 'planned', '', null, 1]) {
    const h = setup(domain, name);
    assert.equal((await h.action([valid, { ...valid, status }])).status, 'error');
    assert.equal(h.transactions(), 0);
    assert.equal(h.committed.length, 0);
  }
});

test('a repeated confirmation reuses the saved result without a second transaction', async () => {
  for (const [domain, name, valid] of cases) {
    const h = setup(domain, name);
    const first = await h.action([valid]);
    const second = await h.action([valid]);
    assert.equal(first.status, 'success');
    assert.deepEqual(second, first);
    assert.equal(h.transactions(), 1);
  }
});
