import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { useSession } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';

export default function useDashboardAnalytics() {
  const { status } = useSession();
  const navigate = useNavigate();

  const { stats, fetchStats, isLoading } = useAppStore(
    useShallow((state) => ({
      stats: state.stats,
      fetchStats: state.fetchStats,
      isLoading: state.isLoading,
    }))
  );

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/');
      return;
    }
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, navigate, fetchStats]);

  const analytics = stats?._raw || {};
  const totalSolved = analytics.totalSolved || 0;
  const totalAttempted = analytics.totalAttempted || 0;
  const totalRevise = analytics.totalRevise || 0;
  const completionPercent = analytics.completionPercent || '0.0';

  const hasData = stats && (stats.solved > 0 || stats.attempted > 0 || stats.activityTimeline);

  return {
    status,
    isLoading,
    stats,
    analytics,
    totalSolved,
    totalAttempted,
    totalRevise,
    completionPercent,
    hasData,
  };
}
