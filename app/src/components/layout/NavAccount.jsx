import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.js';
import { paintNavChromeFromSession } from '@/lib/session-cache.js';

const DEFAULT_AVATAR_SVG = `
  <svg viewBox="0 0 20 20" width="16" height="16">
    <circle cx="10" cy="7" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M3.5 16.5c1-3 3.6-4.6 6.5-4.6s5.5 1.6 6.5 4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>
`;

function paintUser(user) {
  const host = document.getElementById('nav-account-avatar');
  const link = document.getElementById('nav-account');
  if (!host) return;

  if (!user) {
    if (!host.querySelector('svg') || host.querySelector('img')) {
      host.classList.remove('nav-account__avatar--initials');
      host.innerHTML = DEFAULT_AVATAR_SVG;
    }
    if (link) link.title = 'Аккаунт';
    return;
  }

  paintNavChromeFromSession();

  // Fallback if session paint missed (e.g. photoURL without https cache yet)
  const name = user.displayName || user.email || 'Аккаунт';
  if (link) link.title = name;

  if (user.photoURL && /^https:\/\//i.test(user.photoURL)) {
    const existing = host.querySelector('img');
    if (existing?.getAttribute('src') === user.photoURL) return;
    host.classList.remove('nav-account__avatar--initials');
    const img = document.createElement('img');
    img.src = user.photoURL;
    img.alt = '';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    host.replaceChildren(img);
    return;
  }

  const initial = name.slice(0, 1).toUpperCase();
  if (host.classList.contains('nav-account__avatar--initials') && host.textContent === initial) return;
  host.textContent = initial;
  host.classList.add('nav-account__avatar--initials');
}

export default function NavAccount() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    paintUser(user);
  }, [user]);

  return null;
}
