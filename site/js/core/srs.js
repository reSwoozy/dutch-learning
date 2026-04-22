export const SRS = {
  makeKey(lessonId, nl) {
    return `${lessonId || 'unknown'}::${nl}`;
  },

  getCardData(progressData, wordKey) {
    if (!progressData.srs) progressData.srs = {};
    if (!progressData.srs[wordKey]) {
      progressData.srs[wordKey] = {
        interval: 0,
        repetition: 0,
        efactor: 2.5,
        nextReview: null,
        lastQuality: null,
      };
    }
    return progressData.srs[wordKey];
  },

  updateCard(progressData, wordKey, quality) {
    const card = this.getCardData(progressData, wordKey);

    if (quality < 3) {
      card.repetition = 0;
      card.interval = 1;
    } else {
      if (card.repetition === 0) {
        card.interval = 1;
      } else if (card.repetition === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.efactor);
      }
      card.repetition++;
    }

    card.efactor = Math.max(
      1.3,
      card.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    );

    const next = new Date();
    next.setDate(next.getDate() + card.interval);
    card.nextReview = next.toISOString().split('T')[0];
    card.lastQuality = quality;

    progressData.srs[wordKey] = card;
  },

  isLearned(card) {
    if (!card) return false;
    return typeof card.lastQuality === 'number' && card.lastQuality >= 4;
  },

  isWordLearned(progressData, lessonId, nl) {
    const srs = (progressData && progressData.srs) || {};
    const card = srs[this.makeKey(lessonId, nl)];
    return this.isLearned(card);
  },

  getDueKeys(progressData) {
    if (!progressData.srs) return [];
    const today = new Date().toISOString().split('T')[0];
    const due = [];
    for (const [key, card] of Object.entries(progressData.srs)) {
      if (!card.nextReview || card.nextReview <= today) due.push(key);
    }
    return due;
  },

  async getDueCards(progressData, app) {
    const keys = this.getDueKeys(progressData);
    if (keys.length === 0) return [];
    const byLesson = new Map();
    for (const key of keys) {
      const idx = key.indexOf('::');
      if (idx < 0) continue;
      const lessonId = key.slice(0, idx);
      const nl = key.slice(idx + 2);
      if (!lessonId || lessonId === 'legacy' || lessonId === 'unknown') continue;
      if (!byLesson.has(lessonId)) byLesson.set(lessonId, new Set());
      byLesson.get(lessonId).add(nl);
    }

    const result = [];
    for (const [lessonId, nls] of byLesson.entries()) {
      try {
        const words = await app.loadVocabSet(lessonId);
        if (!Array.isArray(words)) continue;
        for (const w of words) {
          if (nls.has(w.nl)) {
            result.push({ ...w, _lessonId: lessonId });
          }
        }
      } catch {
        continue;
      }
    }
    return result;
  },

  getDueCount(progressData) {
    return this.getDueKeys(progressData).length;
  },

  getSetStats(progressData, setId) {
    const srs = (progressData && progressData.srs) || {};
    if (!setId) return { learned: 0, due: 0, inReview: 0 };
    const prefix = `${setId}::`;
    const today = new Date().toISOString().split('T')[0];
    let learned = 0;
    let due = 0;
    let inReview = 0;
    for (const [key, card] of Object.entries(srs)) {
      if (!key.startsWith(prefix)) continue;
      if (this.isLearned(card)) {
        learned++;
      } else {
        inReview++;
        if (!card.nextReview || card.nextReview <= today) due++;
      }
    }
    return { learned, due, inReview };
  },

  getStats(progressData) {
    const srs = (progressData && progressData.srs) || {};
    const entries = Object.entries(srs);
    const total = entries.length;
    const today = new Date().toISOString().split('T')[0];
    let due = 0;
    let nextDate = null;
    for (const [, card] of entries) {
      if (!card.nextReview || card.nextReview <= today) {
        due++;
      } else if (!nextDate || card.nextReview < nextDate) {
        nextDate = card.nextReview;
      }
    }
    return { total, due, nextDate };
  },

  removeCard(progressData, wordKey) {
    if (!progressData || !progressData.srs) return false;
    if (!(wordKey in progressData.srs)) return false;
    delete progressData.srs[wordKey];
    return true;
  },

  resetLearnedInLesson(progressData, lessonId) {
    if (!progressData || !progressData.srs || !lessonId) return 0;
    const prefix = `${lessonId}::`;
    let count = 0;
    for (const [key, card] of Object.entries(progressData.srs)) {
      if (!key.startsWith(prefix)) continue;
      if (!this.isLearned(card)) continue;
      card.lastQuality = null;
      progressData.srs[key] = card;
      count++;
    }
    return count;
  },

  async getAllCards(progressData, app) {
    const srs = (progressData && progressData.srs) || {};
    const keys = Object.keys(srs);
    if (keys.length === 0) return [];
    const byLesson = new Map();
    for (const key of keys) {
      const idx = key.indexOf('::');
      if (idx < 0) continue;
      const lessonId = key.slice(0, idx);
      const nl = key.slice(idx + 2);
      if (!lessonId || lessonId === 'legacy' || lessonId === 'unknown') continue;
      if (!byLesson.has(lessonId)) byLesson.set(lessonId, new Set());
      byLesson.get(lessonId).add(nl);
    }
    const today = new Date().toISOString().split('T')[0];
    const result = [];
    for (const [lessonId, nls] of byLesson.entries()) {
      try {
        const words = await app.loadVocabSet(lessonId);
        if (!Array.isArray(words)) continue;
        for (const w of words) {
          if (!nls.has(w.nl)) continue;
          const key = this.makeKey(lessonId, w.nl);
          const card = srs[key] || {};
          result.push({
            key,
            lessonId,
            nl: w.nl,
            ru: w.ru || '',
            pronunciation: w.pronunciation || '',
            interval: card.interval || 0,
            repetition: card.repetition || 0,
            efactor: card.efactor || 2.5,
            nextReview: card.nextReview || null,
            isDue: !card.nextReview || card.nextReview <= today,
          });
        }
      } catch {
        continue;
      }
    }
    return result;
  },
};
