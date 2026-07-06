import { describe, it, expect } from 'vitest';
import { SRS } from '@/lib/srs.js';

function isoInDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('SRS.makeKey', () => {
  it('joins set id and word', () => {
    expect(SRS.makeKey('a1/01', 'Hallo')).toBe('a1/01::Hallo');
  });
  it('falls back to unknown set', () => {
    expect(SRS.makeKey('', 'Hallo')).toBe('unknown::Hallo');
  });
});

describe('SRS.updateCard', () => {
  it('resets repetition on low quality and schedules for tomorrow', () => {
    const data = { srs: {} };
    SRS.updateCard(data, 'a1/01::Hallo', 0);
    const card = data.srs['a1/01::Hallo'];
    expect(card.repetition).toBe(0);
    expect(card.interval).toBe(1);
    expect(card.lastQuality).toBe(0);
    expect(card.nextReview).toBe(isoInDays(1));
  });

  it('grows interval across successful repetitions (1, 6, then efactor-based)', () => {
    const data = { srs: {} };
    SRS.updateCard(data, 'k', 4);
    expect(data.srs.k.interval).toBe(1);
    SRS.updateCard(data, 'k', 4);
    expect(data.srs.k.interval).toBe(6);
    SRS.updateCard(data, 'k', 4);
    expect(data.srs.k.interval).toBeGreaterThan(6);
  });

  it('keeps efactor at or above 1.3', () => {
    const data = { srs: {} };
    for (let i = 0; i < 10; i++) SRS.updateCard(data, 'k', 0);
    expect(data.srs.k.efactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe('SRS.isLearned / isWordLearned', () => {
  it('treats quality >= 4 as learned', () => {
    expect(SRS.isLearned({ lastQuality: 4 })).toBe(true);
    expect(SRS.isLearned({ lastQuality: 3 })).toBe(false);
    expect(SRS.isLearned(null)).toBe(false);
  });

  it('matches legacy prefixes', () => {
    const data = { srs: { 'A1-lesson-01::Hallo': { lastQuality: 5 } } };
    expect(SRS.isWordLearned(data, 'a1/01', 'Hallo', 'A1-lesson-01')).toBe(true);
  });
});

describe('SRS.isCardDue / getDueKeys', () => {
  const today = new Date().toISOString().split('T')[0];
  it('is due when nextReview passed', () => {
    expect(SRS.isCardDue({ lastQuality: 3, nextReview: isoInDays(-1) }, today)).toBe(true);
    expect(SRS.isCardDue({ lastQuality: 3, nextReview: isoInDays(3) }, today)).toBe(false);
  });
  it('ignores unrated cards', () => {
    expect(SRS.isCardDue({ lastQuality: null, nextReview: null }, today)).toBe(false);
  });
  it('collects due keys only', () => {
    const data = {
      srs: {
        due: { lastQuality: 3, nextReview: isoInDays(-2) },
        later: { lastQuality: 4, nextReview: isoInDays(5) },
      },
    };
    expect(SRS.getDueKeys(data)).toEqual(['due']);
  });
});

describe('SRS.getStats', () => {
  it('counts total and due rated cards', () => {
    const data = {
      srs: {
        a: { lastQuality: 4, nextReview: isoInDays(-1) },
        b: { lastQuality: 4, nextReview: isoInDays(4) },
        c: { lastQuality: null, nextReview: null },
      },
    };
    const stats = SRS.getStats(data);
    expect(stats.total).toBe(2);
    expect(stats.due).toBe(1);
    expect(stats.nextDate).toBe(isoInDays(4));
  });
});

describe('SRS.removeCard', () => {
  it('removes an existing key', () => {
    const data = { srs: { k: { lastQuality: 3 } } };
    expect(SRS.removeCard(data, 'k')).toBe(true);
    expect(data.srs.k).toBeUndefined();
    expect(SRS.removeCard(data, 'missing')).toBe(false);
  });
});
