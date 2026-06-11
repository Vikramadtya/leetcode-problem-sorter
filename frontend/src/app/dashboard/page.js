'use client';

/**
 * Dashboard page — /dashboard
 *
 * Displays full analytics for the authenticated user.
 * Now extended to include all requested insights:
 *  - Problem Status Overview (Pie)
 *  - Confidence vs Difficulty (Bar)
 *  - Pattern Usage Frequency & Problems by Pattern
 *  - Tags Frequency & Problems by Tag
 *  - Problems Solved Over Time (Area Chart)
 *  - Time Per Difficulty Over Time (Line Chart)
 *  - Patterns Most Revised (Bar)
 *  - Confidence to Problem Count (Bar)
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import Header from '../components/Header';
import Heatmap from '../components/Heatmap';
import { useAppStore } from '../../store/useAppStore';
import styles from './page.module.css';

const DIFF_COLORS  = ['#10b981', '#f59e0b', '#ef4444'];
const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#6b7280'];
const CONFIDENCE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--bg-card)',
    borderColor:     'var(--border-color)',
    borderRadius:    '8px',
  },
  itemStyle: { color: 'var(--text-main)' },
  cursor:    { fill: 'var(--bg-main)' },
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { stats, fetchStats, isLoading } = useAppStore();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, router, fetchStats]);

  if (status === 'loading' || (isLoading && !stats.activityTimeline)) {
    return (
      <div className={styles.container}>
        <Header authEnabled={true} />
        <main className={styles.main}>
          <div className={styles.loading}>Loading your insights…</div>
        </main>
      </div>
    );
  }

  if (!stats || (stats.solved === 0 && stats.attempted === 0 && !stats.activityTimeline)) {
    return (
      <div className={styles.container}>
        <Header authEnabled={true} />
        <main className={styles.main}>
          <div className={styles.error}>
            No data yet — solve some problems to see your insights!
          </div>
        </main>
      </div>
    );
  }

  const analytics = stats._raw || {};

  const totalQs = analytics.totalQuestions || 0;
  const totalSolved = analytics.totalSolved || 0;
  const completionPercent = totalQs > 0 ? ((totalSolved / totalQs) * 100).toFixed(1) : '0.0';

  const difficultyData = [
    { name: 'Easy',   value: analytics.difficultyBreakdown?.Easy   || 0 },
    { name: 'Medium', value: analytics.difficultyBreakdown?.Medium || 0 },
    { name: 'Hard',   value: analytics.difficultyBreakdown?.Hard   || 0 },
  ];

  return (
    <div className={styles.container}>
      <Header authEnabled={true} />
      <main className={styles.main}>
        <h1 className={styles.title}>Your Preparation Insights</h1>

        {/* ── Summary cards ────────────────────────────────────────────── */}
        <div className={styles.summaryGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
            <p className={styles.metric}>{analytics.totalRevise || 0}</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Favourites</h3>
            <p className={styles.metric}>{analytics.totalFavourite || 0}</p>
          </div>
        </div>

        {/* ── Activity heatmap ─────────────────────────────────────────── */}
        {analytics.activityTimeline && (
          <div className={styles.chartCard} style={{ marginTop: '2rem' }}>
            <h3>Calendar (Activity Heatmap)</h3>
            <Heatmap data={analytics.activityTimeline} />
          </div>
        )}

        <div className={styles.chartsGrid} style={{ marginTop: '2rem' }}>
          
          {/* Problem Status Overview */}
          <div className={styles.chartCard}>
            <h3>Problem Status Overview</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={analytics.problemStatusOverview || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="name">
                    {(analytics.problemStatusOverview || []).map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Difficulty Breakdown */}
          <div className={styles.chartCard}>
            <h3>Difficulty Breakdown</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={difficultyData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {difficultyData.map((_, i) => <Cell key={i} fill={DIFF_COLORS[i % DIFF_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platforms pie */}
          <div className={styles.chartCard}>
            <h3>Platform Usage</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={analytics.platformsBreakdown || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="name">
                    {(analytics.platformsBreakdown || []).map((_, i) => <Cell key={i} fill={DIFF_COLORS[i % DIFF_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Confidence vs Difficulty */}
          <div className={styles.chartCard}>
            <h3>Confidence vs Difficulty</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={analytics.confidenceVsDifficulty || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="difficulty" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="level1" stackId="a" name="Conf: 1" fill={CONFIDENCE_COLORS[0]} />
                  <Bar dataKey="level2" stackId="a" name="Conf: 2" fill={CONFIDENCE_COLORS[1]} />
                  <Bar dataKey="level3" stackId="a" name="Conf: 3" fill={CONFIDENCE_COLORS[2]} />
                  <Bar dataKey="level4" stackId="a" name="Conf: 4" fill={CONFIDENCE_COLORS[3]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Problems Solved Over Time */}
          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <h3>Problems Solved Over Time</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={analytics.problemsSolvedOverTime || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Time Per Difficulty Over Time */}
          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <h3>Time Per Difficulty Over Time (mins)</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={analytics.timePerDiffOverTime || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="Easy" stroke={DIFF_COLORS[0]} />
                  <Line type="monotone" dataKey="Medium" stroke={DIFF_COLORS[1]} />
                  <Line type="monotone" dataKey="Hard" stroke={DIFF_COLORS[2]} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top companies bar */}
          <div className={styles.chartCard}>
            <h3>Top Companies (Solved)</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={analytics.topCompanies || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pattern Usage Frequency */}
          <div className={styles.chartCard}>
            <h3>Pattern Usage Frequency</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={(analytics.patternUsageFrequency || []).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="var(--success)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tags Frequency */}
          <div className={styles.chartCard}>
            <h3>Tags Frequency</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={(analytics.tagsFrequency || []).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Confidence to Problem Count */}
          <div className={styles.chartCard}>
            <h3>Confidence to Problem Count</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={analytics.confidenceToProblemCount || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="level" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average time per difficulty */}
          <div className={styles.chartCard}>
            <h3>Avg Time per Difficulty</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={analytics.avgTimePerDiff || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="avgMinutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Patterns Most Revised */}
          <div className={styles.chartCard}>
            <h3>Patterns Most Revised</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={(analytics.patternsMostRevised || []).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
