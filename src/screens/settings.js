/**
 * Settings screen — appearance (theme), data export/import, PWA install,
 * data counts (sourced from Database), about, reset.
 */

import * as State from '../modules/State.js';
import Database from '../modules/Database.js';
import Router from '../modules/Router.js';
import * as PWA from '../pwa/PWA.js';

export const settings = {
  title: 'Settings',
  render() {
    const s = State.get();
    const currentTheme = localStorage.getItem('htp_theme') || 'auto';
    return `
      <div class="eyebrow">§ 08</div>
      <h1 class="h1">Settings</h1>
      <div class="sub">Your data lives on this device only.</div>

      <div class="settings-section">
        <h3 class="h3">Appearance</h3>
        <div class="settings-group">
          <div class="settings-row" style="cursor:default;">
            <span>Theme</span>
            <div class="theme-toggle">
              <button class="${currentTheme === 'light' ? 'active' : ''}" onclick="Screens.settings.setTheme('light')">Light</button>
              <button class="${currentTheme === 'dark' ? 'active' : ''}" onclick="Screens.settings.setTheme('dark')">Dark</button>
              <button class="${currentTheme === 'auto' ? 'active' : ''}" onclick="Screens.settings.setTheme('auto')">Auto</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="h3">Data</h3>
        <div class="settings-group">
          <button class="settings-row" onclick="Screens.settings.exportJSON()">
            <span>Export data</span>
            <span class="sr-meta">JSON</span>
          </button>
          <button class="settings-row" onclick="document.getElementById('import-input').click()">
            <span>Import data</span>
            <span class="sr-meta">JSON</span>
          </button>
          <input type="file" id="import-input" accept=".json" style="display:none" onchange="Screens.settings.importJSON(event)">
          <button class="settings-row danger" onclick="Screens.settings.resetAll()">
            <span>Reset all data</span>
            <span class="sr-meta">⚠</span>
          </button>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="h3">Stored</h3>
        <div class="settings-group">
          <div class="settings-row" style="cursor:default;">
            <span>Weekly check-ins</span>
            <span class="sr-meta">${Database.tables.weeklyCheckins.all().length}</span>
          </div>
          <div class="settings-row" style="cursor:default;">
            <span>Sessions tracked</span>
            <span class="sr-meta">${Database.tables.sessions.all().length}</span>
          </div>
          <div class="settings-row" style="cursor:default;">
            <span>Session logs</span>
            <span class="sr-meta">${Database.tables.sessionLogs.all().length}</span>
          </div>
          <div class="settings-row" style="cursor:default;">
            <span>Reassessments</span>
            <span class="sr-meta">${Database.tables.reassessments.all().length}</span>
          </div>
          <div class="settings-row" style="cursor:default;">
            <span>Wearable readings</span>
            <span class="sr-meta">${Database.tables.wearableReadings.all().length}</span>
          </div>
          <div class="settings-row" style="cursor:default;">
            <span>AI recommendations</span>
            <span class="sr-meta">${Database.tables.aiRecommendations.all().length}</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="h3">App</h3>
        <div class="settings-group">
          <div class="settings-row" style="cursor:default;">
            <span>Installed</span>
            <span class="sr-meta">${(PWA.isStandalone()) ? 'Yes · standalone' : 'No'}</span>
          </div>
          ${(!PWA.isStandalone()) ? `
          <button class="settings-row" onclick="Screens.settings.installApp()">
            <span>Install on this device</span>
            <span class="sr-meta">→</span>
          </button>` : ''}
          <div class="settings-row" style="cursor:default;">
            <span>Offline-ready</span>
            <span class="sr-meta">${('serviceWorker' in navigator) ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="h3">About</h3>
        <div class="settings-group">
          <div class="settings-row" style="cursor:default;">
            <span>Schema version</span>
            <span class="sr-meta">v4 · structured</span>
          </div>
          <div class="settings-row" style="cursor:default;">
            <span>Version</span>
            <span class="sr-meta">4.0</span>
          </div>
          <div class="settings-row" style="cursor:default;">
            <span>Phase architecture</span>
            <span class="sr-meta">52 weeks</span>
          </div>
        </div>
      </div>

      <div class="callout">
        <strong>About this app</strong>
        Fully offline. No accounts, no servers, no tracking. Export your data regularly to back up — especially before the move abroad. localStorage can be cleared by the browser if you go months without opening the app.
      </div>
    `;
  },
  exportJSON() {
    const data = Database.services.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hybrid-training-v4-' + new Date().toISOString().substring(0,10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  importJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!confirm('Replace your current data with this file?')) return;
        Database.services.importAll(data);
        alert('Imported.');
        Router.refresh();
      } catch (err) { alert('Not valid JSON.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  },
  resetAll() {
    if (!confirm('Delete ALL data? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure?')) return;
    State.actions.resetAll();
    // Also wipe service worker caches so a fresh app shell loads next time
    if (PWA.clearAllCaches) {
      PWA.clearAllCaches().finally(() => {
        Router.refresh();
        alert('All data cleared.');
      });
    } else {
      Router.refresh();
      alert('All data cleared.');
    }
  },
  installApp() {
    if (PWA.triggerInstall) PWA.triggerInstall();
  },
  setTheme(theme) {
    localStorage.setItem('htp_theme', theme);
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    // Update theme-color meta for iOS chrome
    const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#14110d' : '#f4f1ea');
    Router.refresh();
  }
};
