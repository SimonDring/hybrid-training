/**
 * Tracking screens — data-entry and visualisation flow.
 *   tracking → hub
 *   checkin  → weekly metrics form
 *   metrics  → snapshot stats
 *   trends   → multi-metric charts
 *   log      → editable history
 */

import * as State from '../modules/State.js';
import * as Utils from '../modules/Utils.js';
import Router from '../modules/Router.js';

export const tracking = {
  title: 'Tracking',
  render() {
    const s = State.get();
    const sessionsDone = Utils.countCompleted(s.sessions);
    return `
      <div class="eyebrow">§ 04</div>
      <h1 class="h1">Tracking</h1>
      <div class="sub">Weekly metrics drive the plan.</div>

      <button class="list-card" onclick="Router.push('checkin')">
        <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></div>
        <div class="lc-body">
          <div class="lc-title">Weekly check-in</div>
          <div class="lc-desc">BW, RHR, sleep, knee — 2 min</div>
        </div>
        <div class="lc-chev">${Utils.chevronRight}</div>
      </button>

      <button class="list-card" onclick="Router.push('metrics')">
        <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="9" x2="9" y2="15"></line><line x1="15" y1="9" x2="15" y2="15"></line><line x1="12" y1="11" x2="12" y2="15"></line></svg></div>
        <div class="lc-body">
          <div class="lc-title">Key metrics</div>
          <div class="lc-desc">${s.logs.length} weeks logged · ${sessionsDone} sessions done</div>
        </div>
        <div class="lc-chev">${Utils.chevronRight}</div>
      </button>

      <button class="list-card" onclick="Router.push('trends')">
        <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
        <div class="lc-body">
          <div class="lc-title">Trends</div>
          <div class="lc-desc">Charts over time</div>
        </div>
        <div class="lc-chev">${Utils.chevronRight}</div>
      </button>

      <button class="list-card" onclick="Router.push('log')">
        <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></div>
        <div class="lc-body">
          <div class="lc-title">Log history</div>
          <div class="lc-desc">All past check-ins</div>
        </div>
        <div class="lc-chev">${Utils.chevronRight}</div>
      </button>

      <div class="callout">
        <strong>Why this matters</strong>
        RHR is the earliest-warning recovery metric. Bodyweight is trend-only. Knee rating goes in every week even when zero.
      </div>
    `;
  }
};

// ===== CHECK-IN =====
export const checkin = {
  title: 'Weekly Check-in',
  render() {
    return `
      <div class="eyebrow">§ 04 · A</div>
      <h1 class="h1">Check-in</h1>
      <div class="sub">2 minutes a week. Set a Sunday evening reminder.</div>

      <div class="form-card">
        <div class="form-row"><label>Week ending</label><input type="date" id="f-date"></div>
        <div class="form-row"><label>Bodyweight (kg)</label><input type="number" step="0.1" id="f-bw" inputmode="decimal" placeholder="80.2"></div>
        <div class="form-row"><label>Resting HR (bpm)</label><input type="number" id="f-rhr" inputmode="numeric" placeholder="56"></div>
        <div class="form-row"><label>Avg RPE (1–10)</label><input type="number" step="0.1" min="1" max="10" id="f-rpe" inputmode="decimal" placeholder="7.5"></div>
        <div class="form-row"><label>Sleep (1–10)</label><input type="number" step="0.1" min="1" max="10" id="f-sleep" inputmode="decimal" placeholder="8"></div>
        <div class="form-row"><label>Knee (0–10)</label><input type="number" step="0.5" min="0" max="10" id="f-knee" inputmode="decimal" placeholder="1"></div>
        <div class="form-row"><label>Notes</label><textarea id="f-notes" placeholder="Anything worth flagging…"></textarea></div>
        <button class="btn-primary" onclick="Screens.checkin.save()">Save week</button>
      </div>
    `;
  },
  onShow(ctx, el) {
    const d = el.querySelector('#f-date');
    if (d && !d.value) d.valueAsDate = new Date();
  },
  save() {
    const get = id => document.getElementById(id)?.value || '';
    const date = get('f-date');
    if (!date) { alert('Please set the week-ending date.'); return; }
    State.actions.addLog({
      date,
      bw: get('f-bw'),
      rhr: get('f-rhr'),
      rpe: get('f-rpe'),
      sleep: get('f-sleep'),
      knee: get('f-knee'),
      notes: get('f-notes')
    });
    alert('Saved.');
    Router.pop();
  }
};

