/**
 * Profile screens — reference content (largely static).
 *   profile     → physical/goal/lifestyle baseline
 *   overview    → 12-month phase timeline
 *   decisions   → if/then framework for disruptions
 *   principles  → operating principles (non-negotiables)
 *   reassess    → quarterly reassessment questionnaire
 */

import * as Plan from '../data/Plan.js';
import * as State from '../modules/State.js';
import * as Utils from '../modules/Utils.js';

export const profile = {
  title: 'Profile',
  render() {
    return `
      <div class="eyebrow">§ 01</div>
      <h1 class="h1">Profile</h1>
      <div class="sub">Baseline at week 4. Updated at each quarterly reassessment.</div>

      <h3 class="h3">Physical baseline</h3>
      <div class="card"><ul class="kv-list">
        <li><span class="k">Age / BW</span><span class="v">28 / 80 kg</span></li>
        <li><span class="k">Squat top set</span><span class="v">75–80 kg × 5</span></li>
        <li><span class="k">Bench top set</span><span class="v">50 kg</span></li>
        <li><span class="k">Hex deadlift</span><span class="v">70–75 kg</span></li>
        <li><span class="k">Continuous swim</span><span class="v">~200m</span></li>
        <li><span class="k">Sleep</span><span class="v">7–8 h</span></li>
      </ul></div>

      <h3 class="h3">Injury status</h3>
      <div class="card">
        <ul class="kv-list">
          <li><span class="k">Left patellar tendon</span><span class="v">Mild, improving</span></li>
          <li><span class="k">Right knee (post-marathon)</span><span class="v">Resolved</span></li>
          <li><span class="k">Reverse Nordic response</span><span class="v">Positive</span></li>
        </ul>
        <div class="callout"><strong>Watchpoint</strong>Patellar work stays permanently — load management tool, not rehab.</div>
      </div>

      <h3 class="h3">Goals (ranked)</h3>
      <div class="card"><ul class="kv-list">
        <li><span class="k">1 · Anchor</span><span class="v">1:40 half · Dec '26</span></li>
        <li><span class="k">2 · Swim</span><span class="v">2.5 km continuous</span></li>
        <li><span class="k">3 · Ski</span><span class="v">Ready Nov '26</span></li>
        <li><span class="k">4 · Through-line</span><span class="v">Cardio + functional strength</span></li>
        <li><span class="k">Stretch</span><span class="v">1:35 half</span></li>
      </ul></div>

      <h3 class="h3">Lifestyle constraints</h3>
      <div class="card"><ul class="kv-list">
        <li><span class="k">Gym days</span><span class="v">Mon/Tue/Thu/Fri</span></li>
        <li><span class="k">Saturday</span><span class="v">Golf (flex)</span></li>
        <li><span class="k">Pool</span><span class="v">20 m</span></li>
        <li><span class="k">October</span><span class="v">10d Africa — deload</span></li>
        <li><span class="k">Big variable</span><span class="v">Move abroad 2–3 mo</span></li>
      </ul></div>

      <h3 class="h3">Motivational profile</h3>
      <div class="card"><p style="font-size:13.5px;">High intrinsic adherence. Thrives on 6–8 week blocks with measurable mini-goals. Heavy Monday leg day preferred — hardest done first. Welcomes variety between blocks, not within. Fiancée trains alongside in pool at weekends — adherence asset through relocation.</p></div>
    `;
  }
};

