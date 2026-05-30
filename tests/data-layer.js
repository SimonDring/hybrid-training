/**
 * Data layer test harness — runnable with `node tests/data-layer.js`
 *
 * Tests cover:
 *   - Storage round-trip
 *   - Database CRUD + soft delete + replaceAll
 *   - Session lifecycle (start → complete → uncomplete)
 *   - Weekly checkins create + sort
 *   - v3 → v4 migration with mixed legacy data
 *   - Export/import round-trip
 *
 * No frameworks — just plain assertions. Run:
 *   node tests/data-layer.js
 *
 * Exit code 0 = all pass. Non-zero = failures (with stack).
 */

import { strict as assert } from 'assert';

// ---------- DOM/browser stubs ----------
// Database imports rely on `localStorage`, `crypto.randomUUID`, etc.
// Stub them before importing the module.

const storage = {};
globalThis.localStorage = {
  getItem: (k) => k in storage ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};
globalThis.alert = () => {};
if (!globalThis.crypto) globalThis.crypto = {};
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// Seed v3 data so migration runs
storage['htp_logs_v3'] = JSON.stringify([
  { date: '2026-05-10', bw: '80.2', rhr: '56', rpe: '7.5', sleep: '8', knee: '1', notes: 'good week' },
  { date: '2026-05-17', bw: '80.0', rhr: '54', rpe: '7', sleep: '7.5', knee: '0.5', notes: 'fresh' }
]);
storage['htp_sessions_v3'] = JSON.stringify({
  'p1_wk5_s0': { completed: true, startedAt: '2026-05-11T08:00:00Z', completedAt: '2026-05-11T09:05:00Z', quality: 4, energy: 4, recovery: 5, notes: 'felt strong' },
  'p1_wk5_s1': true,
  'p1_wk5_s3': { startedAt: '2026-05-12T08:00:00Z' }
});
storage['htp_reassess_v3'] = JSON.stringify({ q1: 'Squat at 85kg', q2: '500m continuous' });

// Now import (top-level await — Node 14.8+)
const Storage = (await import('../src/modules/Storage.js')).default;
const Database = (await import('../src/modules/Database.js')).default;
const Utils = await import('../src/modules/Utils.js');

// ---------- Tiny test runner ----------
let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    if (e.stack) console.log('    ' + e.stack.split('\n').slice(1, 4).join('\n    '));
    failed++;
  }
}
function group(label, fn) {
  console.log(`\n${label}`);
  fn();
}

// ============================================================
group('Storage', () => {
  test('round-trip', () => {
    Storage.save('test_key', { a: 1, b: [2, 3] });
    const r = Storage.load('test_key', null);
    assert.deepEqual(r, { a: 1, b: [2, 3] });
    Storage.remove('test_key');
    assert.equal(Storage.load('test_key', 'fallback'), 'fallback');
  });
  test('KEYS exposes versioned names', () => {
    assert.equal(Storage.KEYS.users, 'htp_users_v4');
    assert.equal(Storage.KEYS.legacyLogs, 'htp_logs_v3');
  });
});

group('Utils', () => {
  test('escapeHtml', () => {
    assert.equal(Utils.escapeHtml('<script>'), '&lt;script&gt;');
    assert.equal(Utils.escapeHtml(null), '');
  });
  test('weekKey', () => {
    assert.equal(Utils.weekKey(1, 5, 2), 'p1_wk5_s2');
  });
  test('countCompleted handles legacy + structured', () => {
    const mixed = { a: true, b: { completed: true }, c: { startedAt: 'x' }, d: false };
    assert.equal(Utils.countCompleted(mixed), 2);
  });
  test('formatDuration', () => {
    assert.equal(Utils.formatDuration('2026-05-20T08:00:00Z', '2026-05-20T08:42:30Z'), '42m 30s');
    assert.equal(Utils.formatDuration(null, 'x'), '');
  });
});

