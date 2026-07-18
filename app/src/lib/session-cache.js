const AUTH_KEY = 'dutch-auth-session';
const AUTH_CHECKED_KEY = 'dutch-auth-checked';

function progressKey(uid) {
  return `dutch-progress-${uid}`;
}

/** Normalize Firebase User / cached blob to a stable plain object. */
export function toAuthUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
  };
}

export function sameAuthUser(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.uid === b.uid &&
    a.email === b.email &&
    a.displayName === b.displayName &&
    a.photoURL === b.photoURL
  );
}

export function readAuthSession() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? toAuthUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeAuthSession(user) {
  if (typeof sessionStorage === 'undefined') return;
  const normalized = toAuthUser(user);
  if (!normalized) {
    sessionStorage.removeItem(AUTH_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(normalized));
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

/**
 * Paint nav avatar + streak from sessionStorage without React.
 * Safe to call multiple times; no-ops when DOM already matches.
 */
export function paintNavChromeFromSession() {
  if (typeof document === 'undefined' || typeof sessionStorage === 'undefined') return;

  const auth = readAuthSession();
  const host = document.getElementById('nav-account-avatar');
  const link = document.getElementById('nav-account');
  if (!auth || !host) return;

  const name = auth.displayName || auth.email || 'Аккаунт';
  if (link && link.title !== name) link.title = name;

  if (auth.photoURL && /^https:\/\//i.test(auth.photoURL)) {
    const existing = host.querySelector('img');
    if (existing?.getAttribute('src') === auth.photoURL) {
      // already painted
    } else {
      host.classList.remove('nav-account__avatar--initials');
      const img = document.createElement('img');
      img.src = auth.photoURL;
      img.alt = '';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      host.replaceChildren(img);
    }
  } else {
    const initial = name.slice(0, 1).toUpperCase();
    if (!(host.classList.contains('nav-account__avatar--initials') && host.textContent === initial)) {
      host.textContent = initial;
      host.classList.add('nav-account__avatar--initials');
    }
  }

  const progress = readProgressSession(auth.uid);
  const streak = progress?.streak || 0;
  const wrap = document.getElementById('nav-account-streak');
  const val = document.getElementById('nav-account-streak-value');
  if (!wrap || !val) return;

  if (streak > 0) {
    if (val.textContent !== String(streak)) val.textContent = String(streak);
    if (wrap.hidden) wrap.hidden = false;
  } else if (!wrap.hidden) {
    wrap.hidden = true;
  }
}