// ===== OVERVIEW =====
export const overview = {
  title: 'Overview',
  render() {
    const rows = Plan.getPhases().map(p => `
      <div class="phase-row">
        <div class="when"><span class="num">0${p.id}</span>${p.range}</div>
        <div>
          <h3>${Utils.escapeHtml(p.title)}</h3>
          <div class="tags">${p.tags.map((t, i) => `<span class="tag ${['','moss','ochre','slate'][i%4]}">${Utils.escapeHtml(t)}</span>`).join('')}</div>
          <p>${Utils.escapeHtml(p.summary)}</p>
        </div>
      </div>
    `).join('');
    return `
      <div class="eyebrow">§ 02</div>
      <h1 class="h1">Overview</h1>
      <div class="sub">12-month phase architecture · outcome-gated</div>
      ${rows}
      <div class="callout">
        <strong>Why phases not weeks</strong>
        A week-by-week plan written 12 months out is fiction. Phase 1 is locked; Phases 2–5 are provisional — rewritten from your data at each quarterly checkpoint.
      </div>
    `;
  }
};

// ===== DECISIONS =====
export const decisions = {
  title: 'Decisions',
  render() {
    const items = [
      { s: 'Scenario A · Patellar tendon flare', h: 'Left knee sensitivity returns to "noticeable in daily life"', t: 'Drop squat & lunge loads 25% for 1 week. Replace BSS with Spanish squats & ISO holds. Do not stop training — load management beats rest. Reverse Nordics stay.', r: 'Pain ≤3/10 during activity, gone in 24h = modified training. >3/10 or lingering = physio.' },
      { s: 'Scenario B · Limited/no gym', h: 'Hotel gym only, or no gym at all', t: '3× per week minimum. Hotel: 4-day with DBs. No gym: 3× bodyweight full-body. Swim if available.', r: 'Re-entry: drop loads 10% week 1 back, normal week 2.' },
      { s: 'Scenario C · Strength plateau 3+ weeks', h: 'Loads stuck despite RPE ≤8', t: 'Almost always recovery or technique. Audit sleep & nutrition first. Then vary reps/sets. Then full deload. Only then change exercise.', r: "Don't chase load before checking inputs." },
      { s: 'Scenario D · Move abroad mid-phase', h: 'Relocation falls in any phase', t: '2-week transition: maintenance only. 3 strength full-body, 2 swims, walking. Once new gym/pool sorted, audit & revise next phase.', r: "Honesty about timing beats pretending nothing changed." },
      { s: 'Scenario E · Sleep <7h for 7+ days', h: 'Work crunch, jet lag, life', t: 'Cap all sessions at RPE 7 until sleep recovers. Skip Fri finisher. Keep showing up.', r: 'Adaptation = recovery. Insufficient recovery + same training = injury.' },
      { s: 'Scenario F · Running ramp triggers pain', h: 'Shin/calf/knee pain on consecutive runs (Phase 2+)', t: 'One missed run = OK to push. Two consecutive with same-location pain = stop running 7 days, swim/bike. Re-enter at 50%.', r: '10%/wk increase max. Hard 40 km/wk cap year one.' },
      { s: 'Scenario G · Golf wipes out Saturday', h: 'Played 18, no swim', t: 'Fine. Saturday is flex. Do not try to make up the swim midweek.', r: 'If you played golf or trained, the day counted.' }
    ];
    return `
      <div class="eyebrow">§ 05</div>
      <h1 class="h1">Decisions</h1>
      <div class="sub">If/then for common disruptions.</div>
      ${items.map(d => `
        <div class="decision-card">
          <div class="scen">${Utils.escapeHtml(d.s)}</div>
          <h4>${Utils.escapeHtml(d.h)}</h4>
          <p>${Utils.escapeHtml(d.t)}</p>
          <span class="rule">${Utils.escapeHtml(d.r)}</span>
        </div>
      `).join('')}
    `;
  }
};

