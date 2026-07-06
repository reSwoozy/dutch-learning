import { levels, allLessons } from '@/content/lessons/index.js';
import { categories, allTopics } from '@/content/grammar/index.js';

export function getAllLessons() {
  return allLessons;
}

export function getLevels() {
  return levels;
}

export function getLessonsByLevel(level) {
  return allLessons.filter((l) => l.level === level);
}

export function getGrammarCategories() {
  return categories;
}

export function getAllGrammarTopics() {
  return allTopics;
}

export function getGrammarTopicsMap() {
  const map = {};
  for (const t of allTopics) {
    map[t.id] = t;
  }
  return map;
}

export function findRelatedGrammar(lessonId) {
  return allTopics.filter(
    (t) => Array.isArray(t.inLessons) && t.inLessons.includes(lessonId),
  );
}

export function findLessonsForGrammar(topic) {
  const inLessons = Array.isArray(topic.inLessons) ? topic.inLessons : [];
  return inLessons
    .map((id) => allLessons.find((l) => l.id === id))
    .filter(Boolean);
}

export function getLessonNavigation(lessonId) {
  const idx = allLessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) return { prev: null, next: null, pos: 0, total: 0 };

  const lesson = allLessons[idx];
  const levelLessons = allLessons.filter((l) => l.level === lesson.level);
  const levelIdx = levelLessons.findIndex((l) => l.id === lessonId);

  return {
    prev: idx > 0 ? allLessons[idx - 1] : null,
    next: idx < allLessons.length - 1 ? allLessons[idx + 1] : null,
    pos: levelIdx + 1,
    total: levelLessons.length,
    isLast: levelIdx === levelLessons.length - 1,
  };
}
