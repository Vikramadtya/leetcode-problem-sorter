'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import Heatmap from '../components/Heatmap';
import { apiClient } from '../../lib/api/apiClient';
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
      apiClient.getAnalytics()
        .then(data => {
          setAnalytics(data);
          setLoading(false);
        })
        .catch(err => {
          // Errors handled by apiClient toast
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
        
        {analytics && (
          <div className={styles.motivationBanner}>
            <h3>AI Coach</h3>
            <p>
              {analytics.totalRevise === 0 
                ? "🌟 Your revision queue is completely clear! Great job. Time to learn something new or tackle a hard problem."
                : `🎯 You have ${analytics.totalRevise} problems due for revision. Knock them out to solidify your memory.`}
            </p>
            {analytics.patternMasteryData && analytics.patternMasteryData.length > 0 && (
              <p>
                💪 You are strongest in <strong>{analytics.patternMasteryData[0].name}</strong> with a {analytics.patternMasteryData[0].score}% mastery. Keep it up!
              </p>
            )}
          </div>
        )}
        
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
            <h3>Due Revisions</h3>
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

          <div className={styles.chartCard}>
            <h3>Platforms Breakdown</h3>
            <div className={styles.chartWrapper}>
              {analytics.platformsBreakdown && analytics.platformsBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.platformsBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="name"
                    >
                      {analytics.platformsBreakdown.map((entry, index) => (
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
              ) : (
                <div className={styles.emptyChart}>No platform data yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.bottomGrid}>
          <div className={styles.chartCard}>
            <h3>Average Time per Difficulty</h3>
            <div className={styles.chartWrapper}>
              {analytics.avgTimePerDiff && analytics.avgTimePerDiff.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.avgTimePerDiff} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }} />
                    <Tooltip 
                      cursor={{fill: 'var(--bg-main)'}}
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="avgMinutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>No time tracking data yet.</div>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Pattern Mastery</h3>
            <div className={styles.chartWrapper}>
              {analytics.patternMasteryData && analytics.patternMasteryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.patternMasteryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" />
                    <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" />
                    <Tooltip 
                      cursor={{fill: 'var(--bg-main)'}}
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      formatter={(value) => [`${value}%`, 'Mastery Score']}
                    />
                    <Bar dataKey="score" fill="var(--success)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>Solve and tag problems with patterns to see mastery!</div>
              )}
            </div>
          </div>

          <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
            <h3>Due Revisions</h3>
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
