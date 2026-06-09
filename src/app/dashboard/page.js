'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import styles from './page.module.css';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetch('/api/analytics')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch analytics');
          return res.json();
        })
        .then(data => {
          setAnalytics(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [status, router]);

  if (loading) {
    return (
      <div className={styles.container}>
        <Header authEnabled={true} />
        <main className={styles.main}>
          <div className={styles.loading}>Loading your insights...</div>
        </main>
      </div>
    );
  }

  if (!analytics || analytics.error) {
    return (
      <div className={styles.container}>
        <Header authEnabled={true} />
        <main className={styles.main}>
          <div className={styles.error}>Unable to load dashboard. Ensure your database is connected.</div>
        </main>
      </div>
    );
  }

  const difficultyData = [
    { name: 'Easy', value: analytics.difficultyBreakdown.Easy },
    { name: 'Medium', value: analytics.difficultyBreakdown.Medium },
    { name: 'Hard', value: analytics.difficultyBreakdown.Hard },
  ];

  const completionPercent = ((analytics.totalSolved / Math.max(analytics.totalQuestions, 1)) * 100).toFixed(1);

  return (
    <div className={styles.container}>
      <Header authEnabled={true} />
      <main className={styles.main}>
        <h1 className={styles.title}>Your Preparation Insights</h1>
        
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3>Total Solved</h3>
            <p className={styles.metric}>{analytics.totalSolved} <span className={styles.subtext}>/ {analytics.totalQuestions}</span></p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${completionPercent}%` }}></div>
            </div>
            <p className={styles.percent}>{completionPercent}% Completion</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Revision Queue</h3>
            <p className={styles.metric}>{analytics.totalRevise}</p>
            <p className={styles.subtext}>Problems flagged for review</p>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h3>Difficulty Breakdown</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {difficultyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-main)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Top Companies (Solved)</h3>
            <div className={styles.chartWrapper}>
              {analytics.topCompanies.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.topCompanies} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" />
                    <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" />
                    <Tooltip 
                      cursor={{fill: 'var(--bg-main)'}}
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>Solve problems to see company stats!</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.bottomGrid}>
          <div className={styles.chartCard}>
            <h3>Activity Timeline</h3>
            <div className={styles.chartWrapper}>
              {analytics.activityTimeline && analytics.activityTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.activityTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="var(--text-muted)" tickFormatter={(tick) => {
                      const d = new Date(tick);
                      return `${d.getMonth()+1}/${d.getDate()}`;
                    }} />
                    <YAxis stroke="var(--text-muted)" allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>No activity found yet. Start solving!</div>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Revision Queue</h3>
            <div className={styles.revisionList}>
              {analytics.revisionList && analytics.revisionList.length > 0 ? (
                <ul className={styles.revList}>
                  {analytics.revisionList.map(q => (
                    <li key={q.id} className={styles.revItem}>
                      <span className={styles.revId}>{q.id}</span>
                      <span className={styles.revTitle}>{q.title}</span>
                      <span className={`${styles.revDiff} ${styles[`diff${q.difficulty}`] || ''}`}>{q.difficulty}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.emptyChart}>Your revision queue is empty.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
