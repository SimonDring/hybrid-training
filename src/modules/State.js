/**
 * State — backwards-compat facade over Database.
 *
 * Purpose:
 *   Existing screens were written against the v3 shape: { logs, sessions, reassess }.
 *   Database (v4) stores data normalised into flat tables. State rebuilds the v3
 *   shape on demand so no screen has to be rewritten just because the storage changed.
 *
 * Migration plan:
 *   As you port screens to React (Stage 2), each ported screen should call
 *   Database directly (`Database.services.X`) instead of going through State.
 *   When the last screen is migrated, this module can be deleted.
 */

import * as Database from './Database.js';

const subs = [];

// Re-publish Database notifications as State notifications, with the legacy view
Database.subscribe(() => subs.forEach(fn => fn(buildLegacyView())));

function buildLegacyView() {
  const checkins = Database.services.listCheckins();
  const logs = checkins.map(c => ({
    _id: c.id,
    date: c.week_ending || '',
    bw: c.bodyweight_kg != null ? String(c.bodyweight_kg) : '',
    rhr: c.resting_hr != null ? String(c.resting_hr) : '',
    rpe: c.avg_rpe != null ? String(c.avg_rpe) : '',
    sleep: c.sleep_score != null ? String(c.sleep_score) : '',
    knee: c.knee_rating != null ? String(c.knee_rating) : '',
    notes: c.notes || ''
  }));

  // Re-derive templateRef → status map that screens expect
  const sessionsMap = {};
  Database.tables.sessions.all().forEach(s => {
    if (!s.template_ref) return;
    const log = s.status === 'completed'
      ? Database.tables.sessionLogs.find(l => l.session_id === s.id)
      : null;
    sessionsMap[s.template_ref] = {
      completed: s.status === 'completed',
      startedAt: s.started_at || null,
      completedAt: s.completed_at || null,
      quality: log ? log.quality : null,
      energy: log ? log.energy : null,
      recovery: log ? log.recovery : null,
      notes: log ? (log.notes || '') : ''
    };
  });

  return {
    logs,
    sessions: sessionsMap,
    reassess: Database.services.getReassessAnswers()
  };
}

export const get = () => buildLegacyView();

export const subscribe = (fn) => {
  subs.push(fn);
  return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
};

export const actions = {
  // ----- Weekly check-ins -----
  addLog(entry) { Database.services.addCheckin(entry); },
  deleteLog(idx) {
    const view = buildLegacyView().logs;
    const record = view[idx];
    if (record && record._id) Database.tables.weeklyCheckins.remove(record._id);
  },

  // ----- Sessions -----
  getSession(templateRef) {
    return buildLegacyView().sessions[templateRef] || null;
  },
  startSession(templateRef) { Database.services.startSession(templateRef); },
  completeSession(templateRef, payload) { Database.services.completeSession(templateRef, payload); },
  uncompleteSession(templateRef) { Database.services.uncompleteSession(templateRef); },
  toggleSession(templateRef) {
    const s = buildLegacyView().sessions[templateRef];
    if (s && s.completed) Database.services.uncompleteSession(templateRef);
    else Database.services.completeSession(templateRef, {});
  },

  // ----- Reassessment -----
  setReassess(qid, value) { Database.services.setReassessAnswer(qid, value); },

  // ----- Bulk -----
  replaceAll({ logs, sessions, reassess } = {}) {
    Database.services.importAll({ logs, sessions, reassess });
  },
  resetAll() { Database.services.resetAll(); }
};

export default { get, subscribe, actions };
