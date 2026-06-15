/**
 * LandingCharts
 *
 * Renders three demo/mock-data charts (bar, pie, line) used exclusively on
 * the public landing page to give visitors a visual preview of the analytics
 * they will see after signing in.  None of this data is fetched from the API.
 */

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import styles from './LandingCharts.module.css';

/** Chart accent colours shared across all three charts. */
const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981'];

/** Mock tag-frequency data. */
const tagsData = [
  { tag: 'DP', count: 12 },
  { tag: 'Graph', count: 8 },
  { tag: 'Greedy', count: 5 },
  { tag: 'Binary Search', count: 6 },
];

/** Mock pattern-distribution data. */
const patternsData = [
  { pattern: 'Two Pointers', value: 10 },
  { pattern: 'Sliding Window', value: 6 },
  { pattern: 'Recursion', value: 4 },
  { pattern: 'Union Find', value: 2 },
];

/** Mock problems-solved-over-time data. */
const problemsOverTime = [
  { date: 'Jun 4', solved: 4 },
  { date: 'Jun 7', solved: 3 },
  { date: 'Jun 9', solved: 1 },
  { date: 'Jun 11', solved: 3 },
  { date: 'Jun 13', solved: 4 },
  { date: 'Jun 15', solved: 2 },
  { date: 'Jun 17', solved: 3 },
  { date: 'Jun 19', solved: 4 },
  { date: 'Aug 1', solved: 2 },
  { date: 'Aug 3', solved: 3 },
  { date: 'Sep 5', solved: 1 },
  { date: 'Sep 8', solved: 4 },
];

export default function LandingCharts() {
  return (
    <div className={styles.grid}>
      {/* Tags Frequency — bar chart */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Tags Frequency</h3>
        <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
          <BarChart data={tagsData}>
            <XAxis dataKey="tag" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Problems by Pattern — pie chart */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Problems by Pattern</h3>
        <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={patternsData}
              dataKey="value"
              nameKey="pattern"
              cx="50%"
              cy="50%"
              outerRadius={75}
              label
            >
              {patternsData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Problems Solved Over Time — line chart */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Problems Solved Over Time</h3>
        <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
          <LineChart data={problemsOverTime}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="solved" stroke="#06b6d4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
