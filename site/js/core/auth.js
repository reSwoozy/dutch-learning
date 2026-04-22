import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from '../firebase/app.js';

const GATE_ID = 'auth-gate';

function renderGate(message) {
  const gate = document.getElementById(GATE_ID);
  if (!gate) return;
  gate.innerHTML = `
    <div class="auth-gate__card">
      <div class="auth-gate__brand">
        <span class="logo-mark">NL</span>
        <span>Dutch Learning System</span>
      </div>
      <h1 class="auth-gate__title">Вход</h1>
      <p class="auth-gate__subtitle">${
        message || 'Войдите через Google, чтобы синхронизировать прогресс между устройствами.'
      }</p>
      <button type="button" class="auth-gate__btn" id="auth-gate-btn">
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.61z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.33 0-4.31-1.57-5.02-3.68H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.98 10.74A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.19.3-1.74V4.93H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.07l3.02-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.93l3.02 2.33C4.69 5.15 6.67 3.58 9 3.58z"/>
        </svg>
        <span>Войти через Google</span>
      </button>
    </div>
  `;
  const btn = document.getElementById('auth-gate-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        console.error('[auth] sign-in failed', err);
        renderGate(mapAuthError(err));
      } finally {
        btn.disabled = false;
      }
    });
  }
}

function mapAuthError(err) {
  const code = err && err.code;
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Окно входа закрыто. Нажмите «Войти через Google», чтобы попробовать снова.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Браузер заблокировал всплывающее окно. Разрешите всплывающие окна для этого сайта и попробуйте снова.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Нет связи с серверами Google. Проверьте интернет и попробуйте снова.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Этот домен не добавлен в Authorized domains проекта Firebase.';
  }
  return 'Не удалось войти. Попробуйте ещё раз.';
}

export function showGate() {
  document.body.classList.add('auth-locked');
  let gate = document.getElementById(GATE_ID);
  if (!gate) {
    gate = document.createElement('div');
    gate.id = GATE_ID;
    gate.className = 'auth-gate';
    document.body.appendChild(gate);
  }
  renderGate();
}

export function hideGate() {
  document.body.classList.remove('auth-locked');
  const gate = document.getElementById(GATE_ID);
  if (gate) gate.remove();
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}
