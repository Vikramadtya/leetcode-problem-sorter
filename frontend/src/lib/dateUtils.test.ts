import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDaysDifference, isSameWeek, isWeeklyWrapUpTime } from './dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    // Mock current date to a known Monday: Jan 1, 2024
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDaysDifference', () => {
    it('returns positive days for future dates', () => {
      expect(getDaysDifference('2024-01-05T00:00:00Z')).toBe(4);
    });

    it('returns negative days for past dates', () => {
      expect(getDaysDifference('2023-12-31T00:00:00Z')).toBe(-1);
    });

    it('returns 0 for today', () => {
      // Create a date in local time for today
      const today = new Date();
      today.setHours(15, 0, 0, 0);
      expect(getDaysDifference(today.toISOString())).toBe(0);
    });
  });

  describe('isSameWeek', () => {
    it('returns true if the date is within the same week', () => {
      expect(isSameWeek('2024-01-01T00:00:00Z')).toBe(true);
    });

    it('returns false for dates more than 7 days ago', () => {
      expect(isSameWeek('2023-12-20T00:00:00Z')).toBe(false);
    });
  });

  describe('isWeeklyWrapUpTime', () => {
    it('returns true if today is Monday', () => {
      expect(isWeeklyWrapUpTime()).toBe(true);
    });

    it('returns false if today is not Monday', () => {
      vi.setSystemTime(new Date('2024-01-02T12:00:00Z')); // Tuesday
      expect(isWeeklyWrapUpTime()).toBe(false);
    });
  });
});