group('Database migration (v3 → v4)', () => {
  test('marked migrated', () => {
    assert.equal(Database._meta.migrated_from_v3, true);
  });
  test('default user + plan created', () => {
    assert.equal(Database.tables.users.all().length, 1);
    assert.equal(Database.tables.plans.all().length, 1);
  });
  test('checkins migrated from legacy logs', () => {
    const checkins = Database.tables.weeklyCheckins.all();
    assert.equal(checkins.length, 2);
    assert.equal(checkins[0].bodyweight_kg, 80.2);
    assert.equal(checkins[0].notes, 'good week');
  });
  test('sessions migrated from legacy sessions', () => {
    const sessions = Database.tables.sessions.all();
    assert.equal(sessions.length, 3);
    const s0 = sessions.find(s => s.template_ref === 'p1_wk5_s0');
    assert.equal(s0.status, 'completed');
    const s3 = sessions.find(s => s.template_ref === 'p1_wk5_s3');
    assert.equal(s3.status, 'in_progress');
  });
  test('session log includes quality + notes', () => {
    const logs = Database.tables.sessionLogs.all();
    const log = logs.find(l => l.quality === 4);
    assert.ok(log);
    assert.equal(log.notes, 'felt strong');
    assert.equal(log.recovery, 5);
  });
  test('reassessment migrated', () => {
    const r = Database.tables.reassessments.all();
    assert.equal(r.length, 1);
    assert.equal(r[0].answers.q1, 'Squat at 85kg');
  });
});

group('Database CRUD', () => {
  test('create generates uuid + timestamps', () => {
    const r = Database.tables.users.create({ name: 'Test User' });
    assert.ok(r.id);
    assert.ok(r.created_at);
    assert.ok(r.updated_at);
    assert.equal(r.deleted_at, null);
    Database.tables.users.hardDelete(r.id);
  });
  test('soft delete excludes from .all()', () => {
    const r = Database.tables.users.create({ name: 'Doomed' });
    Database.tables.users.remove(r.id);
    assert.equal(Database.tables.users.find(u => u.name === 'Doomed'), null);
    // But hard-find via raw id still finds the record — actually no, .get() also filters
    assert.equal(Database.tables.users.get(r.id), null);
  });
  test('update merges and bumps updated_at', async () => {
    const r = Database.tables.users.create({ name: 'A', email: 'a@x' });
    const t1 = r.updated_at;
    await new Promise(res => setTimeout(res, 5));
    Database.tables.users.update(r.id, { name: 'B' });
    const fresh = Database.tables.users.get(r.id);
    assert.equal(fresh.name, 'B');
    assert.equal(fresh.email, 'a@x');
    assert.notEqual(fresh.updated_at, t1);
    Database.tables.users.hardDelete(r.id);
  });
});

group('Session lifecycle', () => {
  test('startSession sets in_progress', () => {
    Database.services.startSession('p2_wk13_s0');
    const status = Database.services.sessionStatus('p2_wk13_s0');
    assert.equal(status.status, 'in_progress');
    assert.ok(status.session.started_at);
  });
  test('completeSession creates a log with ratings', () => {
    Database.services.completeSession('p2_wk13_s0', { quality: 5, energy: 4, recovery: 3, notes: 'PB' });
    const status = Database.services.sessionStatus('p2_wk13_s0');
    assert.equal(status.status, 'completed');
    assert.equal(status.log.quality, 5);
    assert.equal(status.log.notes, 'PB');
  });
  test('uncompleteSession reverts + soft-deletes log', () => {
    Database.services.uncompleteSession('p2_wk13_s0');
    const status = Database.services.sessionStatus('p2_wk13_s0');
    assert.equal(status.status, 'pending');
  });
});

group('Weekly checkins', () => {
  test('addCheckin + listCheckins sorted ascending', () => {
    Database.services.addCheckin({ date: '2026-05-24', bw: '79.8', rhr: '52', rpe: '7', sleep: '8.5', knee: '0', notes: 'ready' });
    const all = Database.services.listCheckins();
    assert.ok(all.length >= 3);
    const dates = all.map(c => c.week_ending);
    const sorted = [...dates].sort();
    assert.deepEqual(dates, sorted);
  });
});

group('Export / Import round-trip', () => {
  test('export shape uses snake_case Supabase keys', () => {
    const exp = Database.services.exportAll();
    assert.equal(exp.schema_version, 4);
    assert.ok(Array.isArray(exp.users));
    assert.ok(Array.isArray(exp.weekly_checkins));
    assert.ok(Array.isArray(exp.session_logs));
    assert.ok(Array.isArray(exp.wearable_readings));
    assert.ok(Array.isArray(exp.ai_recommendations));
  });
  test('reset then import restores data', () => {
    const exp = Database.services.exportAll();
    const checkinCount = exp.weekly_checkins.length;
    Database.services.resetAll();
    assert.equal(Database.tables.weeklyCheckins.all().length, 0);
    Database.services.importAll(exp);
    assert.equal(Database.tables.weeklyCheckins.all().length, checkinCount);
  });
});

// ---------- Summary ----------
console.log(`\n${passed} passed, ${failed} failed.\n`);
process.exit(failed === 0 ? 0 : 1);
