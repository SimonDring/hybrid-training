/**
 * Screens registry.
 *
 * Maps the route id (e.g. 'session-detail') used by the Router to the actual
 * screen module that handles that route. Keeping this lookup separate from the
 * screen files themselves means:
 *   - Screens can be lazy-loaded later if bundle size matters
 *   - Route ids stay decoupled from JS identifier names (which can't contain hyphens)
 *   - There's a single canonical list of routes the app supports
 */

import { home } from './home.js';
import { phases, phaseDetail, weekDetail, sessionDetail } from './phases.js';
import { tracking, checkin, metrics, trends, log } from './tracking.js';
import { profile, overview, decisions, principles, reassess } from './profile.js';
import { settings } from './settings.js';

export const registry = {
  // Top-level (tab destinations)
  home,
  phases,
  tracking,
  profile,
  settings,

  // Phases drill-down
  'phase-detail':   phaseDetail,
  'week-detail':    weekDetail,
  'session-detail': sessionDetail,

  // Tracking drill-down
  checkin,
  metrics,
  trends,
  log,

  // Profile drill-down (reference content)
  overview,
  decisions,
  principles,
  reassess
};

export default registry;
