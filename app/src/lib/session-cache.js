const AUTH_KEY = 'dutch-auth-session';
const AUTH_CHECKED_KEY = 'dutch-auth-checked';

function progressKey(uid) {
  return `dutch-progress-${uid}`;
}

export function readAuthSession() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeAuthSession(user) {
  if (typeof sessionStorage === 'undefined') return;
  if (!user) {
    sessionStorage.removeItem(AUTH_KEY);
    return;
  }
  sessionStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
    }),
  );
}

export function clearAuthSession() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(AUTH_KEY);
}

export function markAuthChecked() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(AUTH_CHECKED_KEY, '1');
}

export function hasAuthChecked() {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(AUTH_CHECKED_KEY) === '1';
}

export function clearAuthChecked() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(AUTH_CHECKED_KEY);
}

export function readProgressSession(uid) {
  if (!uid || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(progressKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeProgressSession(uid, data) {
  if (!uid || !data || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(progressKey(uid), JSON.stringify(data));
  } catch {}
}

export function clearProgressSession(uid) {
  if (!uid || typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(progressKey(uid));
}
