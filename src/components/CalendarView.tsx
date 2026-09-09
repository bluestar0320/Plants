import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Plant } from '../types';
import { daysSince, formatDate, todayISO, waterStatus } from '../lib/date';
import {
  buildMonthGrid,
  addMonths,
  monthLabel,
  WEEKDAY_LABELS,
  buildCalendarEvents,
  EVENT_META,
  type CalendarEvent,
} from '../lib/calendar';
import { radius, spacing, useThemeColors, type ThemeColors } from '../theme';

interface Props {
  plants: Plant[];
}

export default function CalendarView({ plants }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const today = todayISO();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const eventsByDay = useMemo(() => {
    const start = grid[0].iso;
    const end = grid[grid.length - 1].iso;
    return buildCalendarEvents(plants, start, end);
  }, [plants, grid]);

  const goMonth = (delta: number) => {
    const next = addMonths(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    const todayInNextMonth = today.slice(0, 4) === String(next.year) && Number(today.slice(5, 7)) === next.month;
    setSelectedDate(todayInNextMonth ? today : `${next.year}-${String(next.month).padStart(2, '0')}-01`);
  };

  const dueColor = (dueIso: string): string => {
    const daysLeft = -daysSince(dueIso);
    const status = waterStatus(daysLeft);
    if (status === 'overdue') return colors.danger;
    if (status === 'today') return colors.amber;
    return colors.textDim;
  };

  const selectedEvents = eventsByDay.get(selectedDate) ?? [];
  const sortedSelectedEvents = [...selectedEvents].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.plantName.localeCompare(b.plantName);
  });

  if (plants.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>등록된 식물이 없어요.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.monthNav}>
        <Pressable style={styles.navBtn} onPress={() => goMonth(-1)} hitSlop={8}>
          <Text style={styles.navBtnText}>‹ 이전</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel(year, month)}</Text>
        <Pressable style={styles.navBtn} onPress={() => goMonth(1)} hitSlop={8}>
          <Text style={styles.navBtnText}>다음 ›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={styles.weekdayText}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((cell) => {
          const events = eventsByDay.get(cell.iso) ?? [];
          const types = [...new Set(events.map((e) => e.type))];
          const isToday = cell.iso === today;
          const isSelected = cell.iso === selectedDate;
          return (
            <Pressable
              key={cell.iso}
              style={[
                styles.cell,
                isSelected && styles.cellSelected,
                isToday && !isSelected && styles.cellToday,
              ]}
              onPress={() => setSelectedDate(cell.iso)}
            >
              <Text
                style={[
                  styles.cellDay,
                  !cell.inMonth && styles.cellDayOutside,
                  isSelected && styles.cellDaySelected,
                ]}
              >
                {cell.day}
              </Text>
              {types.length > 0 && (
                <Text style={styles.cellIcons} numberOfLines={1}>
                  {types.map((t) => EVENT_META[t].icon).join('')}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.agenda}>
        <Text style={styles.agendaTitle}>{formatDate(selectedDate)}</Text>
        {sortedSelectedEvents.length === 0 ? (
          <Text style={styles.agendaEmpty}>이 날짜에는 일정이 없어요.</Text>
        ) : (
          sortedSelectedEvents.map((e: CalendarEvent, i: number) => (
            <View key={`${e.plantId}-${e.type}-${e.done}-${i}`} style={styles.agendaRow}>
              <Text style={styles.agendaIcon}>{EVENT_META[e.type].icon}</Text>
              <Text style={styles.agendaPlant} numberOfLines={1}>
                {e.plantName}
              </Text>
              <Text
                style={[
                  styles.agendaStatus,
                  { color: e.done ? colors.greenDark : dueColor(selectedDate) },
                ]}
              >
                {e.done ? `${EVENT_META[e.type].label} 완료` : `${EVENT_META[e.type].label} 예정`}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.md },
    empty: { padding: spacing.xl, alignItems: 'center' },
    emptyText: { color: colors.textDim, fontSize: 14 },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { padding: spacing.xs },
    navBtnText: { color: colors.green, fontWeight: '600', fontSize: 14 },
    monthTitle: { fontSize: 17, fontWeight: '700', color: colors.textHeading },
    weekdayRow: { flexDirection: 'row' },
    weekdayText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      color: colors.textDim,
      fontWeight: '600',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      gap: 2,
    },
    cellSelected: { backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.green },
    cellToday: { borderWidth: 1, borderColor: colors.border },
    cellDay: { fontSize: 13, color: colors.text },
    cellDayOutside: { color: colors.textDim, opacity: 0.4 },
    cellDaySelected: { color: colors.greenDark, fontWeight: '700' },
    cellIcons: { fontSize: 10 },
    agenda: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    agendaTitle: { fontSize: 15, fontWeight: '700', color: colors.textHeading },
    agendaEmpty: { fontSize: 13, color: colors.textDim },
    agendaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    agendaIcon: { fontSize: 16 },
    agendaPlant: { flex: 1, fontSize: 14, color: colors.text },
    agendaStatus: { fontSize: 13, fontWeight: '600' },
  });
