import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Chip, EmptyState, Screen, Section, SegmentedControl } from '@/components/ui';
import {
  aggregateCredits,
  CATEGORY_GROUPS,
  computeRemaining,
  groupEarned,
  type CountedCategory,
  type ExcludedItem,
  type GroupKey,
} from '@/features/requirements/calc';
import { CreditRow, ProgressBar } from '@/features/requirements/components';
import { useRequirementsData } from '@/features/requirements/useRequirementsData';
import { useTimetable } from '@/features/timetable/store';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { programVariantKey, type ProgramSelection, type RequirementKind, type RequirementSet } from '@/types';

const GROUP_TITLE_KEY: Record<GroupKey, string> = {
  liberal: 'requirements.groupLiberal',
  basic: 'requirements.groupBasic',
  specialized: 'requirements.groupSpecialized',
};

const GROUP_TOTAL_LABEL_KEY: Record<GroupKey, string> = {
  liberal: 'requirements.totalLiberal',
  basic: 'requirements.totalBasic',
  specialized: 'requirements.totalSpecialized',
};

export default function RequirementsScreen() {
  const { t } = useI18n();
  const admissionYear = useSettings((s) => s.admissionYear);
  const programSelection = useSettings((s) => s.programSelection);

  if (admissionYear === null || programSelection === null) {
    return (
      <Screen title={t('requirements.title')}>
        <EmptyState
          icon="school-outline"
          title={t('requirements.setupTitle')}
          message={t('requirements.setupMessage')}
          action={
            <Button
              title={t('requirements.openSettings')}
              icon="settings-outline"
              onPress={() => router.push('/settings')}
            />
          }
        />
      </Screen>
    );
  }

  return <RequirementsBody admissionYear={admissionYear} programSelection={programSelection} />;
}

