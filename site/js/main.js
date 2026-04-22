import { showGate, hideGate, signOutUser, onAuth } from './core/auth.js';
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

window.App = App;
window.Progress = Progress;
window.SRS = SRS;

let appInitialized = false;
let currentUid = null;

function renderUserBadge(user) {
  const host = document.querySelector('.nav-actions');
  if (!host) return;
  let badge = document.getElementById('user-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'user-badge';
    badge.className = 'user-badge';
    host.appendChild(badge);
  }
  const avatar = user.photoURL
    ? `<img class="user-badge__avatar" src="${user.photoURL}" alt="" referrerpolicy="no-referrer">`
    : `<span class="user-badge__avatar user-badge__avatar--fallback">${(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}</span>`;
  const name = user.displayName || user.email || 'Аккаунт';
  badge.innerHTML = `
    <details class="user-badge__menu">
      <summary class="user-badge__trigger" title="${name}">
        ${avatar}
      </summary>
      <div class="user-badge__popover">
        <div class="user-badge__name">${name}</div>
        <button type="button" class="user-badge__signout" id="user-badge-signout">Выйти</button>
      </div>
    </details>
  `;
  const btn = document.getElementById('user-badge-signout');
  if (btn) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await signOutUser();
      } finally {
        btn.disabled = false;
      }
    });
  }
}

function removeUserBadge() {
  const badge = document.getElementById('user-badge');
  if (badge) badge.remove();
}

onAuth((user) => {
  if (user) {
    if (currentUid === user.uid) return;
    currentUid = user.uid;
    window.__dutchUser = user;
    hideGate();
    renderUserBadge(user);
    if (!appInitialized) {
      appInitialized = true;
      App.init();
    }
  } else {
    if (currentUid !== null) {
      window.location.reload();
      return;
    }
    currentUid = null;
    window.__dutchUser = null;
    removeUserBadge();
    showGate();
  }
});
