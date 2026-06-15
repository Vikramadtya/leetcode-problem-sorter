import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SimpleBarChart({
  data,
  xAxisKey = 'name',
  dataKey = 'count',
  fill = '#ec4899',
  tooltipStyle,
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey={xAxisKey} stroke="var(--text-muted)" />
        <YAxis stroke="var(--text-muted)" />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey={dataKey} fill={fill} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
