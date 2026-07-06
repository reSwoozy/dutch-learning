import vocabIndex from '@/content/vocabulary/index.js';
import { mapLessonId } from '@/lib/legacy-ids.js';

const lessonModules = import.meta.glob('/src/content/vocabulary/lessons/*.js', { eager: true });
const coreModules = import.meta.glob('/src/content/vocabulary/core/*.js', { eager: true });
const extendedModules = import.meta.glob('/src/content/vocabulary/extended/*.js', { eager: true });
const themeModules = import.meta.glob('/src/content/vocabulary/themes/*.js', { eager: true });

function normalizeWord(w) {
  return {
    nl: w.nl,
    ru: w.ru || '',
    pronunciation: w.pronunciation || '',
    hint: w.hint || w.example || '',
    level: w.level || '',
  };
}

function wordsFromArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeWord).filter((w) => w.nl);
}

function modulePath(file) {
  return `/src/content/vocabulary/${file.replace('.json', '.js')}`;
}

export function loadAllVocabSets() {
  const sets = [];
  const tiers = vocabIndex.tiers || {};

  if (Array.isArray(tiers.lessons)) {
    for (const entry of tiers.lessons) {
      const key = modulePath(entry.file);
      const mod = lessonModules[key];
      const words = wordsFromArray(mod?.default);
      if (words.length === 0) continue;
      sets.push({
        id: mapLessonId(entry.id),
        legacyId: entry.id,
        tier: 'lessons',
        level: (entry.level || '').toLowerCase(),
        title: `Урок ${entry.lesson}`,
        label: entry.level,
        words,
      });
    }
  }

  if (Array.isArray(tiers.core)) {
    for (const entry of tiers.core) {
      const key = modulePath(entry.file);
      const mod = coreModules[key];
      const words = wordsFromArray(mod?.default);
      if (words.length === 0) continue;
      sets.push({
        id: entry.id,
        tier: 'core',
        level: (entry.level || '').toLowerCase(),
        title: `Core ${entry.level}`,
        label: entry.level,
        words,
      });
    }
  }

  if (Array.isArray(tiers.extended)) {
    for (const entry of tiers.extended) {
      const key = modulePath(entry.file);
      const mod = extendedModules[key];
      const words = wordsFromArray(mod?.default);
      if (words.length === 0) continue;
      sets.push({
        id: entry.id,
        tier: 'extended',
        level: (entry.level || '').toLowerCase(),
        title: `Extended ${entry.level}`,
        label: entry.level,
        words,
      });
    }
  }

  if (Array.isArray(tiers.themes)) {
    for (const entry of tiers.themes) {
      const slug = entry.slug || entry.id?.replace(/^theme-/, '');
      const key = `/src/content/vocabulary/themes/${slug}.js`;
      const mod = themeModules[key];
      const data = mod?.default;
      const words = wordsFromArray(data?.words);
      if (words.length === 0) continue;
      sets.push({
        id: entry.id,
        tier: 'themes',
        level: (entry.level || data?.level || '').toLowerCase(),
        title: entry.title || data?.title || slug,
        label: entry.level || data?.level || 'тема',
        words,
      });
    }
  }

  return sets;
}

export function buildVocabIndexFromSets(sets) {
  const index = {};
  for (const set of sets) {
    for (const w of set.words) {
      if (!w.nl) continue;
      const entry = { ...w, _setId: set.id };
      index[`${set.id}::${w.nl}`] = entry;
      if (set.legacyId && set.legacyId !== set.id) {
        index[`${set.legacyId}::${w.nl}`] = entry;
      }
    }
  }
  return index;
}
