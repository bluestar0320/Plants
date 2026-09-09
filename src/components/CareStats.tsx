import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Plant } from '../types';
import { daysAgoISO, daysSince } from '../lib/date';
import { radius, spacing, useThemeColors, type ThemeColors } from '../theme';

const WINDOW_DAYS = 30;

interface PlantAdherence {
  id: string;
  name: string;
  adherence: number;
}

const computeAdherence = (plant: Plant): number => {
  const daysTracked = Math.max(1, Math.min(WINDOW_DAYS, daysSince(plant.createdAt)));
  const expected = Math.max(1, Math.round(daysTracked / plant.wateringIntervalDays));
  const cutoff = daysAgoISO(WINDOW_DAYS);
  const actual = (plant.wateringHistory ?? []).filter((d) => d >= cutoff).length;
  return Math.min(100, Math.round((actual / expected) * 100));
};

interface Props {
  plants: Plant[];
}

export default function CareStats({ plants }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rows: PlantAdherence[] = useMemo(
    () =>
      plants
        .map((p) => ({ id: p.id, name: p.name, adherence: computeAdherence(p) }))
        .sort((a, b) => a.adherence - b.adherence),
    [plants],
  );

  const average = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + r.adherence, 0) / rows.length)
    : 0;

  const barColor = (value: number): string => {
    if (value >= 80) return colors.green;
    if (value >= 50) return colors.amber;
    return colors.danger;
  };

  if (plants.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>등록된 식물이 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{average}%</Text>
        <Text style={styles.summaryLabel}>최근 30일 평균 급수 이행률</Text>
      </View>

      <Text style={styles.sectionTitle}>식물별 이행률 (낮은 순)</Text>
      {rows.map((r) => (
        <View key={r.id} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowName} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.rowValue}>{r.adherence}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${r.adherence}%`, backgroundColor: barColor(r.adherence) },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { padding: spacing.lg, gap: spacing.md },
    empty: { padding: spacing.xl, alignItems: 'center' },
    emptyText: { color: colors.textDim, fontSize: 14 },
    summaryCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.xs,
    },
    summaryValue: { fontSize: 32, fontWeight: '700', color: colors.textHeading },
    summaryLabel: { fontSize: 13, color: colors.textDim },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textHeading, marginTop: spacing.sm },
    row: { gap: spacing.xs },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    rowName: { fontSize: 14, color: colors.text, flexShrink: 1 },
    rowValue: { fontSize: 13, fontWeight: '700', color: colors.textHeading },
    barTrack: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.bg,
      overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: radius.pill },
  });
