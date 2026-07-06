import { mapLessonId } from '@/lib/legacy-ids.js';

export const SRS = {
  makeKey(lessonId, nl) {
    return `${lessonId || 'unknown'}::${nl}`;
  },

  setPrefixes(setId, legacyId) {
    const out = new Set();
    if (setId) out.add(setId);
    if (legacyId && legacyId !== setId) out.add(legacyId);
    const mapped = mapLessonId(setId);
    if (mapped && mapped !== setId) out.add(mapped);
    return [...out];
  },

  keyMatchesSet(key, setId, legacyId) {
    const sep = key.indexOf('::');
    if (sep < 0) return false;
    const prefix = key.slice(0, sep);
    return this.setPrefixes(setId, legacyId).includes(prefix);
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

  isWordLearned(progressData, setId, nl, legacyId) {
    const srs = progressData?.srs || {};
    for (const prefix of this.setPrefixes(setId, legacyId)) {
      const card = srs[this.makeKey(prefix, nl)];
      if (this.isLearned(card)) return true;
    }
    return false;
  },

  isCardDue(card, today) {
    if (!card || typeof card.lastQuality !== 'number') return false;
    if (!card.nextReview) return true;
    return card.nextReview <= today;
  },

  getDueKeys(progressData) {
    if (!progressData?.srs) return [];
    const today = new Date().toISOString().split('T')[0];
    const due = [];
    for (const [key, card] of Object.entries(progressData.srs)) {
      if (this.isCardDue(card, today)) due.push(key);
    }
    return due;
  },

  getDueCards(progressData, vocabIndex) {
    const keys = this.getDueKeys(progressData);
    const result = [];
    for (const key of keys) {
      const word = vocabIndex[key];
      if (!word) continue;
      const sep = key.indexOf('::');
      result.push({
        key,
        nl: word.nl,
        ru: word.ru || '',
        pronunciation: word.pronunciation || '',
        hint: word.hint || '',
        example: word.example || '',
        _setId: word._setId || key.slice(0, sep),
      });
    }
    return result;
  },

  getDueCount(progressData) {
    return this.getDueKeys(progressData).length;
  },

  getSetStats(progressData, setId, legacyId) {
    const srs = progressData?.srs || {};
    const today = new Date().toISOString().split('T')[0];
    let learned = 0;
    let due = 0;
    let inReview = 0;
    for (const [key, card] of Object.entries(srs)) {
      if (!this.keyMatchesSet(key, setId, legacyId)) continue;
      if (this.isLearned(card)) {
        learned++;
        if (this.isCardDue(card, today)) due++;
      } else if (typeof card.lastQuality === 'number') {
        inReview++;
        if (this.isCardDue(card, today)) due++;
      }
    }
    return { learned, due, inReview };
  },

  getStats(progressData) {
    const srs = progressData?.srs || {};
    const today = new Date().toISOString().split('T')[0];
    let total = 0;
    let due = 0;
    let nextDate = null;
    for (const card of Object.values(srs)) {
      if (typeof card.lastQuality !== 'number') continue;
      total++;
      if (this.isCardDue(card, today)) {
        due++;
      } else if (card.nextReview && (!nextDate || card.nextReview < nextDate)) {
        nextDate = card.nextReview;
      }
    }
    return { total, due, nextDate };
  },

  removeCard(progressData, wordKey) {
    if (!progressData?.srs) return false;
    if (!(wordKey in progressData.srs)) return false;
    delete progressData.srs[wordKey];
    return true;
  },

  resetLearnedInLesson(progressData, setId, legacyId) {
    if (!progressData?.srs || !setId) return 0;
    let count = 0;
    for (const [key, card] of Object.entries(progressData.srs)) {
      if (!this.keyMatchesSet(key, setId, legacyId)) continue;
      if (!this.isLearned(card)) continue;
      card.lastQuality = null;
      progressData.srs[key] = card;
      count++;
    }
    return count;
  },

  getAllCards(progressData, vocabIndex) {
    const srs = progressData?.srs || {};
    const today = new Date().toISOString().split('T')[0];
    const result = [];
    for (const [key, card] of Object.entries(srs)) {
      if (typeof card.lastQuality !== 'number') continue;
      const word = vocabIndex[key];
      if (!word) continue;
      const sep = key.indexOf('::');
      result.push({
        key,
        lessonId: word._setId || key.slice(0, sep),
        nl: word.nl,
        ru: word.ru || '',
        pronunciation: word.pronunciation || '',
        interval: card.interval || 0,
        nextReview: card.nextReview || null,
        isDue: this.isCardDue(card, today),
        lastQuality: card.lastQuality,
      });
    }
    return result.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      const av = a.nextReview || '';
      const bv = b.nextReview || '';
      if (av !== bv) return av < bv ? -1 : 1;
      return a.nl.localeCompare(b.nl);
    });
  },
};
