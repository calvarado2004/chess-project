import { describe, it, expect } from 'vitest';
import {
  lessons,
  categories,
  getLessonById,
  getLessonsByCategory,
  totalPositionCount,
  sequentialPositionIndex,
} from '../../src/data';

describe('theory lesson data', () => {
  it('bundles a lesson set with unique ids', () => {
    expect(lessons.length).toBeGreaterThan(0);
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every lesson belongs to a defined category', () => {
    const categoryIds = new Set(categories.map((c) => c.id));
    for (const lesson of lessons) {
      expect(categoryIds.has(lesson.category as never)).toBe(true);
    }
  });

  it('exposes the four expected categories', () => {
    expect(categories.map((c) => c.id)).toEqual([
      'openings',
      'middlegame',
      'endings',
      'fundamentals',
    ]);
  });

  it('every category has at least one lesson', () => {
    for (const cat of categories) {
      expect(getLessonsByCategory(cat.id).length).toBeGreaterThan(0);
    }
  });

  it('getLessonById finds known lessons and returns undefined otherwise', () => {
    expect(getLessonById('ruy-lopez')?.title).toBe('The Ruy Lopez');
    expect(getLessonById('does-not-exist')).toBeUndefined();
  });
});

describe('position counter helpers', () => {
  // Two sections: 3 positions then 2 positions => 5 total.
  const sections = [
    { positions: [0, 0, 0] },
    { positions: [0, 0] },
  ];

  it('totalPositionCount sums positions across sections', () => {
    expect(totalPositionCount(sections)).toBe(5);
  });

  it('sequentialPositionIndex is a flat count, not the packed encoding', () => {
    // First section
    expect(sequentialPositionIndex(sections, 0, 0)).toBe(0); // shows "1 / 5"
    expect(sequentialPositionIndex(sections, 0, 2)).toBe(2); // shows "3 / 5"
    // Second section: must continue from 3, NOT jump to section*10+pos = 10/11
    expect(sequentialPositionIndex(sections, 1, 0)).toBe(3); // shows "4 / 5"
    expect(sequentialPositionIndex(sections, 1, 1)).toBe(4); // shows "5 / 5"
  });

  it('never produces a counter greater than the total (regression for "22 / 9")', () => {
    for (let s = 0; s < sections.length; s++) {
      for (let p = 0; p < sections[s].positions.length; p++) {
        const display = sequentialPositionIndex(sections, s, p) + 1;
        expect(display).toBeLessThanOrEqual(totalPositionCount(sections));
      }
    }
  });
});
