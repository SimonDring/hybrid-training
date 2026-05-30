/**
 * PWA — service worker registration, install hints, update notifications.
 *
 * Fails silently if not supported (older Safari, file:// loads, etc).
 * All side-effects deferred until init() is called from the bootstrap.
 */

const STORAGE_KEY_INSTALL_DISMISSED = 'htp_pwa_install_dismissed';
let deferredInstallPrompt = null;
let updateAvailable = false;

// ---------- Service Worker registration ----------
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  // SW requires HTTPS or localhost — skip on file:// or HTTP
  if (location.protocol !== 'https:' &&
      location.hostname !== 'localhost' &&
      location.hostname !== '127.0.0.1') {
    console.info('[PWA] Service Worker skipped — non-secure context.');
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          updateAvailable = true;
          showUpdateToast(newWorker);
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Periodically check for updates while app is open
    setInterval(() => { reg.update().catch(() => {}); }, 30 * 60 * 1000);
  } catch (err) {
    console.warn('[PWA] SW registration failed:', err);
  }
}

// ---------- Update toast ----------
function showUpdateToast(newWorker) {
  let toast = document.getElementById('pwa-update-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.className = 'pwa-update-toast';
    toast.innerHTML = `
      <div class="put-body">
        <div class="put-title">Update available</div>
        <div class="put-text">A new version is ready.</div>
      </div>
      <button class="put-btn" id="pwa-update-btn">Reload</button>
    `;
    document.body.appendChild(toast);
    toast.querySelector('#pwa-update-btn').addEventListener('click', () => {
      if (newWorker) newWorker.postMessage({ type: 'SKIP_WAITING' });
      // controllerchange listener triggers reload
    });
  }
  requestAnimationFrame(() => toast.classList.add('visible'));
}

// ---------- Install detection ----------
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// ---------- iOS install hint ----------
function maybeShowIOSInstallHint() {
  if (!isIOS()) return;
  if (isStandalone()) return;
  if (localStorage.getItem(STORAGE_KEY_INSTALL_DISMISSED)) return;

  setTimeout(() => {
    if (isStandalone()) return;
    const banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pib-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12l7-7 7 7"/>
        </svg>
      </div>
      <div class="pib-body">
        <div class="pib-title">Install Hybrid</div>
        <div class="pib-text">Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> for the full-screen app experience.</div>
      </div>
      <button class="pib-close" aria-label="Dismiss">×</button>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('visible'));
    banner.querySelector('.pib-close').addEventListener('click', () => {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
      localStorage.setItem(STORAGE_KEY_INSTALL_DISMISSED, '1');
    });
  }, 12000);
}

// ---------- Android / desktop install prompt capture ----------
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

export async function triggerInstall() {
  if (!deferredInstallPrompt) {
    if (isIOS()) {
      alert('To install: tap the Share button, then "Add to Home Screen".');
    } else {
      alert('Install is not available right now. Use your browser menu to add to home screen.');
    }
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return outcome;
}

// ---------- Cache control ----------
export function clearAllCaches() {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) { resolve(); return; }
    const channel = new MessageChannel();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    channel.port1.onmessage = (e) => { if (e.data && e.data.type === 'CACHES_CLEARED') finish(); };
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' }, [channel.port2]);
    setTimeout(finish, 2000);
  });
}

// ---------- Init ----------
export function init() {
  registerSW();
  maybeShowIOSInstallHint();
}

export default { init, isStandalone, isIOS, triggerInstall, clearAllCaches };
