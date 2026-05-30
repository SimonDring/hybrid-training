/**
 * App bootstrap — the entry point loaded by index.html.
 *
 * Responsibilities:
 *   1. Import every module
 *   2. Expose them as window.X globals so inline `onclick="..."` handlers can find them
 *   3. Apply saved theme preference
 *   4. Hand off to Router for first-screen render
 *   5. Boot the PWA layer (service worker, install hints)
 *
 * Why globals: every interactive element in the screens uses inline event handlers
 * (onclick attributes). These execute in window scope, so the referenced names
 * must be window properties. When Stage 2 (React) is done, all the inline
 * handlers become JSX props and this whole globals block can be deleted.
 */

import Storage from './modules/Storage.js';
import Database from './modules/Database.js';
import State from './modules/State.js';
import * as Utils from './modules/Utils.js';
import * as Plan from './data/Plan.js';
import Router from './modules/Router.js';
import SessionHelper from './modules/SessionHelper.js';
import Screens from './screens/index.js';
import PWA from './pwa/PWA.js';

// ---------- Expose modules globally (transitional — see file header) ----------
window.Storage       = Storage;
window.Database      = Database;
window.State         = State;
window.Utils         = Utils;
window.Plan          = Plan;
window.Router        = Router;
window.SessionHelper = SessionHelper;
window.Screens       = Screens;   // Note: this is the route registry (not a registry of objects)
window.PWA           = PWA;

// Also expose each screen by its property name so inline handlers
// (`onclick="Screens.checkin.save()"`) resolve through the registry.
// The registry IS the Screens object the inline handlers expect.

// ---------- Bootstrap ----------
(function init() {
  // Apply saved theme preference
  const savedTheme = localStorage.getItem('htp_theme');
  if (savedTheme && savedTheme !== 'auto') {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  // Sync theme-color meta on first load
  const isDark = (savedTheme === 'dark') ||
    (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', isDark ? '#14110d' : '#f4f1ea');

  // Start at home, or from URL hash if present
  const hash = (location.hash || '').replace('#', '');
  const startScreen = Screens[hash] ? hash : 'home';
  Router.switchTab(startScreen);

  // Boot PWA (registers service worker, sets up install hints)
  PWA.init();
})();

// Re-draw charts on resize (Trends screen)
window.addEventListener('resize', () => {
  const top = Router.getStack().slice(-1)[0];
  if (top && top.screenId === 'trends') {
    setTimeout(() => Screens.trends && Screens.trends.drawAll && Screens.trends.drawAll(), 100);
  }
});
