import { describe, it, expect } from 'vitest';
import { calculateGoalsProgress, calculateDifficultyPercentages, getGoalEmoji, formatChartData } from './statsUtils';

describe('statsUtils', () => {
  describe('calculateGoalsProgress', () => {
    it('calculates daily and weekly percentages correctly', () => {
      const stats = { dailyCount: 1, weeklyCount: 5 };
      const settings = { dailyGoal: '2', weeklyGoal: '10' };
      const result = calculateGoalsProgress(stats, settings);
      
      expect(result.dailyPercent).toBe(50);
      expect(result.weeklyPercent).toBe(50);
      expect(result.dailyGoal).toBe(2);
      expect(result.weeklyGoal).toBe(10);
    });

    it('caps percentages at 100', () => {
      const stats = { dailyCount: 5, weeklyCount: 20 };
      const settings = { dailyGoal: '2', weeklyGoal: '10' };
      const result = calculateGoalsProgress(stats, settings);
      
      expect(result.dailyPercent).toBe(100);
      expect(result.weeklyPercent).toBe(100);
    });
  });

  describe('calculateDifficultyPercentages', () => {
    it('calculates correct percentages when all difficulties are present', () => {
      const stats = { easy: 5, medium: 10, hard: 5 };
      const result = calculateDifficultyPercentages(stats);
      
      expect(result.easyPct).toBe(25);
      expect(result.medPct).toBe(50);
      expect(result.hardPct).toBe(25);
    });

    it('handles zero stats safely without dividing by zero', () => {
      const stats = { easy: 0, medium: 0, hard: 0 };
      const result = calculateDifficultyPercentages(stats);
      
      expect(result.easyPct).toBe(0);
      expect(result.medPct).toBe(0);
      expect(result.hardPct).toBe(0);
    });
  });

  describe('getGoalEmoji', () => {
    it('returns 🎉 for >= 100%', () => expect(getGoalEmoji(100)).toBe('🎉'));
    it('returns 😄 for >= 50%', () => expect(getGoalEmoji(50)).toBe('😄'));
    it('returns 🙂 for > 0%', () => expect(getGoalEmoji(1)).toBe('🙂'));
    it('returns 😢 for 0%', () => expect(getGoalEmoji(0)).toBe('😢'));
  });

  describe('formatChartData', () => {
    it('formats difficultyData correctly', () => {
      const analytics = {
        difficultyBreakdown: { Easy: 10, Medium: 20, Hard: 5 }
      };
      const result = formatChartData(analytics);
      
      expect(result.difficultyData).toEqual([
        { name: 'Easy', value: 10 },
        { name: 'Medium', value: 20 },
        { name: 'Hard', value: 5 }
      ]);
    });
  });
});
