import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PEST_GUIDE, PEST_GUIDE_CATEGORY_LABEL, type PestGuideCategory } from '../lib/pestGuide';
import { radius, spacing, useThemeColors, type ThemeColors } from '../theme';

const CATEGORY_COLOR: Record<PestGuideCategory, 'danger' | 'amber' | 'green'> = {
  pest: 'danger',
  disease: 'amber',
  environmental: 'green',
};

export default function PestGuide() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PEST_GUIDE;
    return PEST_GUIDE.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        entry.symptoms.toLowerCase().includes(q),
    );
  }, [query]);

  const categoryBg: Record<'danger' | 'amber' | 'green', string> = {
    danger: colors.dangerBg,
    amber: colors.amberBg,
    green: colors.greenBg,
  };
  const categoryFg: Record<'danger' | 'amber' | 'green', string> = {
    danger: colors.danger,
    amber: colors.amber,
    green: colors.greenDark,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        AI 진단이 아닌, 흔한 증상을 미리 정리해둔 참고 자료예요. 증상을 검색하거나 목록에서 탭해 자세히 보세요.
      </Text>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="🔍 이름 또는 증상으로 검색 (예: 하얀 가루, 응애)"
        placeholderTextColor={colors.textDim}
      />

      {results.length === 0 ? (
        <Text style={styles.noResults}>"{query}"에 맞는 항목이 없어요.</Text>
      ) : (
        results.map((entry) => {
          const isOpen = expandedId === entry.id;
          const colorKey = CATEGORY_COLOR[entry.category];
          return (
            <Pressable
              key={entry.id}
              style={styles.card}
              onPress={() => setExpandedId(isOpen ? null : entry.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{entry.name}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: categoryBg[colorKey] }]}>
                  <Text style={[styles.categoryBadgeText, { color: categoryFg[colorKey] }]}>
                    {PEST_GUIDE_CATEGORY_LABEL[entry.category]}
                  </Text>
                </View>
              </View>
              <Text style={styles.symptoms} numberOfLines={isOpen ? undefined : 2}>
                {entry.symptoms}
              </Text>
              {isOpen && (
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>원인</Text>
                  <Text style={styles.detailText}>{entry.causes}</Text>
                  <Text style={styles.detailLabel}>치료 방법</Text>
                  <Text style={styles.detailText}>{entry.treatment}</Text>
                  <Text style={styles.detailLabel}>예방법</Text>
                  <Text style={styles.detailText}>{entry.prevention}</Text>
                </View>
              )}
              <Text style={styles.toggleHint}>{isOpen ? '접기 ▲' : '자세히 보기 ▼'}</Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.md },
    hint: { fontSize: 12.5, color: colors.textDim },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: colors.surface,
      color: colors.textHeading,
    },
    noResults: { textAlign: 'center', color: colors.textDim, marginTop: spacing.xl },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.xs,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardName: { fontSize: 15, fontWeight: '700', color: colors.textHeading },
    categoryBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    categoryBadgeText: { fontSize: 11.5, fontWeight: '600' },
    symptoms: { fontSize: 13, color: colors.text },
    detail: { gap: spacing.xs, marginTop: spacing.xs },
    detailLabel: { fontSize: 12, fontWeight: '700', color: colors.textDim, marginTop: spacing.xs },
    detailText: { fontSize: 13, color: colors.text },
    toggleHint: { fontSize: 11.5, color: colors.green, fontWeight: '600', marginTop: spacing.xs },
  });
