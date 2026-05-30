/**
 * Phases screens — the training drill-down hierarchy.
 *   phases       → list of all phases
 *   phaseDetail  → single phase with weeks grid
 *   weekDetail   → single week with calendar strip + session cards
 *   sessionDetail → single session with Start/Complete lifecycle
 */

import * as Plan from '../data/Plan.js';
import * as State from '../modules/State.js';
import * as Utils from '../modules/Utils.js';
import * as SessionHelper from '../modules/SessionHelper.js';
import Router from '../modules/Router.js';

export const phases = {
  title: 'Training Phases',
  render() {
    const s = State.get();
    const tiles = Plan.getPhases().map(p => {
      const phase = Plan.getPhase(p.id);
      const total = phase.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
      const done = phase.weeks.reduce((sum, w) => sum + w.sessions.filter((_, i) => SessionHelper.isCompleted(Utils.weekKey(p.id, w.num, i))).length, 0);
      const statusLabel = p.status === 'current' ? 'Current' : 'Provisional';
      const statusClass = p.status === 'current' ? 'current' : 'provisional';
      return `
        <button class="phase-tile" onclick="Router.push('phase-detail', { phaseId: ${p.id} }, 'Phase ${p.id}')">
          <div class="pt-head">
            <div class="pt-num">0${p.id}</div>
            <div class="pt-status ${statusClass}">${statusLabel}</div>
          </div>
          <div class="pt-title">${p.title}</div>
          <div class="pt-range">${p.range} · ${phase.weeks.length} wks</div>
          <div class="pt-desc">${p.tagline}</div>
          <div class="pt-foot"><span>${done} / ${total} sessions</span><span>→</span></div>
        </button>
      `;
    }).join('');
    return `
      <div class="eyebrow">§ 03</div>
      <h1 class="h1">Phases</h1>
      <div class="sub">Tap a phase to see week breakdown.</div>
      ${tiles}
    `;
  }
};

// ===== PHASE DETAIL =====
export const phaseDetail = {
  title: 'Phase',
  render(ctx) {
    const phase = Plan.getPhase(ctx.phaseId);
    if (!phase) return '<div class="empty">Phase not found.</div>';
    const s = State.get();
    const weeks = phase.weeks.map(w => {
      const done = w.sessions.filter((_, i) => SessionHelper.isCompleted(Utils.weekKey(phase.id, w.num, i))).length;
      const pct = w.sessions.length ? (done / w.sessions.length) * 100 : 0;
      return `
        <button class="week-tile ${w.deload ? 'deload' : ''}" onclick="Router.push('week-detail', { phaseId: ${phase.id}, weekNum: ${w.num} }, 'Week ${w.num}')">
          <div class="wt-tag">${w.deload ? 'Deload' : 'Week'}</div>
          <div class="wt-num">${w.num}</div>
          <div class="wt-theme">${Utils.escapeHtml(w.theme)}</div>
          <div class="wt-progress">
            <span>${done}/${w.sessions.length}</span>
            <div class="wt-bar"><div class="wt-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </button>
      `;
    }).join('');

    const gates = phase.gates.map(g => `<li><span class="k">${Utils.escapeHtml(g.label)}</span><span class="v">${g.required ? 'Required' : 'Target'}</span></li>`).join('');

    const provNote = phase.status !== 'current'
      ? `<div class="callout amber"><strong>Provisional</strong>Scaffolded from assumptions about Phase 1 outcomes. Will be revised at quarterly reassessment.</div>`
      : '';

    return `
      <div class="eyebrow">Phase ${phase.id} · ${phase.range}</div>
      <h1 class="h1">${Utils.escapeHtml(phase.title)}</h1>
      <div class="sub">${Utils.escapeHtml(phase.tagline)}</div>

      ${provNote}

      <h3 class="h3">Summary</h3>
      <div class="card"><p style="font-size:14px;">${Utils.escapeHtml(phase.summary)}</p></div>

      <h3 class="h3">Outcome gates</h3>
      <div class="card">
        <ul class="kv-list">${gates}</ul>
        <p style="margin-top:10px; font-size:12px; color:var(--muted);">Miss "Required" → consolidate. Miss "Target" only → advance with lighter loading start.</p>
      </div>

      <h3 class="h3">Weeks</h3>
      <div class="week-list">${weeks}</div>
    `;
  }
};