function RequirementsBody({
  admissionYear,
  programSelection,
}: {
  admissionYear: number;
  programSelection: ProgramSelection;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const entries = useTimetable((s) => s.entries);
  const [kind, setKind] = useState<RequirementKind>('graduation');

  const variantKey = useMemo(() => programVariantKey(programSelection), [programSelection]);

  const courseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.courseId !== undefined) ids.add(e.courseId);
    }
    return Array.from(ids).sort();
  }, [entries]);

  const data = useRequirementsData(admissionYear, variantKey, courseIds);

  const aggregation = useMemo(
    () => aggregateCredits(entries, data.coursesById, admissionYear, variantKey),
    [entries, data.coursesById, admissionYear, variantKey],
  );
  const groups = useMemo(() => groupEarned(aggregation.earned), [aggregation]);

  const requirement: RequirementSet | null =
    data.requirements === null
      ? null
      : kind === 'graduation'
        ? data.requirements.graduation
        : data.requirements.research_start;

  return (
    <Screen title={t('requirements.title')}>
      <SegmentedControl
        options={[
          { label: t('requirements.tabGraduation'), value: 'graduation' },
          { label: t('requirements.tabResearch'), value: 'research_start' },
        ]}
        value={kind}
        onChange={(value) => setKind(value as RequirementKind)}
      />

      {data.status === 'loading' && (
        <EmptyState icon="hourglass-outline" title={t('common.loading')} />
      )}

      {data.status === 'error' && (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('common.error')}
          message={t('requirements.loadError')}
          action={<Button title={t('common.retry')} icon="refresh-outline" onPress={data.reload} />}
        />
      )}

      {data.status === 'ready' && requirement !== null && (
        <>
          <SummaryCard
            kind={kind}
            remaining={computeRemaining(aggregation.earned, requirement)}
            grandEarned={groups.grand}
            grandRequired={requirement.groupTotals?.grandTotal}
          />

          {CATEGORY_GROUPS.map((group) => {
            const visible = group.categories.filter(
              (c) => requirement.minima[c] !== undefined || (aggregation.earned[c] ?? 0) > 0,
            );
            const groupTotalRequired =
              group.key === 'liberal'
                ? requirement.groupTotals?.liberalTotal
                : group.key === 'basic'
                  ? requirement.groupTotals?.basicTotal
                  : requirement.groupTotals?.specializedTotal;
            return (
              <Section key={group.key} title={t(GROUP_TITLE_KEY[group.key])}>
                <Card>
                  {visible.map((category) => (
                    <CategoryRow
                      key={category}
                      category={category}
                      earned={aggregation.earned[category] ?? 0}
                      required={requirement.minima[category]}
                    />
                  ))}
                  <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                    <CreditRow
                      label={t(GROUP_TOTAL_LABEL_KEY[group.key])}
                      earned={groups[group.key]}
                      required={groupTotalRequired}
                      emphasized
                    />
                  </View>
                </Card>
              </Section>
            );
          })}

          {aggregation.excluded.length > 0 && (
            <Section title={t('requirements.excludedTitle')}>
              <Card>
                {aggregation.excluded.map((item, index) => (
                  <ExcludedRow key={`${item.reason}-${item.key}`} item={item} first={index === 0} />
                ))}
              </Card>
            </Section>
          )}

          <View style={styles.disclaimer}>
            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              {t('requirements.disclaimer')}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

function SummaryCard({
  kind,
  remaining,
  grandEarned,
  grandRequired,
}: {
  kind: RequirementKind;
  remaining: number;
  grandEarned: number;
  grandRequired?: number;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const met = remaining <= 0;
  const headline = met
    ? t(kind === 'graduation' ? 'requirements.metGraduation' : 'requirements.metResearch')
    : t(kind === 'graduation' ? 'requirements.remainingGraduation' : 'requirements.remainingResearch', {
        n: remaining,
      });
  return (
    <Card style={styles.summaryCard}>
      <Text style={[styles.summaryHeadline, { color: met ? colors.success : colors.warning }]}>
        {headline}
      </Text>
      <View style={styles.summaryTotal}>
        <View style={styles.summaryTotalHeader}>
          <Text style={[styles.summaryTotalLabel, { color: colors.text }]}>
            {t('requirements.totalGrand')}
          </Text>
          <Text style={[styles.summaryTotalValue, { color: colors.text }]}>
            {grandRequired === undefined
              ? t('common.credits', { n: grandEarned })
              : t('requirements.progressValue', { earned: grandEarned, required: grandRequired })}
          </Text>
        </View>
        <ProgressBar earned={grandEarned} required={grandRequired} />
      </View>
    </Card>
  );
}

function CategoryRow({
  category,
  earned,
  required,
}: {
  category: CountedCategory;
  earned: number;
  required?: number;
}) {
  const { t } = useI18n();
  return <CreditRow label={t(`requirements.cat.${category}`)} earned={earned} required={required} />;
}

function ExcludedRow({ item, first }: { item: ExcludedItem; first: boolean }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const reasonLabel =
    item.reason === 'not_allowed'
      ? t('requirements.reasonNotAllowed')
      : item.reason === 'out_of_scope'
        ? t('requirements.reasonOutOfScope')
        : t('requirements.reasonUnknown');
  const reasonColor =
    item.reason === 'not_allowed'
      ? colors.danger
      : item.reason === 'out_of_scope'
        ? colors.textSecondary
        : colors.warning;
  const name =
    item.reason === 'unknown' ? t('requirements.unknownCourse', { id: item.key }) : item.name;
  return (
    <View style={[styles.excludedRow, !first && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.excludedMain}>
        <Text style={[styles.excludedName, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        {item.credits !== null && (
          <View style={styles.excludedMeta}>
            <Chip icon="ribbon-outline" label={t('common.credits', { n: item.credits })} />
          </View>
        )}
      </View>
      <Badge label={reasonLabel} color={reasonColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginTop: 16,
    gap: 14,
  },
  summaryHeadline: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryTotal: {
    gap: 6,
  },
  summaryTotalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    paddingTop: 4,
  },
  excludedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  excludedMain: {
    flex: 1,
    gap: 2,
  },
  excludedName: {
    fontSize: 14,
  },
  excludedMeta: {
    flexDirection: 'row',
  },
  disclaimer: {
    marginTop: 24,
    paddingHorizontal: 4,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
