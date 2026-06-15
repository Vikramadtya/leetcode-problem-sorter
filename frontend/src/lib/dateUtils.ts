/**
 * Common date calculation utilities
 */

export function getDaysDifference(targetDateString: string): number {
  const nextDate = new Date(targetDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDate.setHours(0, 0, 0, 0);
  return Math.round((nextDate.getTime() - today.getTime()) / 86400000);
}

export function isSameWeek(dateString: string): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  const today = new Date();
  const todayTime = today.getTime();
  const dTime = d.getTime();
  const diffDays = (todayTime - dTime) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < 7 && today.getDay() >= d.getDay();
}

export function isWeeklyWrapUpTime(): boolean {
  const today = new Date();
  return today.getDay() === 1; // Monday
}
