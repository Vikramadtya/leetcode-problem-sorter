import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HorizontalBarChart({
  data,
  dataKey = 'count',
  nameKey = 'name',
  fill = 'var(--success)',
  tooltipStyle,
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
        <XAxis type="number" stroke="var(--text-muted)" />
        <YAxis dataKey={nameKey} type="category" width={100} stroke="var(--text-muted)" />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey={dataKey} fill={fill} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
