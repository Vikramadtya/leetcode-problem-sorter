'use client';

import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import styles from './MiniInsights.module.css';

// Re-use utility function for difficulties
function getDiffColor(diff) {
  const d = diff?.toLowerCase() || '';
  if (d === 'easy') return 'var(--success)';
  if (d === 'medium') return 'var(--warning)';
  if (d === 'hard') return 'var(--danger)';
  return 'var(--text-muted)';
}

function getDiffDotClass(diff) {
  const d = diff?.toLowerCase() || '';
  if (d === 'easy') return styles.diffEasy;
  if (d === 'medium') return styles.diffMed;
  if (d === 'hard') return styles.diffHard;
  return '';
}

export default function MiniInsights({ stats = {} }) {
  const settings = useAppStore(state => state.settings);

  // 1. Recent Activity (from backend)
  const recentActivity = stats.recentActivity || [];

  // 2. Upcoming Revisions (from backend)
  const upcomingRevisions = stats.upcomingRevisions || [];

  // 3. Goals
  const DAILY_GOAL = parseInt(settings?.dailyGoal || '2', 10);
  const WEEKLY_GOAL = parseInt(settings?.weeklyGoal || '10', 10);
  
  const dailyCount = stats.dailyCount || 0;
  const weeklyCount = stats.weeklyCount || 0;
  
  const dailyPercent = Math.min(100, Math.round((dailyCount / DAILY_GOAL) * 100));
  const weeklyPercent = Math.min(100, Math.round((weeklyCount / WEEKLY_GOAL) * 100));

  // 4. Difficulty Breakdown
  const easy = stats.easy || 0;
  const medium = stats.medium || 0;
  const hard = stats.hard || 0;
  const totalDiff = easy + medium + hard || 1; // avoid /0
  
  const easyPct = (easy / totalDiff) * 100;
  const medPct = (medium / totalDiff) * 100;
  const hardPct = (hard / totalDiff) * 100;

  // 5. Top Patterns (from backend)
  const topPatterns = stats.topPatterns || [];

  return (
    <div className={styles.insightsContainer}>
      <div className={styles.widgetsGrid}>
        
        {/* ── 1. Upcoming Revisions ── */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span aria-hidden="true">🔄</span> Due For Revision
          </div>
          <div className={styles.widgetContent}>
            {upcomingRevisions.length > 0 ? (
              <ul className={styles.list}>
                {upcomingRevisions.map(q => (
                  <li key={q.id} className={styles.listItem}>
                    <div className={styles.diffDot} style={{ backgroundColor: getDiffColor(q.difficulty) }} />
                    <a href={q.url} target="_blank" rel="noopener noreferrer" className={styles.itemLink}>
                      {q.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyText}>All caught up! 🎉</div>
            )}
          </div>
        </div>

        {/* ── 2. Recent Activity ── */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span aria-hidden="true">🕒</span> Recent Activity
          </div>
          <div className={styles.widgetContent}>
            {recentActivity.length > 0 ? (
              <ul className={styles.list}>
                {recentActivity.map(q => (
                  <li key={q.id} className={styles.listItem}>
                    <div className={styles.diffDot} style={{ backgroundColor: getDiffColor(q.difficulty) }} />
                    <a href={q.url} target="_blank" rel="noopener noreferrer" className={styles.itemLink}>
                      {q.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyText}>No activity yet.</div>
            )}
          </div>
        </div>

        {/* ── 3. Daily Goal ── */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span aria-hidden="true">🔥</span> Daily Goal
          </div>
          <div className={styles.widgetContent}>
            <div className={styles.goalHeader}>
              <div className={styles.goalCount}>{dailyCount}</div>
              <div className={styles.goalTarget}>/ {DAILY_GOAL} problems</div>
            </div>
            <div className={styles.progressBarBg}>
              <div 
                className={styles.progressBarFill} 
                style={{ width: `${dailyPercent}%` }} 
                title={`${dailyPercent}%`} 
              />
            </div>
          </div>
        </div>

        {/* ── 4. Weekly Goal ── */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span aria-hidden="true">🎯</span> Weekly Goal
          </div>
          <div className={styles.widgetContent}>
            <div className={styles.goalHeader}>
              <div className={styles.goalCount}>{weeklyCount}</div>
              <div className={styles.goalTarget}>/ {WEEKLY_GOAL} problems</div>
            </div>
            <div className={styles.progressBarBg}>
              <div 
                className={styles.progressBarFill} 
                style={{ width: `${weeklyPercent}%` }} 
                title={`${weeklyPercent}%`} 
              />
            </div>
          </div>
        </div>

        {/* ── 4. Difficulty Breakdown ── */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span aria-hidden="true">📊</span> Difficulty Split
          </div>
          <div className={styles.widgetContent}>
            <div className={styles.diffBarContainer}>
              <div className={styles.diffEasy} style={{ width: `${easyPct}%` }} title={`Easy: ${easy}`} />
              <div className={styles.diffMed} style={{ width: `${medPct}%` }} title={`Medium: ${medium}`} />
              <div className={styles.diffHard} style={{ width: `${hardPct}%` }} title={`Hard: ${hard}`} />
            </div>
            <div className={styles.diffLegend}>
              <div className={styles.diffLegendItem}><div className={`${styles.diffDot} ${styles.diffEasy}`} /> Easy</div>
              <div className={styles.diffLegendItem}><div className={`${styles.diffDot} ${styles.diffMed}`} /> Med</div>
              <div className={styles.diffLegendItem}><div className={`${styles.diffDot} ${styles.diffHard}`} /> Hard</div>
            </div>
          </div>
        </div>

        {/* ── 5. Top Patterns ── */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span aria-hidden="true">🧠</span> Top Patterns
          </div>
          <div className={styles.widgetContent}>
            {topPatterns.length > 0 ? (
              <div className={styles.patternsList}>
                {topPatterns.map(({ pattern, count }) => (
                  <div key={pattern} className={styles.patternTag}>
                    {pattern}
                    <span className={styles.patternCount}>{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyText}>No pattern data.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
