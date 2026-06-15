/**
 * Extracted business logic for UI statistics calculations
 */

export function calculateGoalsProgress(stats: any, settings: any) {
  const dailyGoal = parseInt(settings?.dailyGoal || '2', 10);
  const weeklyGoal = parseInt(settings?.weeklyGoal || '10', 10);

  const dailyCount = stats?.dailyCount || 0;
  const weeklyCount = stats?.weeklyCount || 0;

  const dailyPercent = Math.min(100, Math.round((dailyCount / dailyGoal) * 100));
  const weeklyPercent = Math.min(100, Math.round((weeklyCount / weeklyGoal) * 100));

  return { dailyGoal, weeklyGoal, dailyCount, weeklyCount, dailyPercent, weeklyPercent };
}

export function calculateDifficultyPercentages(stats: any) {
  const easy = stats?.easy || 0;
  const medium = stats?.medium || 0;
  const hard = stats?.hard || 0;
  const total = easy + medium + hard || 1;

  return {
    easy,
    medium,
    hard,
    easyPct: (easy / total) * 100,
    medPct: (medium / total) * 100,
    hardPct: (hard / total) * 100,
  };
}

export function getGoalEmoji(percent: number): string {
  if (percent >= 100) return '🎉'; // Celebration
  if (percent >= 50) return '😄'; // Happy
  if (percent > 0) return '🙂'; // Slight smile
  return '😢'; // Sad (0%)
}

export function formatChartData(analytics: any) {
  const totalSolved = analytics?.totalSolved || 0;
  const totalAttempted = analytics?.totalAttempted || 0;
  
  const difficultyData = [
    { name: 'Easy', value: analytics?.difficultyBreakdown?.Easy || 0 },
    { name: 'Medium', value: analytics?.difficultyBreakdown?.Medium || 0 },
    { name: 'Hard', value: analytics?.difficultyBreakdown?.Hard || 0 },
  ];

  const statusData = [
    { name: 'Solved', value: totalSolved },
    { name: 'Attempted', value: totalAttempted - totalSolved },
    { name: 'Unsolved', value: Math.max(0, (analytics?.totalQuestions || 0) - totalAttempted) },
  ];

  return { difficultyData, statusData };
}
