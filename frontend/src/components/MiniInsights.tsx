import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

import { useAppStore } from '../store/useAppStore';
import { calculateGoalsProgress, calculateDifficultyPercentages, getGoalEmoji } from '../lib/statsUtils';

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

function MiniInsights({
  stats = {},
  recentActivity = [],
  upcomingRevisions = [],
  topPatterns = [],
}) {
  const settings = useAppStore((state) => state.settings);

  // 3. Goals
  const { dailyGoal, weeklyGoal, dailyCount, weeklyCount, dailyPercent, weeklyPercent } = calculateGoalsProgress(stats, settings);

  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (dailyPercent >= 100 && dailyCount > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000); // 5 seconds of confetti
      return () => clearTimeout(timer);
    }
  }, [dailyPercent, dailyCount]);

  // 4. Difficulty Breakdown
  const { easy, medium, hard, easyPct, medPct, hardPct } = calculateDifficultyPercentages(stats);

  // 5. Top Patterns (from backend)
  // topPatterns is passed as prop
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
                {upcomingRevisions.map((q) => (
                  <li key={q.id} className={styles.listItem}>
                    <div
                      className={styles.diffDot}
                      style={{ backgroundColor: getDiffColor(q.difficulty) }}
                    />
                    <a
                      href={q.url?.startsWith('http') ? q.url : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.itemLink}
                    >
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
                {recentActivity.map((q) => (
                  <li key={q.id} className={styles.listItem}>
                    <div
                      className={styles.diffDot}
                      style={{ backgroundColor: getDiffColor(q.difficulty) }}
                    />
                    <a
                      href={q.url?.startsWith('http') ? q.url : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.itemLink}
                    >
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
            <span aria-hidden="true">{getGoalEmoji(dailyPercent)}</span> Daily Goal
          </div>
          <div className={styles.widgetContent}>
            <div className={styles.goalHeader}>
              <div className={styles.goalCount}>{dailyCount}</div>
              <div className={styles.goalTarget}>/ {dailyGoal} problems</div>
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
            <span aria-hidden="true">{getGoalEmoji(weeklyPercent)}</span> Weekly Goal
          </div>
          <div className={styles.widgetContent}>
            <div className={styles.goalHeader}>
              <div className={styles.goalCount}>{weeklyCount}</div>
              <div className={styles.goalTarget}>/ {weeklyGoal} problems</div>
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
              <div
                className={styles.diffEasy}
                style={{ width: `${easyPct}%` }}
                title={`Easy: ${easy}`}
              />
              <div
                className={styles.diffMed}
                style={{ width: `${medPct}%` }}
                title={`Medium: ${medium}`}
              />
              <div
                className={styles.diffHard}
                style={{ width: `${hardPct}%` }}
                title={`Hard: ${hard}`}
              />
            </div>
            <div className={styles.diffLegend}>
              <div className={styles.diffLegendItem}>
                <div className={`${styles.diffDot} ${styles.diffEasy}`} /> Easy
              </div>
              <div className={styles.diffLegendItem}>
                <div className={`${styles.diffDot} ${styles.diffMed}`} /> Med
              </div>
              <div className={styles.diffLegendItem}>
                <div className={`${styles.diffDot} ${styles.diffHard}`} /> Hard
              </div>
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
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
        />
      )}
    </div>
  );
}

export default React.memo(MiniInsights);
