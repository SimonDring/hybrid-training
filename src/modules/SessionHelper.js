/**
 * SessionHelper — convenience predicates for session state.
 *
 * Reads through State.actions.getSession so it picks up either the legacy boolean
 * shape (during v3→v4 migration) or the structured object shape.
 */

import * as State from './State.js';

export function isCompleted(templateRef) {
  const s = State.actions.getSession(templateRef);
  return !!(s && s.completed);
}

export function isStarted(templateRef) {
  const s = State.actions.getSession(templateRef);
  return !!(s && s.startedAt && !s.completed);
}

export function data(templateRef) {
  return State.actions.getSession(templateRef);
}

export default { isCompleted, isStarted, data };
