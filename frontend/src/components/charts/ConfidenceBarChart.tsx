import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ConfidenceBarChart({ data, colors, tooltipStyle }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey="difficulty" stroke="var(--text-muted)" />
        <YAxis stroke="var(--text-muted)" />
        <Tooltip {...tooltipStyle} />
        <Legend />
        <Bar dataKey="level1" stackId="a" name="Conf: 1" fill={colors[0]} />
        <Bar dataKey="level2" stackId="a" name="Conf: 2" fill={colors[1]} />
        <Bar dataKey="level3" stackId="a" name="Conf: 3" fill={colors[2]} />
        <Bar dataKey="level4" stackId="a" name="Conf: 4" fill={colors[3]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
