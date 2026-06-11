'use client';

import { memo } from 'react';
import dayjs from 'dayjs';
import styles from './Heatmap.module.css';

function Heatmap({ data, settings = {} }) {
  // Accept both:
  //   object format: { "2025-06-01": 2, "2025-06-02": 1, ... }  (from API)
  //   array format:  [{ date, count }, ...]                       (legacy)
  const dataMap = {};
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    Object.assign(dataMap, data);
  } else if (Array.isArray(data)) {
    data.forEach(item => {
      dataMap[item.date] = item.count;
    });
  }

  // Generate last 52 weeks (364 days)
  const endDate = dayjs();
  const startDate = endDate.subtract(364, 'day'); // Approximately 52 weeks
  
  // Align start date to WeekStart setting (0 = Sunday, 1 = Monday)
  const weekStart = parseInt(settings.weekStart || '0', 10);
  let startOffset = startDate.day() - weekStart;
  if (startOffset < 0) startOffset += 7;
  const alignedStartDate = startDate.subtract(startOffset, 'day');

  const totalDays = endDate.diff(alignedStartDate, 'day') + 1;
  const weeks = [];
  
  let currentWeek = [];
  for (let i = 0; i < totalDays; i++) {
    const currentDay = alignedStartDate.add(i, 'day');
    const dateStr = currentDay.format('YYYY-MM-DD');
    const count = dataMap[dateStr] || 0;
    
    currentWeek.push({
      date: dateStr,
      count,
      month: currentDay.format('MMM')
    });

    if (currentDay.day() === 6 || i === totalDays - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const getColor = (count) => {
    if (count === 0) return 'var(--bg-hover)';
    const theme = settings.heatmapTheme || 'green';
    
    if (theme === 'blue') {
      if (count === 1) return '#93c5fd';
      if (count <= 3) return '#3b82f6';
      return '#1d4ed8';
    }
    
    if (theme === 'purple') {
      if (count === 1) return '#d8b4fe';
      if (count <= 3) return '#a855f7';
      return '#7e22ce';
    }

    // Default green
    if (count === 1) return 'var(--primary-light, #34d399)';
    if (count <= 3) return 'var(--primary)';
    return 'var(--primary-dark, #059669)';
  };

  return (
    <div className={styles.heatmapWrapper}>
      <div className={styles.monthsRow}>
        {/* We skip rendering all months nicely due to grid constraints, 
            but in a full implementation we'd calculate month spans. 
            For simplicity, we leave the label row blank to align. */}
      </div>
      <div className={styles.gridContainer}>
        <div className={styles.daysColumn}>
          <div className={styles.dayLabel}>Mon</div>
          <div className={styles.dayLabel}>Wed</div>
          <div className={styles.dayLabel}>Fri</div>
        </div>
        <div className={styles.grid}>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className={styles.weekColumn}>
              {week.map((day, dIdx) => (
                <div 
                  key={day.date} 
                  className={styles.cell} 
                  style={{ backgroundColor: getColor(day.count) }}
                  title={`${day.count} submissions on ${day.date}`}
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.legend}>
        <span className={styles.legendText}>Less</span>
        <div className={`${styles.cell} ${styles.cellL0}`} aria-hidden="true" />
        <div className={`${styles.cell} ${styles.cellL1}`} aria-hidden="true" />
        <div className={`${styles.cell} ${styles.cellL2}`} aria-hidden="true" />
        <div className={`${styles.cell} ${styles.cellL3}`} aria-hidden="true" />
        <span className={styles.legendText}>More</span>
      </div>
    </div>
  );
}

export default memo(Heatmap);
