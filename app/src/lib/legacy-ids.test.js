import { describe, it, expect } from 'vitest';
import {
  mapLessonId,
  mapSrsKey,
  mapProgressData,
  flashcardSetIdFromLegacy,
} from '@/lib/legacy-ids.js';

describe('mapLessonId', () => {
  it('maps legacy lesson ids to canonical', () => {
    expect(mapLessonId('A1-lesson-01')).toBe('a1/01');
  });
  it('leaves canonical and unknown ids untouched', () => {
    expect(mapLessonId('a1/01')).toBe('a1/01');
    expect(mapLessonId('nope')).toBe('nope');
    expect(mapLessonId('')).toBe('');
  });
});

describe('mapSrsKey', () => {
  it('remaps legacy lesson prefix but keeps word part', () => {
    expect(mapSrsKey('A1-lesson-01::Hallo')).toBe('a1/01::Hallo');
  });
  it('keeps explicit legacy:: prefix', () => {
    expect(mapSrsKey('legacy::foo::bar')).toBe('legacy::foo::bar');
  });
  it('keeps keys without a set mapping', () => {
    expect(mapSrsKey('core-a1::Hallo')).toBe('core-a1::Hallo');
    expect(mapSrsKey('noseparator')).toBe('noseparator');
  });
});

describe('mapProgressData', () => {
  it('maps lessons, srs and dedupes', () => {
    const d = {
      lessonsCompleted: ['A1-lesson-01', 'a1/01'],
      readingRead: [],
      testResults: {},
      srs: { 'A1-lesson-01::Hallo': { lastQuality: 4 } },
    };
    mapProgressData(d);
    expect(d.lessonsCompleted).toEqual(['a1/01']);
    expect(Object.keys(d.srs)).toEqual(['a1/01::Hallo']);
  });
});

describe('flashcardSetIdFromLegacy', () => {
  it('maps legacy lesson ids', () => {
    expect(flashcardSetIdFromLegacy('A1-lesson-01')).toBe('a1/01');
  });
  it('keeps core/extended and canonical ids', () => {
    expect(flashcardSetIdFromLegacy('core-a1')).toBe('core-a1');
    expect(flashcardSetIdFromLegacy('a1/01')).toBe('a1/01');
  });
});
