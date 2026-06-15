import type { ReactNode } from 'react';
import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import type { WidgetPayload } from './payload';
import { PERIOD_TIMES } from '@/lib/terms';
import type { Period } from '@/types';

type Palette = Record<'bg' | 'text' | 'sub' | 'primary' | 'accent' | 'muted' | 'divider', ColorProp>;

const LIGHT: Palette = {
  bg: '#FFFFFF',
  text: '#1A1D21',
  sub: '#697079',
  primary: '#286883',
  accent: '#BB8F51',
  muted: '#EEF0F3',
  divider: '#E4E7EC',
};
const DARK: Palette = {
  bg: '#181B1F',
  text: '#ECEEF1',
  sub: '#969CA5',
  primary: '#5FA8C2',
  accent: '#D6AC72',
  muted: '#22262B',
  divider: '#2C3137',
};

const PERIODS: Period[] = [1, 2, 3, 4, 5];

function Frame({ c, children }: { c: Palette; children: ReactNode }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        padding: 12,
        backgroundColor: c.bg,
        borderRadius: 16,
      }}
    >
      {children}
    </FlexWidget>
  );
}

function Header({ c, title, right }: { c: Palette; title: string; right: string }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
      <TextWidget text={title} style={{ fontSize: 12, fontWeight: 'bold', color: c.primary }} />
      <TextWidget text={right} style={{ fontSize: 12, color: c.sub }} />
    </FlexWidget>
  );
}

// ===== 時間割ウィジェット (1〜5限を縦に分割) =====

export function TimetableWidget({
  payload,
  dark = false,
}: {
  payload: WidgetPayload | null;
  dark?: boolean;
}) {
  const c = dark ? DARK : LIGHT;
  const byPeriod = new Map<number, WidgetPayload['classes'][number]>();
  for (const cls of payload?.classes ?? []) {
    if (!byPeriod.has(cls.period)) byPeriod.set(cls.period, cls);
  }

  return (
    <Frame c={c}>
      <Header c={c} title="KITmate" right={payload?.dateLabel ?? ''} />
      {payload === null ? (
        <TextWidget text="アプリを開いて更新" style={{ fontSize: 13, color: c.sub, marginTop: 8 }} />
      ) : payload.isWeekend ? (
        <TextWidget text="今日は授業がありません" style={{ fontSize: 13, color: c.sub, marginTop: 8 }} />
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 4 }}>
          {PERIODS.map((p) => {
            const cls = byPeriod.get(p);
            const time = PERIOD_TIMES[p];
            return (
              <FlexWidget
                key={p}
                style={{
                  flexDirection: 'row',
                  width: 'match_parent',
                  marginTop: 4,
                  paddingBottom: 4,
                  borderBottomWidth: p === 5 ? 0 : 1,
                  borderBottomColor: c.divider,
                }}
              >
                <TextWidget
                  text={`${p}`}
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: cls !== undefined ? c.bg : c.sub,
                    width: 18,
                    height: 18,
                    textAlign: 'center',
                    backgroundColor: cls !== undefined ? ((cls.color as ColorProp | null) ?? c.primary) : c.muted,
                    borderRadius: 5,
                    marginRight: 8,
                  }}
                />
                <TextWidget
                  text={time.start}
                  style={{ fontSize: 11, color: c.sub, width: 40, marginRight: 4 }}
                />
                <FlexWidget style={{ flex: 1, marginRight: 6 }}>
                  <TextWidget
                    text={cls?.name ?? '—'}
                    maxLines={1}
                    truncate="END"
                    style={{ fontSize: 13, color: cls !== undefined ? c.text : c.sub }}
                  />
                </FlexWidget>
                {cls?.room != null && cls.room !== '' && (
                  <TextWidget text={cls.room} style={{ fontSize: 11, color: c.sub }} />
                )}
              </FlexWidget>
            );
          })}
        </FlexWidget>
      )}
    </Frame>
  );
}

// ===== 課題ウィジェット (共通: 複数件をリスト表示) =====

const MAX_ASSIGNMENTS = 4;

function AssignmentList({
  c,
  payload,
  mode,
}: {
  c: Palette;
  payload: WidgetPayload | null;
  mode: 'due' | 'remaining';
}) {
  if (payload === null) {
    return <TextWidget text="アプリを開いて更新" style={{ fontSize: 13, color: c.sub, marginTop: 8 }} />;
  }
  const items = payload.assignments.slice(0, MAX_ASSIGNMENTS);
  if (items.length === 0) {
    return <TextWidget text="課題はありません" style={{ fontSize: 13, color: c.sub, marginTop: 8 }} />;
  }
  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 4 }}>
      {items.map((a, i) => (
        <FlexWidget
          key={`${a.dueAt}-${i}`}
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            marginTop: 4,
            paddingBottom: 4,
            borderBottomWidth: i === items.length - 1 ? 0 : 1,
            borderBottomColor: c.divider,
          }}
        >
          <FlexWidget style={{ flex: 1, marginRight: 6 }}>
            <TextWidget
              text={a.title}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 13, fontWeight: 'bold', color: c.text }}
            />
            <TextWidget
              text={a.course}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 10, color: c.sub }}
            />
          </FlexWidget>
          <TextWidget
            text={mode === 'due' ? a.dueLabel : a.remainingLabel}
            style={{ fontSize: 12, fontWeight: 'bold', color: c.accent }}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

/** 課題ウィジェット: 締切日時を表示 */
export function AssignmentDueWidget({
  payload,
  dark = false,
}: {
  payload: WidgetPayload | null;
  dark?: boolean;
}) {
  const c = dark ? DARK : LIGHT;
  return (
    <Frame c={c}>
      <Header c={c} title="課題の締切" right={payload?.dateLabel ?? ''} />
      <AssignmentList c={c} payload={payload} mode="due" />
    </Frame>
  );
}

/** 課題ウィジェット: 残り時間を表示 (書き出し時点。リアルタイム更新は iOS のみ) */
export function AssignmentRemainingWidget({
  payload,
  dark = false,
}: {
  payload: WidgetPayload | null;
  dark?: boolean;
}) {
  const c = dark ? DARK : LIGHT;
  return (
    <Frame c={c}>
      <Header c={c} title="課題まで" right={payload?.dateLabel ?? ''} />
      <AssignmentList c={c} payload={payload} mode="remaining" />
    </Frame>
  );
}