// ===== METRICS =====
export const metrics = {
  title: 'Key Metrics',
  render() {
    const s = State.get();
    const sorted = [...s.logs].sort((a,b) => (a.date || '').localeCompare(b.date || ''));
    const latest = sorted[sorted.length-1];
    const first = sorted[0];

    let bwDelta = 'vs. baseline', bwClass = '';
    if (latest && first && first !== latest && first.bw && latest.bw) {
      const d = (parseFloat(latest.bw) - parseFloat(first.bw)).toFixed(1);
      bwDelta = (d >= 0 ? '+' : '') + d + ' kg';
      bwClass = Math.abs(d) > 2 ? 'up' : '';
    }
    let rhrDelta = 'vs. 4-wk avg', rhrClass = '';
    if (sorted.length >= 5 && latest?.rhr) {
      const prior = sorted.slice(-5,-1).map(l => parseFloat(l.rhr)).filter(n => !isNaN(n));
      if (prior.length) {
        const avg = prior.reduce((a,b)=>a+b,0)/prior.length;
        const d = (parseFloat(latest.rhr) - avg).toFixed(1);
        rhrDelta = (d >= 0 ? '+' : '') + d;
        rhrClass = d >= 5 ? 'up' : '';
      }
    }
    const sleepNums = sorted.slice(-4).map(l => parseFloat(l.sleep)).filter(n => !isNaN(n));
    const avgSleep = sleepNums.length ? (sleepNums.reduce((a,b)=>a+b,0)/sleepNums.length).toFixed(1) : '—';
    const sessionsDone = Utils.countCompleted(s.sessions);
    const last4 = sorted.slice(-4).length;

    return `
      <div class="eyebrow">§ 04 · B</div>
      <h1 class="h1">Key metrics</h1>
      <div class="sub">Snapshot of recent state.</div>

      <div class="stat-grid">
        <div class="stat-card"><div class="l">Weeks logged</div><div class="v">${s.logs.length}</div><div class="d">total</div></div>
        <div class="stat-card"><div class="l">Adherence</div><div class="v">${last4}/4</div><div class="d">last 4 wks</div></div>
        <div class="stat-card"><div class="l">Latest BW</div><div class="v">${latest?.bw || '—'}</div><div class="d ${bwClass}">${bwDelta}</div></div>
        <div class="stat-card"><div class="l">Latest RHR</div><div class="v">${latest?.rhr || '—'}</div><div class="d ${rhrClass}">${rhrDelta}</div></div>
        <div class="stat-card"><div class="l">Avg sleep</div><div class="v">${avgSleep}</div><div class="d">4-wk avg</div></div>
        <div class="stat-card"><div class="l">Sessions</div><div class="v">${sessionsDone}</div><div class="d">total done</div></div>
      </div>

      <div class="card">
        <h4 style="font-family:var(--mono);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--rust);margin-bottom:10px;">What these tell us</h4>
        <p style="font-size:13px;margin-bottom:8px;"><strong>RHR</strong> · +5 bpm vs. baseline = under-recovered.</p>
        <p style="font-size:13px;margin-bottom:8px;"><strong>BW</strong> · drift &gt;2 kg / 4 wks unintended = nutrition audit.</p>
        <p style="font-size:13px;margin-bottom:8px;"><strong>Sleep</strong> · two weeks &lt;7 = cap intensity, audit.</p>
        <p style="font-size:13px;"><strong>Adherence</strong> · 4/4 logging keeps planning accurate.</p>
      </div>
    `;
  }
};

