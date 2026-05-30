/**
 * Home screen — dashboard with today's session, streak ring, stats strip,
 * quick actions, and secondary reference links.
 */

import * as Plan from '../data/Plan.js';
import * as State from '../modules/State.js';
import * as Utils from '../modules/Utils.js';
import * as SessionHelper from '../modules/SessionHelper.js';

export const home = {
  title: 'Hybrid',
  render(ctx) {
    const s = State.get();
    const completed = Utils.countCompleted(s.sessions);
    const sortedLogs = [...s.logs].sort((a,b) => (b.date || '').localeCompare(a.date || ''));
    const latest = sortedLogs[0];
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    // Determine "today's session" — first incomplete in any phase, starting from Phase 1 Week 1
    const phase1 = Plan.getPhase(1);
    let nextSession = null;
    let nextWeek = null;
    let nextSessionIdx = 0;
    if (phase1 && phase1.weeks) {
      outer: for (const w of phase1.weeks) {
        for (let i = 0; i < w.sessions.length; i++) {
          const key = Utils.weekKey(1, w.num, i);
          if (!SessionHelper.isCompleted(key)) {
            nextSession = w.sessions[i];
            nextWeek = w;
            nextSessionIdx = i;
            break outer;
          }
        }
      }
    }

    // Current week progress for streak ring
    const targetWeeklySessions = 6;
    const thisWeekDone = nextWeek
      ? nextWeek.sessions.filter((_, i) => SessionHelper.isCompleted(Utils.weekKey(1, nextWeek.num, i))).length
      : 0;
    const ringPct = Math.min(100, (thisWeekDone / targetWeeklySessions) * 100);
    const ringCircumference = 2 * Math.PI * 22;
    const ringOffset = ringCircumference - (ringCircumference * ringPct / 100);

    // Today card content
    let todayCardHtml;
    if (nextSession && nextWeek) {
      todayCardHtml = `
        <button class="today-card" onclick="Router.push('session-detail', { phaseId: 1, weekNum: ${nextWeek.num}, sessionIdx: ${nextSessionIdx} }, 'Session')" style="width:100%; text-align:left; font-family:inherit; border:none; cursor:pointer; color:#f4f1ea;">
          <div class="today-eyebrow">Up next · Week ${nextWeek.num}</div>
          <div class="today-title">${Utils.escapeHtml(nextSession.title)}</div>
          <div class="today-meta">${Utils.escapeHtml(nextSession.duration)}</div>
          <div class="today-cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Start session</span>
          </div>
        </button>
      `;
    } else {
      todayCardHtml = `
        <div class="today-card complete">
          <div class="today-eyebrow">All caught up</div>
          <div class="today-title">No pending sessions</div>
          <div class="today-meta">Take a recovery day, or jump into next week.</div>
          <button class="today-cta done" onclick="Router.push('phases')">
            <span>Browse phases</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="dash-greeting">
        <div class="eyebrow">${greet}</div>
        <h1 class="h1">Built to <em>last</em>.</h1>
      </div>

      ${todayCardHtml}

      <div class="streak-card">
        <div class="streak-ring">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle class="ring-bg" cx="28" cy="28" r="22"></circle>
            <circle class="ring-fg" cx="28" cy="28" r="22"
              stroke-dasharray="${ringCircumference.toFixed(2)}"
              stroke-dashoffset="${ringOffset.toFixed(2)}"></circle>
          </svg>
          <div class="ring-text">${thisWeekDone}/${targetWeeklySessions}</div>
        </div>
        <div class="streak-body">
          <div class="streak-title">Week ${nextWeek ? nextWeek.num : 5} progress</div>
          <div class="streak-sub">${thisWeekDone} of ${targetWeeklySessions} sessions complete</div>
        </div>
      </div>

      <div class="stats-strip">
        <div class="stat-tile">
          <div class="l">Sessions</div>
          <div class="v">${completed}</div>
          <div class="d">total done</div>
        </div>
        <div class="stat-tile">
          <div class="l">Check-ins</div>
          <div class="v">${s.logs.length}</div>
          <div class="d">weeks logged</div>
        </div>
        <div class="stat-tile">
          <div class="l">Knee</div>
          <div class="v">${latest && latest.knee ? latest.knee : '—'}</div>
          <div class="d">last rated</div>
        </div>
      </div>

      <div class="quick-grid">
        <button class="quick-tile" onclick="Router.push('phases')">
          <div>
            <div class="qt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="4" x2="9" y2="20"></line></svg></div>
            <div class="qt-title">Training phases</div>
          </div>
          <div class="qt-meta">5 phases · drill in</div>
        </button>
        <button class="quick-tile" onclick="Router.push('checkin')">
          <div>
            <div class="qt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></div>
            <div class="qt-title">Weekly check-in</div>
          </div>
          <div class="qt-meta">2 min · log this week</div>
        </button>
      </div>

      <h3 class="h3">Reference</h3>
      <div class="sec-links">
        <button class="sec-link" onclick="Router.push('overview')">12-month overview <span class="sl-chev">${Utils.chevronRight}</span></button>
        <button class="sec-link" onclick="Router.push('decisions')">Decision framework <span class="sl-chev">${Utils.chevronRight}</span></button>
        <button class="sec-link" onclick="Router.push('principles')">Operating principles <span class="sl-chev">${Utils.chevronRight}</span></button>
        <button class="sec-link" onclick="Router.push('reassess')">Quarterly reassessment <span class="sl-chev">${Utils.chevronRight}</span></button>
      </div>
    `;
  }
};

