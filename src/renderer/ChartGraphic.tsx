import { chartSeries } from '@/renderer/read';
import type { Scope, TouchNode } from '@/schema/types';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function ChartGraphic({ node, scope, width, height }: { node: TouchNode; scope: Scope; width: number; height: number }) {
  const series = chartSeries(node, scope).filter((point) => point.value !== 0 || point.label);
  const color = node.style.color || '#FF4B3E';
  const muted = 'rgba(28,23,20,0.35)';
  if (!series.length) return null;
  const kind = node.chart?.kind ?? 'bar';
  if (kind === 'donut') return <Donut series={series} color={color} size={Math.min(width, height)} />;
  if (kind === 'line' || kind === 'area') return <Trend series={series} width={width} height={height} color={color} area={kind === 'area'} />;
  return <Bars series={series} width={width} height={height} color={color} muted={muted} />;
}

function Bars({
  series,
  width,
  height,
  color,
  muted,
}: {
  series: { label: string; value: number }[];
  width: number;
  height: number;
  color: string;
  muted: string;
}) {
  const max = Math.max(...series.map((point) => point.value), 1);
  const gap = 8;
  const barWidth = Math.max(12, (width - gap * (series.length - 1)) / series.length);
  const labelSpace = 18;
  return (
    <Svg width={width} height={height}>
      {series.map((point, index) => {
        const barHeight = Math.max(4, ((height - labelSpace - 8) * point.value) / max);
        const x = index * (barWidth + gap);
        const y = height - labelSpace - barHeight;
        return (
          <Rect key={point.label} x={x} y={y} width={barWidth} height={barHeight} rx={8} fill={index % 2 ? muted : color} />
        );
      })}
    </Svg>
  );
}

function Trend({
  series,
  width,
  height,
  color,
  area,
}: {
  series: { label: string; value: number }[];
  width: number;
  height: number;
  color: string;
  area: boolean;
}) {
  const max = Math.max(...series.map((point) => point.value), 1);
  const step = series.length === 1 ? width : width / (series.length - 1);
  const points = series.map((point, index) => {
    const x = index * step;
    const y = height - 16 - ((height - 24) * point.value) / max;
    return `${x},${y}`;
  });
  const line = `M ${points.join(' L ')}`;
  const fill = `${line} L ${width},${height} L 0,${height} Z`;
  return (
    <Svg width={width} height={height}>
      {area ? <Path d={fill} fill={color} opacity={0.18} /> : null}
      <Path d={line} stroke={color} strokeWidth={3} fill="none" />
    </Svg>
  );
}

function Donut({ series, color, size }: { series: { label: string; value: number }[]; color: string; size: number }) {
  const total = series.reduce((sum, point) => sum + point.value, 0) || 1;
  const radius = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;
  const colors = [color, '#1C1714', '#2F5BFF', '#1E8C6E', '#E7A423', '#8A7B6E'];
  return (
    <Svg width={size} height={size}>
      {series.map((point, index) => {
        const slice = (point.value / total) * Math.PI * 2;
        const start = angle;
        angle += slice;
        const large = slice > Math.PI ? 1 : 0;
        const x1 = cx + radius * Math.cos(start);
        const y1 = cy + radius * Math.sin(start);
        const x2 = cx + radius * Math.cos(angle);
        const y2 = cy + radius * Math.sin(angle);
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
        return <Path key={point.label} d={d} fill={colors[index % colors.length]} />;
      })}
      <Circle cx={cx} cy={cy} r={radius * 0.55} fill="#FFF9F2" />
    </Svg>
  );
}
