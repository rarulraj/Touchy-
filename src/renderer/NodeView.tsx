import { ChartGraphic } from '@/renderer/ChartGraphic';
import { isActive, isOn, readMetric, readProgress, readText, tableRows } from '@/renderer/read';
import type { Project, Runtime, Scope, Style, TouchNode } from '@/schema/types';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

const shadow = {
  shadowColor: '#1C1714',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

export function NodeView({
  node,
  project,
  scope,
  runtime,
  mode,
}: {
  node: TouchNode;
  project: Project;
  scope: Scope;
  runtime: Runtime;
  mode: 'play' | 'edit' | 'circle';
}) {
  const visible = isOn(node, scope);
  if (!visible && mode === 'play') return null;
  const active = isActive(node, scope);
  const style = active && node.activeStyle ? { ...node.style, ...node.activeStyle } : node.style;
  const frame = node.frame;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.frame,
        {
          left: frame.x,
          top: frame.y,
          width: frame.width,
          height: frame.height,
          transform: [{ rotate: `${frame.rotation ?? 0}deg` }],
          opacity: visible ? (style.opacity ?? 1) : 0.35,
        },
        paint(style),
        style.shadow ? shadow : null,
      ]}
    >
      <Body node={node} project={project} scope={scope} runtime={runtime} style={style} />
    </View>
  );
}

function Body({
  node,
  scope,
  runtime,
  style,
}: {
  node: TouchNode;
  project: Project;
  scope: Scope;
  runtime: Runtime;
  style: Style;
}) {
  if (node.type === 'text' || node.type === 'button') {
    return <Text style={[styles.text, typeStyle(style), { textAlign: style.align ?? (node.type === 'button' ? 'center' : 'left') }]}>{readText(node, scope) || node.text}</Text>;
  }
  if (node.type === 'metric') {
    return (
      <View>
        <Text style={[styles.metricLabel, { color: style.color ?? '#1C1714' }]}>{node.label}</Text>
        <Text style={[styles.metricValue, typeStyle(style)]}>{readMetric(node, scope)}</Text>
      </View>
    );
  }
  if (node.type === 'image' && node.src) {
    return <Image source={{ uri: node.src }} style={styles.fill} contentFit="cover" />;
  }
  if (node.type === 'chart') {
    return <ChartGraphic node={node} scope={scope} width={node.frame.width} height={node.frame.height} />;
  }
  if (node.type === 'table' && node.table) {
    const rows = tableRows(node, scope).slice(0, 8);
    return (
      <View style={styles.table}>
        <View style={styles.tableRow}>
          {node.table.columns.map((column) => (
            <Text key={column.key} style={[styles.tableHead, { color: style.color ?? '#1C1714' }]}>
              {column.label}
            </Text>
          ))}
        </View>
        {rows.map((row, index) => (
          <View key={`${index}-${String(row.name ?? index)}`} style={styles.tableRow}>
            {node.table?.columns.map((column) => (
              <Text key={column.key} style={[styles.tableCell, { color: style.color ?? '#1C1714' }]}>
                {column.key === 'amount' && typeof row[column.key] === 'number' ? `$${row[column.key]}` : String(row[column.key] ?? '')}
              </Text>
            ))}
          </View>
        ))}
        {rows.length === 0 ? <Text style={styles.empty}>Nothing in this view.</Text> : null}
      </View>
    );
  }
  if (node.type === 'input') {
    const value = node.bind ? String(scope.state[node.bind] ?? '') : '';
    return <Text style={[styles.text, typeStyle(style)]}>{value || node.placeholder || 'Type'}</Text>;
  }
  if (node.type === 'nav') {
    return (
      <View style={styles.nav}>
        {node.items?.map((item) => {
          const current = item.pageId === runtime.pageId;
          return (
            <Text key={item.pageId} style={[styles.navItem, { color: style.color ?? '#1C1714' }, current && styles.navOn]}>
              {item.label}
            </Text>
          );
        })}
      </View>
    );
  }
  if (node.type === 'progress') {
    const amount = readProgress(node, scope);
    return (
      <View style={[styles.track, { backgroundColor: style.background ?? '#E7D9C8', borderRadius: style.radius ?? 8 }]}>
        <View style={[styles.fillBar, { width: `${amount * 100}%`, backgroundColor: style.color ?? '#FF4B3E', borderRadius: style.radius ?? 8 }]} />
      </View>
    );
  }
  if (node.type === 'swatch') {
    return <Text style={[styles.text, typeStyle(style), { textAlign: 'center' }]}>{node.text}</Text>;
  }
  if (node.type === 'shape' && node.shape === 'ellipse') {
    return <View style={[styles.fill, { borderRadius: 999, backgroundColor: style.background }]} />;
  }
  return null;
}

function paint(style: Style) {
  return {
    backgroundColor: style.background,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth ?? 0,
    borderRadius: style.radius ?? 0,
    padding: style.padding,
    alignItems: style.align === 'center' ? 'center' : style.align === 'right' ? 'flex-end' : 'flex-start',
    justifyContent: 'center',
  } as const;
}

function typeStyle(style: Style) {
  return {
    color: style.color ?? '#1C1714',
    fontSize: style.fontSize ?? 16,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    fontFamily: style.font === 'display' ? 'Fraunces_700Bold' : undefined,
    fontStyle: style.italic ? 'italic' : 'normal',
    width: '100%',
  } as const;
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', overflow: 'hidden' },
  text: { width: '100%' },
  fill: { width: '100%', height: '100%' },
  metricLabel: { fontSize: 12, opacity: 0.7, fontFamily: 'Outfit_500Medium' },
  metricValue: { fontSize: 28, marginTop: 4 },
  table: { flex: 1, padding: 12, gap: 6 },
  tableRow: { flexDirection: 'row', gap: 8 },
  tableHead: { flex: 1, fontSize: 11, fontFamily: 'Outfit_600SemiBold', opacity: 0.55 },
  tableCell: { flex: 1, fontSize: 13, fontFamily: 'Outfit_400Regular' },
  empty: { marginTop: 12, opacity: 0.6 },
  nav: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  navItem: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  navOn: { textDecorationLine: 'underline' },
  track: { width: '100%', height: '100%', overflow: 'hidden' },
  fillBar: { height: '100%' },
});