// ===== TRENDS =====
export const trends = {
  title: 'Trends',
  range: 'all',
  render() {
    const range = this.range;
    return `
      <div class="eyebrow">§ 04 · C</div>
      <h1 class="h1">Trends</h1>
      <div class="sub">Direction beats single readings.</div>

      <div class="chart-filter">
        <button class="${range==='4w'?'active':''}" onclick="Screens.trends.setRange('4w')">4 wks</button>
        <button class="${range==='12w'?'active':''}" onclick="Screens.trends.setRange('12w')">12 wks</button>
        <button class="${range==='all'?'active':''}" onclick="Screens.trends.setRange('all')">All</button>
      </div>

      <div class="chart-card"><h5>Bodyweight</h5><canvas class="chart-canvas" id="ch-bw"></canvas></div>
      <div class="chart-card"><h5>Resting HR</h5><canvas class="chart-canvas" id="ch-rhr"></canvas></div>
      <div class="chart-card"><h5>Sleep score</h5><canvas class="chart-canvas" id="ch-sleep"></canvas></div>
      <div class="chart-card"><h5>Knee rating</h5><canvas class="chart-canvas" id="ch-knee"></canvas></div>
    `;
  },
  setRange(r) { this.range = r; Router.refresh(); },
  onShow() { setTimeout(() => trends.drawAll(), 50); },
  drawAll() {
    const s = State.get();
    const sorted = [...s.logs].sort((a,b) => (a.date || '').localeCompare(b.date || ''));
    let data = sorted;
    if (trends.range === '4w') data = sorted.slice(-4);
    if (trends.range === '12w') data = sorted.slice(-12);
    trends.draw('ch-bw', data, 'bw', '#b04a2e');
    trends.draw('ch-rhr', data, 'rhr', '#2a3a44');
    trends.draw('ch-sleep', data, 'sleep', '#4a5d3a');
    trends.draw('ch-knee', data, 'knee', '#c89a3a');
  },
  draw(canvasId, data, key, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = 160;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    const points = data.map(d => ({ date: d.date, val: parseFloat(d[key]) })).filter(p => !isNaN(p.val));
    if (points.length < 2) {
      ctx.fillStyle = '#6a665d';
      ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.fillText(points.length === 0 ? 'No data — log check-ins' : 'Need 2+ entries', cssW/2, cssH/2);
      return;
    }

    const pad = { l: 36, r: 16, t: 16, b: 24 };
    const w = cssW - pad.l - pad.r;
    const h = cssH - pad.t - pad.b;
    const vals = points.map(p => p.val);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const yMin = min - range * 0.15, yMax = max + range * 0.15;

    ctx.strokeStyle = '#cbc3b3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + h);
    ctx.lineTo(pad.l + w, pad.t + h);
    ctx.stroke();

    ctx.fillStyle = '#6a665d';
    ctx.font = '9px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'right';
    for (let i = 0; i < 3; i++) {
      const yVal = yMin + (yMax - yMin) * (1 - i/2);
      const y = pad.t + h * (i/2);
      ctx.fillText(yVal.toFixed(1), pad.l - 6, y + 3);
      if (i > 0) {
        ctx.strokeStyle = '#ebe6db';
        ctx.beginPath();
        ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + w, y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = color + '22';
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad.l + (i / (points.length - 1)) * w;
      const y = pad.t + h - ((p.val - yMin) / (yMax - yMin)) * h;
      if (i === 0) { ctx.moveTo(x, pad.t + h); ctx.lineTo(x, y); }
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + w, pad.t + h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad.l + (i / (points.length - 1)) * w;
      const y = pad.t + h - ((p.val - yMin) / (yMax - yMin)) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = color;
    points.forEach((p, i) => {
      const x = pad.l + (i / (points.length - 1)) * w;
      const y = pad.t + h - ((p.val - yMin) / (yMax - yMin)) * h;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
    });

    ctx.fillStyle = '#6a665d';
    ctx.textAlign = 'center';
    const labels = points.length <= 4 ? points.map((_, i) => i) : [0, Math.floor((points.length-1)/2), points.length-1];
    labels.forEach(i => {
      const x = pad.l + (i / (points.length - 1)) * w;
      const d = points[i].date;
      ctx.fillText(d.length >= 10 ? d.substring(5) : d, x, pad.t + h + 16);
    });
  }
};

// ===== LOG HISTORY =====
export const log = {
  title: 'Log History',
  render() {
    const s = State.get();
    if (s.logs.length === 0) {
      return `<div class="eyebrow">§ 04 · D</div><h1 class="h1">Log history</h1><div class="empty">No entries yet. <br><br>Add your first check-in from Tracking.</div>`;
    }
    const sorted = [...s.logs].sort((a,b) => (b.date || '').localeCompare(a.date || ''));
    const rows = sorted.map(l => {
      const idx = s.logs.indexOf(l);
      return `<tr>
        <td>${Utils.escapeHtml(l.date)}</td>
        <td>${Utils.escapeHtml(l.bw || '—')}</td>
        <td>${Utils.escapeHtml(l.rhr || '—')}</td>
        <td>${Utils.escapeHtml(l.sleep || '—')}</td>
        <td>${Utils.escapeHtml(l.knee || '—')}</td>
        <td class="del" onclick="if(confirm('Delete?')){State.actions.deleteLog(${idx}); Router.refresh();}">×</td>
      </tr>`;
    }).join('');
    return `
      <div class="eyebrow">§ 04 · D</div>
      <h1 class="h1">Log history</h1>
      <div class="sub">${s.logs.length} entries</div>
      <div class="card" style="padding:10px;">
        <table class="log-table">
          <thead><tr><th>Week</th><th>BW</th><th>RHR</th><th>Sleep</th><th>Knee</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
};
