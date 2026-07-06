import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.js';

const DEFAULT_AVATAR_SVG = `
  <svg viewBox="0 0 20 20" width="16" height="16">
    <circle cx="10" cy="7" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M3.5 16.5c1-3 3.6-4.6 6.5-4.6s5.5 1.6 6.5 4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>
`;

export default function NavAccount() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const host = document.getElementById('nav-account-avatar');
    const link = document.getElementById('nav-account');
    if (!host) return;

    if (!user) {
      host.classList.remove('nav-account__avatar--initials');
      host.innerHTML = DEFAULT_AVATAR_SVG;
      if (link) link.title = 'Аккаунт';
      return;
    }

    const name = user.displayName || user.email || 'Аккаунт';
    if (link) link.title = name;

    if (user.photoURL) {
      host.classList.remove('nav-account__avatar--initials');
      host.innerHTML = `<img src="${user.photoURL}" alt="" referrerpolicy="no-referrer">`;
    } else {
      host.textContent = name.slice(0, 1).toUpperCase();
      host.classList.add('nav-account__avatar--initials');
    }
  }, [user]);

  return null;
}
