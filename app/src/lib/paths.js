const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path) {
  if (!path) return path;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('#') || path.startsWith('mailto:')) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (BASE && normalized.startsWith(`${BASE}/`)) return normalized;
  return `${BASE}${normalized}`;
}
