import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MiniInsights from './MiniInsights';

// Mock the Zustand store
vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    dailyGoal: '2',
    weeklyGoal: '10'
  }))
}));

describe('MiniInsights', () => {
  it('renders goals and difficulty correctly', () => {
    const stats = {
      dailyCount: 1,
      weeklyCount: 5,
      easy: 10,
      medium: 5,
      hard: 2
    };

    render(<MiniInsights stats={stats} />);

    // Since our mock returns dailyGoal = 2, dailyCount is 1
    // It's broken into separate divs, so we test the parts
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/\/ 2 problems/)).toBeInTheDocument();
    
    // weeklyGoal = 10, weeklyCount is 5
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/\/ 10 problems/)).toBeInTheDocument();
  });
});
