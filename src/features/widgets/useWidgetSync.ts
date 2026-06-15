import { useEffect } from 'react';
import { Platform } from 'react-native';

import { buildTodayClasses, dateLabel, type WidgetPayload } from './payload';
import { useWidgetData } from './store';
import { persistWidgetPayload } from './sync';
import { loadCourseMap } from '@/features/timetable/useCourseMap';
import { currentAcademicYear } from '@/lib/terms';
import { useTimetable } from '@/features/timetable/store';

/**
 * ホーム画面ウィジェット用ペイロードをアプリ稼働中に算出・書き出す (ルートで一度呼ぶ)。
 * 今日のコマは時間割ストア + 講義名取得から、直近の課題は課題取得時に
 * {@link useWidgetData} へ書き込まれた値を使う。どちらかが変わるたびに共有ストレージへ反映。
 */
export function useWidgetSync(): void {
  const entries = useTimetable((s) => s.entries);
  const classes = useWidgetData((s) => s.classes);
  const assignment = useWidgetData((s) => s.assignment);
  const setClasses = useWidgetData((s) => s.setClasses);

  // 今日のコマを算出 (公式講義は年度一覧から名前を解決)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    void (async () => {
      const date = new Date();
      const year = currentAcademicYear(date);
      const ids = entries
        .filter((e) => e.year === year && e.courseId !== undefined)
        .map((e) => e.courseId as string);
      const courseMap = ids.length > 0 ? await loadCourseMap(year, ids) : {};
      if (cancelled) return;
      setClasses(buildTodayClasses(entries, courseMap, date));
    })();
    return () => {
      cancelled = true;
    };
  }, [entries, setClasses]);

  // classes が揃ったら (assignment は任意) 共有ストレージへ書き出す
  useEffect(() => {
    if (Platform.OS === 'web' || classes === null) return;
    const date = new Date();
    const payload: WidgetPayload = {
      updatedAt: date.getTime(),
      dateLabel: dateLabel(date),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      classes,
      assignment,
    };
    void persistWidgetPayload(payload);
  }, [classes, assignment]);
}
