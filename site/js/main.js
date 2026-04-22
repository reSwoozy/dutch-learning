import { showGate, hideGate, onAuth } from './core/auth.js';
import { Progress } from './core/progress.js';
import { SRS } from './core/srs.js';
import { App } from './core/app.js';
import './core/router.js';
import './core/data.js';
import './ui/dom.js';
import './ui/toast.js';
import './ui/nav.js';
import './ui/keyboard.js';
import './ui/search.js';
import './pages/home.js';
import './pages/lessons.js';
import './pages/grammar.js';
import './pages/flashcards.js';
import './pages/verbs.js';
import './pages/reading.js';
import './pages/writing.js';
import './pages/culture.js';
import './pages/resources.js';
import './pages/tests.js';
import './pages/progress-dashboard.js';
import './pages/account.js';

window.App = App;
window.Progress = Progress;
window.SRS = SRS;

let appInitialized = false;
let currentUid = null;

function updateNavAvatar(user) {
  const host = document.getElementById('nav-account-avatar');
  if (!host) return;
  const name = user.displayName || user.email || 'Аккаунт';
  const link = document.getElementById('nav-account');
  if (link) link.title = name;
  if (user.photoURL) {
    host.innerHTML = `<img src="${user.photoURL}" alt="" referrerpolicy="no-referrer">`;
  } else {
    const initial = name.slice(0, 1).toUpperCase();
    host.textContent = initial;
    host.classList.add('nav-account__avatar--initials');
  }
}

function resetNavAvatar() {
  const host = document.getElementById('nav-account-avatar');
  if (!host) return;
  host.classList.remove('nav-account__avatar--initials');
  host.innerHTML = `
    <svg viewBox="0 0 20 20" width="18" height="18">
      <circle cx="10" cy="7" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path d="M3.5 16.5c1-3 3.6-4.6 6.5-4.6s5.5 1.6 6.5 4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `;
}

onAuth((user) => {
  if (user) {
    if (currentUid === user.uid) return;
    currentUid = user.uid;
    window.__dutchUser = user;
    hideGate();
    updateNavAvatar(user);
    if (!appInitialized) {
      appInitialized = true;
      App.init();
    }
  } else {
    const wasSignedIn = currentUid !== null;
    currentUid = null;
    window.__dutchUser = null;
    resetNavAvatar();
    showGate();
    if (wasSignedIn) {
      requestAnimationFrame(() => window.location.reload());
    }
  }
});
