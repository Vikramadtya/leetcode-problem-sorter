import SEO from '../components/SEO';
import Header from '../components/Header';
import Heatmap from '../components/Heatmap';
import useDashboardAnalytics from '../hooks/useDashboardAnalytics';
import {
  PlatformPieChart,
  ConfidenceBarChart,
  SolvedAreaChart,
  DifficultyLineChart,
  PatternsRadarChart,
  HorizontalBarChart,
  SimpleBarChart,
} from '../components/charts';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { formatChartData } from '../lib/statsUtils';
import styles from './Dashboard.module.css';


const DIFF_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#6b7280'];
const CONFIDENCE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--bg-card)',
    borderColor: 'var(--border-color)',
    borderRadius: '8px',
  },
  itemStyle: { color: 'var(--text-main)' },
  cursor: { fill: 'var(--bg-main)' },
};

export default function Dashboard() {
  const {
    status,
    isLoading,
    stats,
    analytics,
    totalSolved,
    totalAttempted,
    totalRevise,
    completionPercent,
    hasData,
  } = useDashboardAnalytics();

  if (status === 'loading' || (isLoading && !stats?.activityTimeline)) {
    return (
      <div className={styles.container}>
        <SEO title="Dashboard | Tacker" />
        <Header authEnabled={true} />
        <main className={styles.main}>
          <div className={styles.loading}>Loading your insights…</div>
        </main>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={styles.container}>
        <SEO title="Dashboard | Tacker" />
        <Header authEnabled={true} />
        <main className={styles.main}>
          <div className={styles.error}>
            No data yet — solve some problems to see your insights!
          </div>
        </main>
      </div>
    );
  }

  const { difficultyData, statusData } = formatChartData(analytics);

  return (
    <div className={styles.container}>
      <SEO title="Dashboard | Tacker" />
      <Header authEnabled={true} />
      <main className={styles.main}>
        <h1 className={styles.title}>Your Preparation Insights</h1>

        {/* ── Summary cards ────────────────────────────────────────────── */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3>Total Solved</h3>
            <p className={styles.metric}>{totalSolved}</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${completionPercent}%` }} />
            </div>
            <p className={styles.percent}>{completionPercent}% Completion</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Total Attempted</h3>
            <p className={styles.metric}>{analytics.totalAttempted || 0}</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Due Revisions</h3>
            <p className={styles.metric}>{totalRevise}</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Current Streak</h3>
            <p className={styles.metric}>{stats.currentStreak || 0} 🔥</p>
          </div>
        </div>

        <div className={styles.heatmapCard}>
          <Heatmap data={stats.activityTimeline || []} />
        </div>

        {/* ── Charts Grid ────────────────────────────────────────────── */}
        <ErrorBoundary>
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <h3>Problem Status</h3>
              <div className={styles.chartWrapper}>
                <PlatformPieChart
                  data={statusData}
                  colors={STATUS_COLORS}
                  tooltipStyle={tooltipStyle}
                />
              </div>
            </div>

          <div className={styles.chartCard}>
            <h3>Difficulty Breakdown</h3>
            <div className={styles.chartWrapper}>
              <PlatformPieChart
                data={difficultyData}
                colors={DIFF_COLORS}
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Platform Usage</h3>
            <div className={styles.chartWrapper}>
              <PlatformPieChart
                data={analytics.platformsBreakdown || []}
                colors={DIFF_COLORS}
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Confidence vs Difficulty</h3>
            <div className={styles.chartWrapper}>
              <ConfidenceBarChart
                data={analytics.confidenceVsDifficulty || []}
                colors={CONFIDENCE_COLORS}
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <h3>Problems Solved Over Time</h3>
            <div className={styles.chartWrapper}>
              <SolvedAreaChart
                data={analytics.problemsSolvedOverTime || []}
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <h3>Time Per Difficulty Over Time</h3>
            <div className={styles.chartWrapper}>
              <DifficultyLineChart
                data={analytics.timePerDifficulty || []}
                colors={DIFF_COLORS}
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Pattern Mastery Score</h3>
            <div className={styles.chartWrapper}>
              <PatternsRadarChart
                data={analytics.patternMasteryData || []}
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Pattern Usage Frequency</h3>
            <div className={styles.chartWrapper}>
              <HorizontalBarChart
                data={(analytics.patternUsageFrequency || []).slice(0, 10)}
                fill="var(--success)"
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Tags Frequency</h3>
            <div className={styles.chartWrapper}>
              <HorizontalBarChart
                data={(analytics.tagsFrequency || []).slice(0, 10)}
                fill="#8b5cf6"
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Confidence to Problem Count</h3>
            <div className={styles.chartWrapper}>
              <SimpleBarChart
                data={analytics.confidenceToProblemCount || []}
                xAxisKey="level"
                dataKey="count"
                fill="#ec4899"
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Patterns Most Revised</h3>
            <div className={styles.chartWrapper}>
              <HorizontalBarChart
                data={(analytics.patternsMostRevised || []).slice(0, 10)}
                fill="#14b8a6"
                tooltipStyle={tooltipStyle}
              />
            </div>
          </div>
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
