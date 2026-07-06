import { LOCALES } from '@/i18n/utils.js';

export const MATERIALS_SECTIONS = ['verbs', 'reading', 'writing', 'culture', 'resources'];

function stripBase(pathname) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  if (!base || base === '/') return pathname;
  if (pathname.startsWith(base)) return pathname.slice(base.length) || '/';
  return pathname;
}

function normalize(pathname) {
  const p = stripBase(pathname).replace(/\/+$/, '');
  return p || '/';
}

export function getNavSection(pathname, lang) {
  const parts = normalize(pathname).split('/').filter(Boolean);
  if (parts[0] === lang || LOCALES.includes(parts[0])) parts.shift();
  return parts[0] || 'home';
}

export function isNavLinkActive(pathname, href) {
  const cur = normalize(pathname);
  const target = normalize(href);
  return cur === target || cur.startsWith(`${target}/`);
}

export function isMaterialsSectionActive(pathname, lang) {
  return MATERIALS_SECTIONS.includes(getNavSection(pathname, lang));
}
