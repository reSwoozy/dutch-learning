import { App } from './app.js';

Object.assign(App, {
  vocabSetPath(setId) {
    if (!setId) return null;
    if (/^[AB][12]-lesson-\d+$/.test(setId)) return `data/vocabulary/lessons/${setId}.json`;
    const m = setId.match(/^(core|extended)-([AB][12])$/);
    if (m) return `data/vocabulary/${m[1]}/${m[2]}.json`;
    const t = setId.match(/^themes-(.+)$/);
    if (t) return `data/vocabulary/themes/${t[1]}.json`;
    return `data/vocabulary/lessons/${setId}.json`;
  },

  async loadVocabSet(setId) {
    const p = this.vocabSetPath(setId);
    if (!p) return null;
    const data = await this.fetchJSON(p);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.words)) return data.words;
    return null;
  },

  async fetchJSON(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`Failed to load ${path}:`, e);
      return null;
    }
  },
});
