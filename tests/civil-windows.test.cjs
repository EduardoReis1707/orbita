const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');
const day = s => new Date(s + 'T00:00:00Z');
const iso = d => d.toISOString().slice(0, 10);
function freeze(t, instant = '2026-09-01T02:30:00Z') {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(instant) });
}
const auth = { requireUser: async () => ({ id: 'synthetic' }), getProfile: async () => ({ fullName: 'Synthetic', heightCm: 170 }) };
function find(node, type) {
  if (Array.isArray(node)) return node.flatMap(n => find(n, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node.props] : []), ...find(node.props?.children, type)];
}
function uiMocks() {
  return {
    '@/lib/auth': auth,
    '@/lib/ai/client': { isAiConfigured: () => false },
    '@/components/ui/tabs': Object.fromEntries(['Tabs','TabsContent','TabsList','TabsTrigger'].map(k => [k,k])),
    '@/components/metrics/stat-card': { StatCard: 'StatCard' },
    './exercise-progression': { ExerciseProgression: 'ExerciseProgression' },
    './workouts-panel': { WorkoutsPanel: 'WorkoutsPanel' },
  };
}
for (const [domain, actionName, value] of [
  ['treinos', 'confirmWorkoutImportAction', { name: 'Test', exercises: [] }],
  ['alimentacao', 'confirmMealImportAction', { items: [{ name: 'Test' }] }],
  ['medidas', 'confirmMeasurementImportAction', { weightKg: 70, waistCm: 80 }],
]) {
  test(domain + ': missing dates use one Sao Paulo civil day for the batch', async t => {
    freeze(t);
    const records = [];
    const write = async args => { records.push(args.data ?? args.create); };
    const prisma = { $transaction: async cb => cb({ workout: { create: write }, meal: { create: write }, weightEntry: { upsert: write }, measurementEntry: { upsert: write } }) };
    const action = loadTs('src/app/(app)/' + domain + '/import-actions.ts', {
      '@/lib/auth': auth, '@/lib/prisma': { prisma }, 'next/cache': { revalidatePath() {} },
    })[actionName];
    assert.equal((await action([value, { ...value, date: null }, { ...value, date: '2026-08-01' }])).status, 'success');
    assert.ok(records.length >= 3);
    assert.equal(records[0].date.toISOString(), '2026-08-31T00:00:00.000Z');
    assert.equal(iso(records.at(-1).date), '2026-08-01');
    for (const record of records) assert.equal(record.date.getUTCHours(), 0);
    if (domain === 'treinos') assert.ok(records.every(r => r.status === 'PLANNED'));
  });
}

test('resolver uses 28 inclusive civil days and excludes future values', async t => {
  freeze(t);
  const dates = ['2026-08-03', '2026-08-04', '2026-08-31', '2026-09-01'].map(day);
  let countArgs;
  const prisma = {
    weightEntry: { findFirst: async ({ where }) => { assert.equal(iso(where.date.lte), '2026-08-31'); return { weightKg: 70 }; } },
    measurementEntry: { findMany: async ({ where }) => { assert.equal(iso(where.date.lte), '2026-08-31'); return []; } },
    exercise: { groupBy: async ({ where }) => { assert.equal(iso(where.workout.date.lte), '2026-08-31'); return []; } },
    workout: { count: async args => { countArgs = args; const { gte, lte } = args.where.date; return dates.filter(d => d >= gte && d <= lte).length; } },
  };
  const { buildGoalLiveValueResolver } = loadTs('src/lib/goal-live-value.ts', { '@/lib/prisma': { prisma } });
  const result = await buildGoalLiveValueResolver('synthetic');
  assert.equal(iso(countArgs.where.date.gte), '2026-08-04');
  assert.equal(result.weeklyFrequency, 0.5);
});

test('workout statistics keep month and rolling windows distinct at UTC month rollover', async t => {
  freeze(t);
  const workouts = ['2026-09-01','2026-08-31','2026-08-04','2026-08-03','2026-07-31'].map((date, i) => ({
    id: i, name: date, date: day(date), status: 'COMPLETED', exercises: [{ name: 'Test', sets: 1, reps: 1, weightKg: 10 }],
  }));
  workouts.push({ id: 10, date: day('2026-08-31'), status: 'PLANNED', exercises: [] });
  const Page = loadTs('src/app/(app)/treinos/page.tsx', { ...uiMocks(), '@/lib/prisma': { prisma: { workout: { findMany: async () => workouts } } } }).default;
  const tree = await Page();
  const stats = find(tree, 'StatCard');
  assert.equal(stats[0].value, 3);
  assert.match(stats[0].hint, /agosto/);
  assert.equal(stats[1].value, '0,5');
  assert.equal(stats[2].value, '30');
  assert.equal(stats[3].value, '31/08/2026');
  assert.equal(find(tree, 'WorkoutsPanel')[0].workouts.length, 6);
  assert.equal(find(tree, 'ExerciseProgression')[0].points.length, 4);
});

test('dashboard keeps Monday inclusive, 90 days, and future planned workouts', async t => {
  freeze(t, '2026-09-07T02:30:00Z'); // Sunday in Sao Paulo, Monday UTC.
  const queries = [];
  const empty = name => async args => { queries.push([name, args]); return []; };
  const prisma = {
    weightEntry: { findMany: empty('weights'), findFirst: async () => null },
    measurementEntry: { findMany: empty('measurements') },
    meal: { findMany: empty('meals') }, goal: { findMany: empty('goals') },
    workout: { count: async args => { queries.push(['count', args]); return 0; }, findMany: empty('workouts') },
  };
  const Page = loadTs('src/app/(app)/painel/page.tsx', {
    ...uiMocks(), '@/lib/prisma': { prisma },
    'next/link': { default: 'Link', __esModule: true }, 'next/navigation': { redirect() { throw Error('unexpected'); } },
    'lucide-react': Object.fromEntries(['CalendarIcon','DumbbellIcon','RulerIcon','ScaleIcon','TargetIcon','UtensilsIcon'].map(k => [k,k])),
    '@/components/ui/button': { buttonVariants: () => '' },
    '@/components/ui/card': Object.fromEntries(['Card','CardContent','CardHeader','CardTitle'].map(k => [k,k])),
    '@/components/metrics/weight-mini-chart': { WeightMiniChart: 'WeightMiniChart' },
    '@/lib/goal-live-value': { buildGoalLiveValueResolver: async () => ({ liveValue: () => null }) },
  }).default;
  await Page();
  const count = queries.find(([name]) => name === 'count')[1].where.date;
  assert.equal(iso(count.gte), '2026-08-31');
  assert.equal(iso(count.lte), '2026-09-06');
  const weights = queries.find(([name]) => name === 'weights')[1].where.date;
  assert.equal((weights.lte - weights.gte) / 86400000 + 1, 90);
  const planned = queries.find(([name, args]) => name === 'workouts' && args.where.status === 'PLANNED')[1];
  assert.equal(iso(planned.where.date.gte), '2026-09-06');
  assert.equal(planned.where.date.lte, undefined);
  const completed = queries.find(([name, args]) => name === 'workouts' && args.where.status === 'COMPLETED')[1];
  assert.equal(iso(completed.where.date.lte), '2026-09-06');
});