// ===== WEEK DETAIL =====
export const weekDetail = {
  title: 'Week',
  render(ctx) {
    const phase = Plan.getPhase(ctx.phaseId);
    const week = Plan.getWeek(ctx.phaseId, ctx.weekNum);
    if (!phase || !week) return '<div class="empty">Week not found.</div>';

    const sessionCards = week.sessions.map((sess, idx) => {
      const key = Utils.weekKey(phase.id, week.num, idx);
      const sd = SessionHelper.data(key);
      const isDone = sd && sd.completed;
      const isStarted = sd && sd.startedAt && !sd.completed;
      const statusBadge = isDone
        ? `<span class="ses-badge done">Done</span>`
        : isStarted
          ? `<span class="ses-badge in-progress">In progress</span>`
          : `<span class="ses-badge pending">Pending</span>`;
      // Day label parsed from the session title (everything before the first ·)
      const dayLabel = sess.title.split('·')[0].trim();
      const sessionFocus = sess.title.split('·').slice(1).join('·').trim() || sess.title;

      return `
        <button class="ses-card ${isDone ? 'is-done' : ''} ${isStarted ? 'is-started' : ''}"
                onclick="Router.push('session-detail', { phaseId: ${phase.id}, weekNum: ${week.num}, sessionIdx: ${idx} }, '${Utils.escapeHtml(dayLabel)}')">
          <div class="ses-day">${Utils.escapeHtml(dayLabel)}</div>
          <div class="ses-body">
            <div class="ses-focus">${Utils.escapeHtml(sessionFocus)}</div>
            <div class="ses-meta">
              <span class="ses-dur">${Utils.escapeHtml(sess.duration)}</span>
              ${statusBadge}
            </div>
          </div>
          <div class="ses-chev">${Utils.chevronRight}</div>
        </button>
      `;
    }).join('');

    const themeCallout = week.deload
      ? `<div class="callout amber"><strong>Deload week</strong>${Utils.escapeHtml(week.theme)}</div>`
      : `<div class="callout slate"><strong>Week ${week.num}</strong>${Utils.escapeHtml(week.theme)}</div>`;

    const prov = week.provisional
      ? `<div class="callout amber"><strong>Provisional</strong>Exact loads will be confirmed at quarterly reassessment.</div>`
      : '';

    // Weekly summary stats
    const done = week.sessions.filter((_, i) => SessionHelper.isCompleted(Utils.weekKey(phase.id, week.num, i))).length;
    const total = week.sessions.length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    // Build 7-day calendar strip — map sessions to days based on title parsing
    const dayLetters = ['M','T','W','T','F','S','S'];
    const dayMap = { 'monday': 0, 'tuesday': 1, 'tue': 1, 'wednesday': 2, 'thursday': 3, 'thu': 3, 'friday': 4, 'saturday': 5, 'sunday': 6, 'sat': 5, 'sun': 6, 'mon': 0, 'wed': 2, 'fri': 4 };
    const sessionsByDay = [[],[],[],[],[],[],[]];
    week.sessions.forEach((sess, idx) => {
      const dayPart = (sess.title.split('·')[0] || '').trim().toLowerCase().split(/\s+/)[0];
      const dIdx = dayMap[dayPart];
      if (dIdx !== undefined) sessionsByDay[dIdx].push({ sess, idx });
    });
    const todayIdx = (new Date().getDay() + 6) % 7; // 0=Mon
    const stripHtml = dayLetters.map((letter, i) => {
      const sessionsHere = sessionsByDay[i];
      const hasSession = sessionsHere.length > 0;
      const hasDone = sessionsHere.some(s => SessionHelper.isCompleted(Utils.weekKey(phase.id, week.num, s.idx)));
      const hasStarted = sessionsHere.some(s => SessionHelper.isStarted(Utils.weekKey(phase.id, week.num, s.idx)));
      const allDone = sessionsHere.length > 0 && sessionsHere.every(s => SessionHelper.isCompleted(Utils.weekKey(phase.id, week.num, s.idx)));
      let cls = '';
      if (hasSession) cls += ' has-session';
      if (allDone) cls += ' done';
      else if (hasStarted) cls += ' in-progress';
      if (i === todayIdx) cls += ' today';
      return `
        <div class="week-strip-day${cls}">
          <div class="wsd-label">${letter}</div>
          <div class="wsd-dot">${hasSession && !allDone && !hasStarted ? sessionsHere.length : ''}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="eyebrow">Phase ${phase.id} · ${Utils.escapeHtml(phase.title)}</div>
      <h1 class="h1">Week ${week.num}${week.deload ? ' · Deload' : ''}</h1>
      <div class="sub">${total} sessions · ${done} complete · ${pct}%</div>

      <div class="week-strip">${stripHtml}</div>

      ${themeCallout}
      ${prov}

      <h3 class="h3">Sessions</h3>
      <div class="ses-list">${sessionCards}</div>

      <h3 class="h3">Progression rules</h3>
      <div class="card">
        <ul class="kv-list">
          <li><span class="k">Last set RPE ≤ 7</span><span class="v">+2.5kg lower / +1.25–2.5 upper</span></li>
          <li><span class="k">Last set RPE 8</span><span class="v">Hold load, repeat</span></li>
          <li><span class="k">Last set RPE 9+</span><span class="v">Drop 5%, rebuild</span></li>
          <li><span class="k">2× RPE 9+ in a row</span><span class="v">Auto-deload</span></li>
        </ul>
      </div>
    `;
  }
};

// ===== SESSION DETAIL =====
export const sessionDetail = {
  title: 'Session',
  render(ctx) {
    const phase = Plan.getPhase(ctx.phaseId);
    const week = Plan.getWeek(ctx.phaseId, ctx.weekNum);
    if (!phase || !week) return '<div class="empty">Session not found.</div>';
    const sess = week.sessions[ctx.sessionIdx];
    if (!sess) return '<div class="empty">Session not found.</div>';

    const key = Utils.weekKey(phase.id, week.num, ctx.sessionIdx);
    const sd = SessionHelper.data(key);
    const isDone = sd && sd.completed;
    const isStarted = sd && sd.startedAt && !sd.completed;
    const showForm = !!sessionDetail._showForm;

    const items = sess.items.map(it => `
      <div class="exercise">
        <div class="e-num">${Utils.escapeHtml(it.num)}</div>
        <div class="e-name">${Utils.escapeHtml(it.name)}${it.note ? `<small>${Utils.escapeHtml(it.note).replace(/\n/g, '<br>')}</small>` : ''}</div>
        <div class="e-meta">
          <div class="e-sets">${Utils.escapeHtml(it.sets)}</div>
          <div class="e-rpe ${it.tag || ''}">${Utils.escapeHtml(it.rpe)}</div>
        </div>
      </div>
    `).join('');

    // Action bar — three states: not started, in progress, completed
    let actionBar = '';
    if (isDone) {
      const completedRow = `
        <div class="card" style="margin-bottom:14px;">
          <div class="eyebrow" style="color:var(--moss); margin-bottom:8px;">✓ Completed</div>
          <ul class="kv-list">
            ${sd.completedAt ? `<li><span class="k">Completed</span><span class="v">${new Date(sd.completedAt).toLocaleString()}</span></li>` : ''}
            ${sd.startedAt && sd.completedAt ? `<li><span class="k">Duration</span><span class="v">${Utils.formatDuration(sd.startedAt, sd.completedAt)}</span></li>` : ''}
            ${sd.quality != null ? `<li><span class="k">Session quality</span><span class="v">${sd.quality}/5</span></li>` : ''}
            ${sd.energy != null ? `<li><span class="k">Energy level</span><span class="v">${sd.energy}/5</span></li>` : ''}
            ${sd.recovery != null ? `<li><span class="k">Recovery level</span><span class="v">${sd.recovery}/5</span></li>` : ''}
            ${sd.notes ? `<li><span class="k">Notes</span><span class="v" style="text-align:right; max-width:60%;">${Utils.escapeHtml(sd.notes)}</span></li>` : ''}
          </ul>
          <button class="btn-secondary" style="margin-top:12px;" onclick="if(confirm('Reopen this session?')){State.actions.uncompleteSession('${key}'); Router.refresh();}">Reopen session</button>
        </div>
      `;
      actionBar = completedRow;
    } else if (showForm) {
      actionBar = `
        <div class="card" style="margin-bottom:14px;">
          <div class="eyebrow" style="margin-bottom:10px;">How did it go?</div>
          <div class="form-row">
            <label>Session quality · how well did you train?</label>
            <div class="rating-row" id="rate-quality"></div>
          </div>
          <div class="form-row">
            <label>Energy level · how energised did you feel?</label>
            <div class="rating-row" id="rate-energy"></div>
          </div>
          <div class="form-row">
            <label>Recovery level · how recovered did you feel coming in?</label>
            <div class="rating-row" id="rate-recovery"></div>
          </div>
          <div class="form-row">
            <label>Notes (optional)</label>
            <textarea id="ses-notes" placeholder="Anything worth flagging — load felt heavy, knee twinge, breakthrough..."></textarea>
          </div>
          <button class="btn-primary" onclick="Screens['session-detail'].submit('${key}')">Save & complete</button>
          <button class="btn-secondary" style="margin-top:8px;" onclick="Screens['session-detail']._showForm=false; Router.refresh();">Cancel</button>
        </div>
      `;
    } else if (isStarted) {
      actionBar = `
        <div class="card" style="margin-bottom:14px;">
          <div class="eyebrow" style="color:var(--rust); margin-bottom:8px;">▶ In progress</div>
          <ul class="kv-list">
            <li><span class="k">Started</span><span class="v" id="started-at-text">${new Date(sd.startedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></li>
            <li><span class="k">Elapsed</span><span class="v" id="elapsed-text">—</span></li>
          </ul>
          <button class="btn-primary" style="margin-top:12px;" onclick="Screens['session-detail']._showForm=true; Router.refresh();">Complete session</button>
        </div>
      `;
    } else {
      actionBar = `
        <button class="btn-primary" style="margin-bottom:14px;" onclick="State.actions.startSession('${key}'); Router.refresh();">Start session</button>
      `;
    }

    return `
      <div class="eyebrow">Phase ${phase.id} · Week ${week.num}</div>
      <h1 class="h1">${Utils.escapeHtml(sess.title)}</h1>
      <div class="sub">${Utils.escapeHtml(sess.duration)}</div>

      ${actionBar}

      <h3 class="h3">Workout</h3>
      <div class="session" style="margin-bottom:14px;">
        ${items}
      </div>

      <h3 class="h3">RPE quick reference</h3>
      <div class="card">
        <ul class="kv-list">
          <li><span class="k">RPE 6</span><span class="v">4 reps in reserve</span></li>
          <li><span class="k">RPE 7</span><span class="v">3 reps in reserve</span></li>
          <li><span class="k">RPE 8</span><span class="v">2 reps in reserve</span></li>
          <li><span class="k">RPE 9</span><span class="v">1 rep in reserve — back off</span></li>
        </ul>
      </div>
    `;
  },
  _showForm: false,
  _ratingState: { quality: null, energy: null, recovery: null },
  _lastKey: null,
  onShow(ctx, el) {
    const key = Utils.weekKey(ctx.phaseId, ctx.weekNum, ctx.sessionIdx);
    // Reset transient form state when entering a new session
    if (sessionDetail._lastKey !== key) {
      sessionDetail._showForm = false;
      sessionDetail._ratingState = { quality: null, energy: null, recovery: null };
      sessionDetail._lastKey = key;
    }
    // Render rating selectors if the form is shown
    if (sessionDetail._showForm) {
      ['quality','energy','recovery'].forEach(field => {
        const host = el.querySelector('#rate-' + field);
        if (!host) return;
        host.innerHTML = [1,2,3,4,5].map(n => {
          const sel = sessionDetail._ratingState[field] === n ? ' selected' : '';
          return `<button type="button" class="rating-btn${sel}" data-field="${field}" data-val="${n}">${n}</button>`;
        }).join('');
        host.querySelectorAll('.rating-btn').forEach(b => b.addEventListener('click', () => {
          sessionDetail._ratingState[b.dataset.field] = parseInt(b.dataset.val);
          host.querySelectorAll('.rating-btn').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
        }));
      });
    }
    // Elapsed-time ticker for in-progress sessions
    const sd = SessionHelper.data(key);
    if (sd && sd.startedAt && !sd.completed) {
      const tick = () => {
        const elapsed = el.querySelector('#elapsed-text');
        if (!elapsed) return;
        const ms = Date.now() - new Date(sd.startedAt).getTime();
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        elapsed.textContent = m + 'm ' + s.toString().padStart(2, '0') + 's';
        if (el.isConnected) setTimeout(tick, 1000);
      };
      tick();
    }
  },
  submit(key) {
    const r = sessionDetail._ratingState;
    const notes = document.getElementById('ses-notes')?.value || '';
    State.actions.completeSession(key, {
      quality: r.quality,
      energy: r.energy,
      recovery: r.recovery,
      notes
    });
    // Reset transient form state
    sessionDetail._showForm = false;
    sessionDetail._ratingState = { quality: null, energy: null, recovery: null };
    sessionDetail._lastKey = null;
    Router.refresh();
  }
};
