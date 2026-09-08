const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');

const targets = loadTs('src/lib/nutrition-targets.ts');

for (const [field, max] of Object.entries(targets.NUTRITION_TARGET_MAX)) {
  test(`nutrition ${field}: empty, boundaries and invalid values`, () => {
    const parse = (value) => targets.parseNutritionTarget(value, field);
    assert.equal(parse(''), undefined);
    assert.equal(parse('  '), undefined);
    assert.equal(parse('0'), 0);
    assert.equal(parse(String(max)), max);
    for (const value of ['-1', String(max + 1), '1.5', 'NaN', 'Infinity', '2147483648', 'invalid']) {
      assert.equal(parse(value), null, value);
    }
  });
}

test('PWA resources bypass proxy; private and lookalike paths remain covered', () => {
  const { config } = loadTs('src/proxy.ts', {
    'next/server': {},
    '@/lib/supabase/middleware': {},
  });
  const matches = (path) => config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(path));
  for (const path of ['/sw.js', '/manifest.webmanifest', '/icon', '/apple-icon']) {
    assert.equal(matches(path), false, path);
  }
  for (const path of ['/painel', '/alimentacao', '/api/exportar/treinos', '/sw.js/private', '/icon-private', '/manifest.webmanifest-private']) {
    assert.equal(matches(path), true, path);
  }
});

test('both nutrition actions enforce the same limits before writing', async () => {
  const writes = [];
  const mocks = {
    'next/cache': { revalidatePath() {} },
    '@/lib/auth': { requireUser: async () => ({ id: 'test-user' }) },
    '@/lib/prisma': { prisma: { profile: { update: async (args) => writes.push(args.data) } } },
    '@/lib/date': { parseISODate() {} },
    '@/lib/nutrition': { MEAL_TYPE_ORDER: [] },
    '@/lib/nutrition-targets': targets,
    '@/lib/profile': { ACTIVITY_LEVEL_VALUES: [], GOAL_TYPE_VALUES: ['LOSE_WEIGHT'], SEX_VALUES: [] },
    '@/lib/supabase/server': {},
  };
  const nutrition = loadTs('src/app/(app)/alimentacao/actions.ts', mocks);
  const settings = loadTs('src/app/(app)/configuracoes/actions.ts', mocks);
  const fieldNames = { calories: 'targetCalories', protein: 'targetProteinG', carbs: 'targetCarbsG', fat: 'targetFatG' };
  for (const [field, max] of Object.entries(targets.NUTRITION_TARGET_MAX)) {
    for (const raw of ['', '0', String(max), String(max + 1), '-1', '1.5', '2147483648']) {
      const form = new FormData();
      form.set('fullName', 'Test User');
      form.set('goalType', 'LOSE_WEIGHT');
      form.set(field, raw);
      form.set(fieldNames[field], raw);
      const before = writes.length;
      const a = await nutrition.saveNutritionTargetsAction(form);
      const b = await settings.updateProfileAction(form);
      const valid = raw === '' || raw === '0' || raw === String(max);
      assert.equal(a.status, valid ? 'success' : 'error', `${field}=${raw}`);
      assert.equal(b.status, a.status, `${field}=${raw}`);
      assert.equal(writes.length - before, valid ? 2 : 0);
      if (valid) {
        assert.equal(writes[before][fieldNames[field]], raw === '' ? null : Number(raw));
        assert.equal(writes[before + 1][fieldNames[field]], writes[before][fieldNames[field]]);
      }
    }
  }
});
