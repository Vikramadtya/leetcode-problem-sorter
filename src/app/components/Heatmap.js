import React from 'react';
import dayjs from 'dayjs';
import styles from './Heatmap.module.css';

export default function Heatmap({ data = [] }) {
  // Convert timeline data to a map for O(1) lookup
  const dataMap = {};
  data.forEach(item => {
    dataMap[item.date] = item.count;
  });

  // Generate last 52 weeks (364 days)
  const endDate = dayjs();
  const startDate = endDate.subtract(364, 'day'); // Approximately 52 weeks
  
  // Align start date to Sunday
  const startDayOfWeek = startDate.day();
  const alignedStartDate = startDate.subtract(startDayOfWeek, 'day');

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
    if (count === 0) return 'var(--bg-main)';
    if (count === 1) return 'var(--primary-light, #34d399)'; // Light green
    if (count <= 3) return 'var(--primary)'; // Normal green
    return 'var(--primary-dark, #059669)'; // Dark green
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
        <div className={styles.cell} style={{ backgroundColor: getColor(0) }}></div>
        <div className={styles.cell} style={{ backgroundColor: getColor(1) }}></div>
        <div className={styles.cell} style={{ backgroundColor: getColor(2) }}></div>
        <div className={styles.cell} style={{ backgroundColor: getColor(4) }}></div>
        <span className={styles.legendText}>More</span>
      </div>
    </div>
  );
}
