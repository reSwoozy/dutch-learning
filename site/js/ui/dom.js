import { App } from '../core/app.js';

Object.assign(App, {
  escapeAttr(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r?\n/g, ' ');
  },
});
