const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadTs } = require('./load-ts.cjs');
const load = (file) => loadTs(path.resolve(__dirname, '../src/lib', file));
const { todayISO, parseISODate, toISODate, formatDateBR } = load('date.ts');
const { ageInYears, weightGoalProgress } = load('metrics.ts');
const { daysUntil } = load('goals.ts');

test('rejects impossible dates and accepts leap days without normalization', () => {
  for (const value of ['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00', '2026-1-01', '2026-01-01T00:00:00Z', '']) {
    assert.equal(parseISODate(value), null, value);
  }
  for (const value of ['2024-02-29', '2000-02-29', '2026-12-31']) {
    assert.equal(toISODate(parseISODate(value)), value);
  }
  assert.equal(parseISODate('1900-02-29'), null);
});

test('today uses Sao Paulo midnight, including year rollover and historical DST', () => {
  assert.equal(todayISO(new Date('2026-01-01T02:59:59Z')), '2025-12-31');
  assert.equal(todayISO(new Date('2026-01-01T03:00:00Z')), '2026-01-01');
  assert.equal(todayISO(new Date('2018-12-01T01:59:59Z')), '2018-11-30');
  assert.equal(todayISO(new Date('2018-12-01T02:00:00Z')), '2018-12-01');
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(formatDateBR(parseISODate('2026-09-07')), '07/09/2026');
});

test('birthday is stored UTC while age advances on Sao Paulo civil birthday', () => {
  const birth = parseISODate('2000-09-07');
  assert.equal(ageInYears(birth, new Date('2026-09-07T02:59:59Z')), 25);
  assert.equal(ageInYears(birth, new Date('2026-09-07T03:00:00Z')), 26);
  assert.equal(ageInYears(parseISODate('2000-01-01'), new Date('2026-01-01T02:00:00Z')), 25);
  const leapBirth = parseISODate('2000-02-29');
  assert.equal(ageInYears(leapBirth, new Date('2025-02-28T15:00:00Z')), 24);
  assert.equal(ageInYears(leapBirth, new Date('2025-03-01T03:00:00Z')), 25);
});

test('deadlines compare civil dates rather than instants or local host midnight', () => {
  const deadline = parseISODate('2026-09-07');
  assert.equal(daysUntil(null), null);
  assert.equal(daysUntil(deadline, new Date('2026-09-07T02:59:59Z')), 1);
  assert.equal(daysUntil(deadline, new Date('2026-09-07T03:00:00Z')), 0);
  assert.equal(daysUntil(deadline, new Date('2026-09-08T03:00:00Z')), -1);
  assert.equal(daysUntil(parseISODate('2018-11-05'), new Date('2018-11-03T15:00:00Z')), 2);
});

test('remaining weight respects gain and loss direction and overshoot', () => {
  for (const [start, current, target, remaining, percent, direction] of [
    [60, 65, 70, 5, 50, 'gain'], [60, 72, 70, -2, 100, 'gain'],
    [80, 75, 70, 5, 50, 'lose'], [80, 68, 70, -2, 100, 'lose'],
    [60, 70, 70, 0, 100, 'gain'], [80, 70, 70, 0, 100, 'lose'],
    [60, 58, 70, 12, 0, 'gain'], [70, 70, 70, 0, 100, 'maintain'],
  ]) {
    const result = weightGoalProgress(start, current, target);
    assert.equal(result.remainingKg, remaining);
    assert.equal(result.percent, percent);
    assert.equal(result.direction, direction);
  }
});
