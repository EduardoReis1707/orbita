const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { loadTs } = require('./load-ts.cjs');

const pagePath = 'src/app/(app)/treinos/page.tsx';
// Baseline pinned from git show HEAD when this regression test was created.
const baselineRef = 'ebc4d5bdfc856762909ada25e46d61246f9259cf';
const baselineSource = execFileSync('git', ['show', `${baselineRef}:${pagePath}`], {
  cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
});

const exercise = (name, weightKg) => ({ name, weightKg, sets: 3, reps: 10 });
const workout = (id, date, status, exercises) => ({
  id, name: `Workout ${id}`, profileId: 'user-1',
  date: new Date(`${date}T00:00:00.000Z`), status, exercises,
});
const fixture = () => [
  workout(5, '2026-09-07', 'PLANNED', [exercise('Supino', 200)]),
  workout(4, '2026-09-06', 'COMPLETED', [exercise('Supino', 65), exercise('Sem carga', null)]),
  workout(3, '2026-09-05', 'SKIPPED', [exercise('Supino', 300)]),
  workout(2, '2026-09-04', 'COMPLETED', [exercise('Supino', 55), exercise('Agachamento', 80)]),
  workout(1, '2026-09-04', 'COMPLETED', [exercise('Supino', 60), exercise('Supino', 50), exercise('Zero', 0)]),
];

async function render(version, workouts) {
  const calls = [];
  const mocks = {
    '@/lib/auth': { requireUser: async () => ({ id: 'user-1' }) },
    '@/lib/ai/client': { isAiConfigured: () => false },
    '@/lib/date': loadTs('src/lib/date.ts'),
    '@/lib/metrics': { formatNumber: String },
    '@/lib/workouts': loadTs('src/lib/workouts.ts'),
    '@/components/ui/tabs': Object.fromEntries(['Tabs', 'TabsContent', 'TabsList', 'TabsTrigger'].map(k => [k, k])),
    '@/components/metrics/stat-card': { StatCard: 'StatCard' },
    './exercise-progression': { ExerciseProgression: 'ExerciseProgression' },
    './workouts-panel': { WorkoutsPanel: 'WorkoutsPanel' },
    '@/lib/prisma': { prisma: {
      workout: { findMany: async (args) => {
        calls.push('workout.findMany');
        assert.deepEqual(args, { where: { profileId: 'user-1' }, orderBy: { date: 'desc' }, include: { exercises: true } });
        return workouts;
      } },
      exercise: { findMany: async (args) => {
        calls.push('exercise.findMany');
        assert.deepEqual(args, {
          where: { workout: { profileId: 'user-1', status: 'COMPLETED' }, weightKg: { not: null } },
          select: { name: true, weightKg: true, workout: { select: { date: true } } },
          orderBy: { workout: { date: 'asc' } },
        });
        return workouts.filter(w => w.status === 'COMPLETED')
          .flatMap(w => w.exercises.filter(e => e.weightKg != null)
            .map(e => ({ name: e.name, weightKg: e.weightKg, workout: { date: w.date } })))
          .sort((a, b) => a.workout.date - b.workout.date);
      } },
    } },
  };
  let page;
  if (version === 'baseline') {
    const code = ts.transpileModule(baselineSource, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    const mod = { exports: {} };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: 'treinos-HEAD.tsx' })(
      id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), mod, mod.exports,
    );
    page = mod.exports.default;
  } else {
    page = loadTs(pagePath, mocks).default;
  }
  const tree = await page();
  function find(node, type) {
    if (Array.isArray(node)) return node.flatMap(child => find(child, type));
    if (!node || typeof node !== 'object') return [];
    return [...(node.type === type ? [node.props] : []), ...find(node.props?.children, type)];
  }
  return { calls, progression: find(tree, 'ExerciseProgression')[0], cards: find(tree, 'WorkoutsPanel')[0], stats: find(tree, 'StatCard') };
}

test('HEAD performs 2 Prisma calls; current performs 1 with identical fixture output', async () => {
  const workouts = fixture();
  const beforeSnapshot = structuredClone(workouts);
  const before = await render('baseline', workouts);
  const after = await render('current', workouts);
  assert.deepEqual(before.calls, ['workout.findMany', 'exercise.findMany']);
  assert.deepEqual(after.calls, ['workout.findMany']);
  assert.deepEqual(after.progression, before.progression);
  assert.deepEqual(after.cards, before.cards);
  assert.deepEqual(after.stats, before.stats);
  assert.deepEqual(workouts, beforeSnapshot, 'aggregation must not mutate the loaded workouts');
  assert.deepEqual(after.progression.points.map(({ name, date, weightKg }) => ({ name, date, weightKg })), [
    { name: 'Supino', date: '2026-09-04', weightKg: 60 },
    { name: 'Agachamento', date: '2026-09-04', weightKg: 80 },
    { name: 'Zero', date: '2026-09-04', weightKg: 0 },
    { name: 'Supino', date: '2026-09-06', weightKg: 65 },
  ]);
});

test('names containing |@| remain intact and points stay chronological', async () => {
  const workouts = [
    workout(2, '2026-09-06', 'COMPLETED', [exercise('Remada|@|sentada|@|', 55)]),
    workout(1, '2026-09-04', 'COMPLETED', [exercise('Remada|@|sentada|@|', 40), exercise('Remada|@|sentada|@|', 45)]),
  ];
  await assert.rejects(() => render('baseline', workouts), RangeError);
  const { progression, calls } = await render('current', workouts);
  assert.deepEqual(calls, ['workout.findMany']);
  assert.deepEqual(progression.names, ['Remada|@|sentada|@|']);
  assert.deepEqual(progression.points.map(p => [p.name, p.date, p.weightKg]), [
    ['Remada|@|sentada|@|', '2026-09-04', 45],
    ['Remada|@|sentada|@|', '2026-09-06', 55],
  ]);
});

test('empty history preserves baseline output with one Prisma call', async () => {
  const before = await render('baseline', []);
  const after = await render('current', []);
  assert.equal(before.calls.length, 2);
  assert.equal(after.calls.length, 1);
  assert.deepEqual(after.progression, before.progression);
  assert.deepEqual(after.progression, { names: [], points: [] });
});
