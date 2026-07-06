import { LEGACY_LESSON_ID_MAP } from '@/content/lessons/legacy-id-map.js';
import { LEGACY_TEST_ID_MAP } from '@/content/tests/legacy-id-map.js';
import { LEGACY_READING_ID_MAP } from '@/content/reading/legacy-id-map.js';

const LESSON_TO_LEGACY = Object.fromEntries(
  Object.entries(LEGACY_LESSON_ID_MAP).map(([legacy, canonical]) => [canonical, legacy]),
);

export function mapLessonId(id) {
  if (!id) return id;
  return LEGACY_LESSON_ID_MAP[id] || id;
}

export function mapTestId(id) {
  if (!id) return id;
  return LEGACY_TEST_ID_MAP[id] || id;
}

export function mapReadingId(id) {
  if (!id) return id;
  return LEGACY_READING_ID_MAP[id] || id;
}

export function mapSrsKey(key) {
  if (!key || !key.includes('::')) return key;
  const sep = key.indexOf('::');
  const setPart = key.slice(0, sep);
  const wordPart = key.slice(sep + 2);
  if (setPart.startsWith('legacy::')) return key;
  const mapped = mapLessonId(setPart);
  if (mapped === setPart && !setPart.includes('/')) {
    return key;
  }
  return `${mapped}::${wordPart}`;
}

function dedupeArray(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function mapStringArray(arr, mapper) {
  if (!Array.isArray(arr)) return [];
  return dedupeArray(arr.map((id) => mapper(id)));
}

function mapTestResults(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const mapped = mapTestId(key);
    out[mapped] = value;
  }
  return out;
}

function mapSrsObject(srs) {
  if (!srs || typeof srs !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(srs)) {
    const mapped = mapSrsKey(key);
    if (!out[mapped] || (value?.nextReview && (!out[mapped].nextReview || value.nextReview > out[mapped].nextReview))) {
      out[mapped] = value;
    }
  }
  return out;
}

export function mapProgressData(d) {
  d.lessonsCompleted = mapStringArray(d.lessonsCompleted, mapLessonId);
  d.readingRead = mapStringArray(d.readingRead, mapReadingId);
  d.testResults = mapTestResults(d.testResults);
  d.srs = mapSrsObject(d.srs);
  return d;
}

export function flashcardSetIdFromLegacy(legacySetId) {
  if (!legacySetId) return legacySetId;
  if (legacySetId.startsWith('core-') || legacySetId.startsWith('extended-')) return legacySetId;
  if (legacySetId.includes('/')) return legacySetId;
  return mapLessonId(legacySetId);
}

export function legacySetIdForSearch(setId) {
  return LESSON_TO_LEGACY[setId] || setId;
}
