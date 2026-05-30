/**
 * Router — stack-based navigation with iOS-style transitions.
 *
 * Manages a navigation stack of screens. Each screen is identified by id and
 * resolved against the Screens registry passed at init time.
 *
 * Push/pop animates left/right transitions. switchTab resets the stack.
 *
 * Browser back/forward integration via History API + popstate listener.
 */

import * as Screens from '../screens/index.js';

const stack = []; // [{ screenId, ctx, title }]
let currentEl = null;
let transitioning = false;

function renderScreen(entry, direction) {
  const screen = Screens.registry[entry.screenId];
  if (!screen) { console.warn('Unknown screen:', entry.screenId); return; }

  const el = document.createElement('div');
  el.className = 'screen';
  el.dataset.screen = entry.screenId;
  el.innerHTML = `<div class="screen-pad">${screen.render(entry.ctx || {})}</div>`;

  if (direction === 'push') el.classList.add('enter-from-right');
  document.getElementById('stack').appendChild(el);

  // Force reflow so animation runs
  el.getBoundingClientRect();

  if (direction === 'push') {
    el.classList.remove('enter-from-right');
    if (currentEl) currentEl.classList.add('exit-to-left');
  } else if (direction === 'pop') {
    if (currentEl) currentEl.classList.add('exit-to-right');
  }

  const prev = currentEl;
  setTimeout(() => {
    if (prev && prev !== el) prev.remove();
    transitioning = false;
    if (screen.onShow) screen.onShow(entry.ctx || {}, el);
  }, direction === 'replace' ? 0 : 300);

  currentEl = el;
  updateTopBar(entry.title, stack.length > 1);
  updateTabBar(entry.screenId);
  attachScrollListener(el);
}

function attachScrollListener(el) {
  const topbar = document.getElementById('topbar');
  el.addEventListener('scroll', () => {
    if (el.scrollTop > 4) topbar.classList.add('elevated');
    else topbar.classList.remove('elevated');
  });
}

export function push(screenId, ctx = {}, title) {
  if (transitioning) return;
  transitioning = true;
  const entry = { screenId, ctx, title: title || Screens.registry[screenId]?.title || screenId };
  stack.push(entry);
  history.pushState({ depth: stack.length }, '', '#' + screenId);
  renderScreen(entry, 'push');
}

export function pop() {
  if (transitioning || stack.length <= 1) return;
  transitioning = true;
  stack.pop();
  history.back();
  const entry = stack[stack.length - 1];
  renderScreen(entry, 'pop');
}

export function switchTab(tabId) {
  if (transitioning) return;
  if (stack.length === 1 && stack[0].screenId === tabId) {
    if (currentEl) currentEl.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  transitioning = true;
  stack.length = 0;
  const entry = { screenId: tabId, ctx: {}, title: Screens.registry[tabId]?.title || tabId };
  stack.push(entry);
  history.replaceState({ depth: 1 }, '', '#' + tabId);
  renderScreen(entry, 'replace');
}

export function refresh() {
  if (!stack.length) return;
  const entry = stack[stack.length - 1];
  const screen = Screens.registry[entry.screenId];
  if (!screen || !currentEl) return;
  currentEl.innerHTML = `<div class="screen-pad">${screen.render(entry.ctx || {})}</div>`;
  if (screen.onShow) screen.onShow(entry.ctx || {}, currentEl);
}

function updateTopBar(title, hasBack) {
  document.getElementById('topbar-title').textContent = title || '';
  const back = document.getElementById('btn-back');
  back.style.visibility = hasBack ? 'visible' : 'hidden';
}

function updateTabBar(currentScreen) {
  const tabMap = {
    home: 'home', phases: 'phases', 'phase-detail': 'phases',
    'week-detail': 'phases', 'session-detail': 'phases',
    tracking: 'tracking', checkin: 'tracking', metrics: 'tracking',
    trends: 'tracking', log: 'tracking',
    profile: 'profile', overview: 'profile', decisions: 'profile',
    principles: 'profile', reassess: 'profile',
    settings: 'settings'
  };
  const activeTab = tabMap[currentScreen] || 'home';
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === activeTab)
  );
}

export const getStack = () => stack;

// Browser back/forward integration
window.addEventListener('popstate', () => {
  if (stack.length > 1) {
    stack.pop();
    const entry = stack[stack.length - 1];
    renderScreen(entry, 'pop');
  }
});

export default { push, pop, switchTab, refresh, getStack };
