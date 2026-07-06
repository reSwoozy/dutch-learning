import { describe, it, expect } from 'vitest';
import { migrate, updateStreak } from '@/stores/progress.js';

function iso(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
}

describe('migrate', () => {
  it('fills defaults for empty object', () => {
    const d = {};
    migrate(d, null);
    expect(d.version).toBe(8);
    expect(Array.isArray(d.lessonsCompleted)).toBe(true);
    expect(typeof d.srs).toBe('object');
  });

  it('adds legacy:: prefix for keyless v1 srs entries', () => {
    const d = { version: 1, srs: { Hallo: { lastQuality: 3 } } };
    migrate(d, null);
    expect(d.srs['legacy::Hallo']).toBeDefined();
  });

  it('drops removed fields and maps legacy lesson ids', () => {
    const d = {
      version: 3,
      knmResults: { a: 1 },
      vocabLevel: 'A1',
      lessonsCompleted: ['A1-lesson-01'],
      srs: {},
    };
    migrate(d, { email: 'a@b.c', displayName: 'Test' });
    expect(d.knmResults).toBeUndefined();
    expect(d.vocabLevel).toBeUndefined();
    expect(d.lessonsCompleted).toEqual(['a1/01']);
    expect(d.email).toBe('a@b.c');
    expect(d.version).toBe(8);
  });
});

describe('updateStreak', () => {
  it('starts streak at 1 on first activity', () => {
    const d = { streak: 0, lastActiveDate: null };
    updateStreak(d);
    expect(d.streak).toBe(1);
    expect(d.lastActiveDate).toBe(iso(0));
  });

  it('is idempotent within the same day', () => {
    const d = { streak: 3, lastActiveDate: iso(0) };
    updateStreak(d);
    updateStreak(d);
    expect(d.streak).toBe(3);
  });

  it('increments when last active was yesterday', () => {
    const d = { streak: 3, lastActiveDate: iso(-1) };
    updateStreak(d);
    expect(d.streak).toBe(4);
    expect(d.lastActiveDate).toBe(iso(0));
  });

  it('resets to 1 after a gap', () => {
    const d = { streak: 9, lastActiveDate: iso(-3) };
    updateStreak(d);
    expect(d.streak).toBe(1);
  });
});
