import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function PatternsRadarChart({ data, tooltipStyle }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="var(--border-color)" />
        <PolarAngleAxis dataKey="pattern" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="var(--text-muted)" />
        <Tooltip {...tooltipStyle} />
        <Radar
          name="Solved"
          dataKey="count"
          stroke="var(--primary)"
          fill="var(--primary)"
          fillOpacity={0.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
