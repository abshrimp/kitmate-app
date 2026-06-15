import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import type { WidgetPayload } from './payload';

type Palette = Record<'bg' | 'text' | 'sub' | 'primary' | 'accent' | 'divider', ColorProp>;

const LIGHT: Palette = {
  bg: '#FFFFFF',
  text: '#1A1D21',
  sub: '#697079',
  primary: '#286883',
  accent: '#BB8F51',
  divider: '#E4E7EC',
};
const DARK: Palette = {
  bg: '#181B1F',
  text: '#ECEEF1',
  sub: '#969CA5',
  primary: '#5FA8C2',
  accent: '#D6AC72',
  divider: '#2C3137',
};

const MAX_CLASSES = 5;

/** Android ホーム画面ウィジェットの描画ツリー (JSX ではなく FlexWidget で表現)。 */
export function KitmateWidget({
  payload,
  dark = false,
}: {
  payload: WidgetPayload | null;
  dark?: boolean;
}) {
  const c = dark ? DARK : LIGHT;
  const classes = payload?.classes ?? [];
  const shown = classes.slice(0, MAX_CLASSES);
  const overflow = classes.length - shown.length;

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
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          justifyContent: 'space-between',
        }}
      >
        <TextWidget text="KITmate" style={{ fontSize: 12, fontWeight: 'bold', color: c.primary }} />
        <TextWidget text={payload?.dateLabel ?? ''} style={{ fontSize: 12, color: c.sub }} />
      </FlexWidget>

      {payload === null ? (
        <TextWidget
          text="アプリを開いて更新"
          style={{ fontSize: 13, color: c.sub, marginTop: 8 }}
        />
      ) : payload.isWeekend || shown.length === 0 ? (
        <TextWidget
          text={payload.isWeekend ? '今日は授業がありません' : '今日の授業はありません'}
          style={{ fontSize: 13, color: c.sub, marginTop: 8 }}
        />
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 6 }}>
          {shown.map((cls, i) => (
            <FlexWidget
              key={`${cls.period}-${i}`}
              style={{ flexDirection: 'row', width: 'match_parent', marginTop: 3 }}
            >
              <TextWidget
                text={`${cls.period}`}
                style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: c.bg,
                  width: 20,
                  height: 18,
                  textAlign: 'center',
                  backgroundColor: (cls.color as ColorProp | null) ?? c.primary,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              />
              <FlexWidget style={{ flex: 1, marginRight: 6 }}>
                <TextWidget
                  text={cls.name}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 13, color: c.text }}
                />
              </FlexWidget>
              <TextWidget text={cls.room} style={{ fontSize: 12, color: c.sub }} />
            </FlexWidget>
          ))}
          {overflow > 0 && (
            <TextWidget
              text={`ほか ${overflow} 件`}
              style={{ fontSize: 11, color: c.sub, marginTop: 2 }}
            />
          )}
        </FlexWidget>
      )}

      {payload?.assignment != null && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            marginTop: 8,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: c.divider,
          }}
        >
          <TextWidget text="📚" style={{ fontSize: 12, marginRight: 6 }} />
          <FlexWidget style={{ flex: 1, marginRight: 6 }}>
            <TextWidget
              text={payload.assignment.title}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 12, color: c.text }}
            />
          </FlexWidget>
          <TextWidget
            text={payload.assignment.dueLabel}
            style={{ fontSize: 12, fontWeight: 'bold', color: c.accent }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