// ===== PRINCIPLES =====
export const principles = {
  title: 'Principles',
  render() {
    const items = [
      ['i.', 'Tendons set the ceiling', 'Muscle adapts in weeks, connective tissue in months. Every progression paced to the slower system. Patellar work permanent.'],
      ['ii.', 'Two strength sessions per week, always', 'No matter the phase, how much running or swimming, or how busy. Two real sessions or you lose the asset that makes everything possible.'],
      ['iii.', 'Mobility is non-optional', 'Reverse Nordic, hip flow, t-spine. Not finishers — load. Picking-up-the-kids-without-stiffness lives or dies on this.'],
      ['iv.', 'Aerobic base serves longevity first', 'Z2 capacity is the through-line — cardiac, cognitive, metabolic. Half marathon is downstream, not the point.'],
      ['v.', 'Run volume has hard ceilings', '10%/week increase max. 40 km/wk cap year one. No upside in being the exception.'],
      ['vi.', 'Mandatory deload every 4th week', 'The point is you don\'t see the need until you\'ve missed one and broken down. Calendared, not negotiated.'],
      ['vii.', 'Adaptation = stimulus + recovery', 'Both halves matter. If sleep/stress/nutrition drop, training output drops automatically.'],
      ['viii.', 'Saturday is flex, forever', 'Golf is part of who you are. The plan supports the life, not the other way.']
    ];
    return `
      <div class="eyebrow">§ 06</div>
      <h1 class="h1">Principles</h1>
      <div class="sub">The non-negotiables.</div>
      <div class="card">
        ${items.map(([r,h,p]) => `
          <div class="principle"><div class="roman">${r}</div><div><h4>${Utils.escapeHtml(h)}</h4><p>${Utils.escapeHtml(p)}</p></div></div>
        `).join('')}
      </div>
    `;
  }
};

// ===== REASSESSMENT =====
export const reassess = {
  title: 'Reassessment',
  render() {
    const s = State.get();
    const sections = [
      { t: 'Performance & body', qs: [
        ['q1','Current 5RM loads on squat, deadlift, bench? Change this quarter?'],
        ['q2','Longest continuous swim, at what perceived effort?'],
        ['q3','If running — longest comfortable Z2 run, at what pace?'],
        ['q4','Body composition shift (eyeballed)?'],
        ['q5','Niggles? Where, when, what makes worse / helps?']
      ]},
      { t: 'Recovery & lifestyle', qs: [
        ['q6','Average sleep this quarter? What compromised it?'],
        ['q7','Nutrition adherence — pre-workout, post-swim refeed?'],
        ['q8','Stress load — work, travel, relationships?']
      ]},
      { t: 'Adherence & response', qs: [
        ['q9','% of prescribed sessions completed?'],
        ['q10','Most-looked-forward-to sessions? Grind sessions?'],
        ['q11','Exercises quietly avoided?'],
        ['q12','What did I learn about my body that I didn\'t know at start?']
      ]},
      { t: 'Goals & context', qs: [
        ['q13','Anchor goals still right?'],
        ['q14','Move status & next 12 weeks access picture?'],
        ['q15','One change you\'d make to the last 12 weeks?']
      ]}
    ];
    const sectionHtml = sections.map(sec => `
      <div class="reassess-section">
        <h3 class="h3">${Utils.escapeHtml(sec.t)}</h3>
        <div class="card">
          ${sec.qs.map(([qid, txt]) => `
            <div class="reassess-q">
              <span class="qnum">${qid.toUpperCase()}</span>
              <p>${Utils.escapeHtml(txt)}</p>
              <textarea data-q="${qid}">${Utils.escapeHtml(s.reassess[qid] || '')}</textarea>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    return `
      <div class="eyebrow">§ 07</div>
      <h1 class="h1">Reassessment</h1>
      <div class="sub">Every 12 weeks. Answers save as you type.</div>
      ${sectionHtml}
      <div class="callout">
        <strong>Bring it back</strong>
        At quarter-end, export your data and send to the coach. Next phase rebuilt from actual data, not assumptions from 12 weeks ago.
      </div>
    `;
  },
  onShow(ctx, el) {
    el.querySelectorAll('[data-q]').forEach(ta => {
      ta.addEventListener('input', () => { State.actions.setReassess(ta.dataset.q, ta.value); });
    });
  }
};
