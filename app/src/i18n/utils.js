import ru from './ru.json';
import en from './en.json';

const dict = { ru, en };
export const LOCALES = ['ru', 'en'];
export const DEFAULT_LOCALE = 'ru';

export function t(key, locale = DEFAULT_LOCALE) {
  const parts = key.split('.');
  let val = dict[locale];
  for (const p of parts) {
    if (val == null) return key;
    val = val[p];
  }
  return val ?? key;
}

export function getLocaleFromUrl(url) {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  const base = import.meta.env.BASE_URL.replace(/\//g, '');
  const cleaned = base ? segments.filter((s) => s !== base) : segments;
  const first = cleaned[0];
  return LOCALES.includes(first) ? first : DEFAULT_LOCALE;
}

export function localePath(path, locale = DEFAULT_LOCALE) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}/${locale}${cleanPath}`;
}

export function switchLocalePath(currentUrl, targetLocale) {
  const url = new URL(currentUrl);
  const segments = url.pathname.split('/').filter(Boolean);
  const base = import.meta.env.BASE_URL.replace(/\//g, '');
  const idx = base ? segments.indexOf(base) + 1 : 0;
  if (idx < segments.length && LOCALES.includes(segments[idx])) {
    segments[idx] = targetLocale;
  }
  return '/' + segments.join('/');
}
