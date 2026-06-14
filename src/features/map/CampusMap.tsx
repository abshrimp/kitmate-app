import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import {
  BUILDINGS,
  CAMPUS_BLOCKS,
  KIND_COLOR_KEY,
  MAP_HEIGHT,
  MAP_WIDTH,
  ROAD_H,
  ROAD_V,
  type Building,
  type BuildingKind,
} from './buildings';
import { Badge, SelectModal, type IoniconsName } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.4;
const TIMING = { duration: 300 };

function clampValue(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** scale に応じたパン可動域 (transform 原点 = ビュー中心) */
function panBound(size: number, scale: number): number {
  'worklet';
  if (size <= 0) return 0;
  return Math.max(0, (size * (scale - 1)) / 2) + size * 0.25 * scale;
}

const KIND_LABEL_KEY: Record<BuildingKind, string> = {
  lecture: 'map.kindLecture',
  research: 'map.kindResearch',
  welfare: 'map.kindWelfare',
  sports: 'map.kindSports',
};

const KIND_ORDER: BuildingKind[] = ['lecture', 'research', 'welfare', 'sports'];

function RoundButton({
  icon,
  label,
  onPress,
}: {
  icon: IoniconsName;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

export function CampusMap({ focusId }: { focusId?: string }) {
  const { colors, dark } = useTheme();
  const { t, locale } = useI18n();

  const [container, setContainer] = useState({ w: 0, h: 0 });
  // focusId 指定時は最初からその建物を選択状態にする (詳細カードを出す)
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null);
  const [listVisible, setListVisible] = useState(false);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  const cw = container.w;
  const ch = container.h;
  // viewBox は xMidYMid meet でレターボックスされる
  const k = cw > 0 && ch > 0 ? Math.min(cw / MAP_WIDTH, ch / MAP_HEIGHT) : 1;
  const offsetX = (cw - MAP_WIDTH * k) / 2;
  const offsetY = (ch - MAP_HEIGHT * k) / 2;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainer((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  }, []);

  /** ビュー座標 → マップ座標へ逆変換して建物をヒットテスト */
  const handleTap = (x: number, y: number) => {
    if (cw <= 0 || ch <= 0) return;
    const s = scale.get();
    const vx = (x - cw / 2 - tx.get()) / s + cw / 2;
    const vy = (y - ch / 2 - ty.get()) / s + ch / 2;
    const mx = (vx - offsetX) / k;
    const my = (vy - offsetY) / k;
    const hit = BUILDINGS.find(
      (b) => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h,
    );
    setSelectedId(hit ? hit.id : null);
  };

  const panGesture = Gesture.Pan()
    .maxPointers(2)
    .averageTouches(true)
    .minDistance(8)
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const bx = panBound(cw, scale.value);
      const by = panBound(ch, scale.value);
      tx.value = clampValue(startTx.value + e.translationX, -bx, bx);
      ty.value = clampValue(startTy.value + e.translationY, -by, by);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      const prev = scale.value;
      const next = clampValue(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      const ratio = prev > 0 ? next / prev : 1;
      const bx = panBound(cw, next);
      const by = panBound(ch, next);
      scale.value = next;
      tx.value = clampValue(tx.value * ratio, -bx, bx);
      ty.value = clampValue(ty.value * ratio, -by, by);
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(280)
    .onEnd((e, success) => {
      if (success) runOnJS(handleTap)(e.x, e.y);
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  /** scale / translate をクランプしてアニメーション適用 */
  const applyView = (nextScale: number, nextTx: number, nextTy: number) => {
    const bx = panBound(cw, nextScale);
    const by = panBound(ch, nextScale);
    scale.set(withTiming(nextScale, TIMING));
    tx.set(withTiming(clampValue(nextTx, -bx, bx), TIMING));
    ty.set(withTiming(clampValue(nextTy, -by, by), TIMING));
  };

  const zoomBy = (factor: number) => {
    const current = scale.get();
    const next = clampValue(current * factor, MIN_SCALE, MAX_SCALE);
    const ratio = current > 0 ? next / current : 1;
    applyView(next, tx.get() * ratio, ty.get() * ratio);
  };

  const resetView = () => {
    applyView(1, 0, 0);
  };

  /** 指定建物が画面中央に来るように移動 (必要なら 1.6 倍までズーム) */
  const centerOn = (b: Building) => {
    if (cw <= 0 || ch <= 0) return;
    const next = clampValue(Math.max(scale.get(), 1.6), MIN_SCALE, MAX_SCALE);
    const px = offsetX + (b.x + b.w / 2) * k;
    const py = offsetY + (b.y + b.h / 2) * k;
    applyView(next, next * (cw / 2 - px), next * (ch / 2 - py));
  };

  // 講義室などから遷移したとき: コンテナ測定後に一度だけ対象建物へセンタリング (選択は初期値で済)
  const focusedRef = useRef(false);
  useEffect(() => {
    if (focusedRef.current || focusId === undefined || cw <= 0 || ch <= 0) return;
    const b = BUILDINGS.find((x) => x.id === focusId);
    if (b === undefined) return;
    focusedRef.current = true;
    centerOn(b);
    // centerOn は毎レンダー再生成だが focusedRef で単発化しているため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, cw, ch]);

  const selected = useMemo(
    () => BUILDINGS.find((b) => b.id === selectedId) ?? null,
    [selectedId],
  );

  const otherLocale = locale === 'ja' ? 'en' : 'ja';

  const listOptions = useMemo(
    () =>
      BUILDINGS.map((b) => ({
        value: b.id,
        label: b.name[locale],
        subtitle: `${b.name[otherLocale]} — ${t(KIND_LABEL_KEY[b.kind])}`,
      })),
    [locale, otherLocale, t],
  );

  const onSelectFromList = (id: string) => {
    setListVisible(false);
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b) return;
    setSelectedId(id);
    centerOn(b);
  };

  const buildingFillOpacity = dark ? 0.32 : 0.2;

  return (
    <View style={styles.root}>
      <View style={styles.topArea}>
        <Text style={[styles.campus, { color: colors.text }]}>{t('map.campus')}</Text>
        <Text style={[styles.note, { color: colors.textSecondary }]}>{t('map.note')}</Text>
        <View style={styles.legendRow}>
          {KIND_ORDER.map((kind) => (
            <View key={kind} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors[KIND_COLOR_KEY[kind]] }]}
              />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                {t(KIND_LABEL_KEY[kind])}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={[styles.mapArea, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
        onLayout={onLayout}
      >
        <GestureDetector gesture={composedGesture}>
          <View style={styles.gestureSurface} collapsable={false}>
            <Animated.View style={[styles.canvas, animatedStyle]}>
              {cw > 0 && ch > 0 && (
                <Svg width={cw} height={ch} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
                  {/* 下地 */}
                  <Rect
                    x={0}
                    y={0}
                    width={MAP_WIDTH}
                    height={MAP_HEIGHT}
                    fill={colors.cardAlt}
                  />
                  {/* キャンパス敷地 (西構内 / 東構内) */}
                  {CAMPUS_BLOCKS.map((blk) => (
                    <Rect
                      key={`block-${blk.x}`}
                      x={blk.x}
                      y={blk.y}
                      width={blk.w}
                      height={blk.h}
                      rx={18}
                      fill={colors.card}
                      stroke={colors.border}
                      strokeWidth={2}
                    />
                  ))}
                  {/* 今出川通 (南側) */}
                  <Rect
                    x={ROAD_H.x}
                    y={ROAD_H.y}
                    width={ROAD_H.w}
                    height={ROAD_H.h}
                    fill={colors.border}
                  />
                  <Line
                    x1={ROAD_H.x}
                    y1={ROAD_H.y + ROAD_H.h / 2}
                    x2={ROAD_H.x + ROAD_H.w}
                    y2={ROAD_H.y + ROAD_H.h / 2}
                    stroke={colors.card}
                    strokeWidth={2}
                    strokeDasharray="16 12"
                  />
                  <SvgText
                    x={200}
                    y={ROAD_H.y + ROAD_H.h / 2 + 5}
                    fill={colors.textSecondary}
                    fontSize={15}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {t('map.roadImadegawa')}
                  </SvgText>
                  {/* 松ヶ崎通り (東西の間) */}
                  <Rect
                    x={ROAD_V.x}
                    y={ROAD_V.y}
                    width={ROAD_V.w}
                    height={ROAD_V.h}
                    fill={colors.border}
                  />
                  <Line
                    x1={ROAD_V.x + ROAD_V.w / 2}
                    y1={ROAD_V.y}
                    x2={ROAD_V.x + ROAD_V.w / 2}
                    y2={ROAD_V.y + ROAD_V.h}
                    stroke={colors.card}
                    strokeWidth={2}
                    strokeDasharray="16 12"
                  />
                  <SvgText
                    x={ROAD_V.x + ROAD_V.w / 2}
                    y={140}
                    fill={colors.textSecondary}
                    fontSize={15}
                    fontWeight="600"
                    textAnchor="middle"
                    transform={`rotate(90 ${ROAD_V.x + ROAD_V.w / 2} 140)`}
                  >
                    {t('map.roadMatsugasaki')}
                  </SvgText>
                  {/* 建物 */}
                  {BUILDINGS.map((b) => {
                    const kindColor = colors[KIND_COLOR_KEY[b.kind]];
                    const isSelected = b.id === selectedId;
                    const label = (b.short ?? b.name)[locale];
                    return (
                      <G key={b.id}>
                        <Rect
                          x={b.x}
                          y={b.y}
                          width={b.w}
                          height={b.h}
                          rx={10}
                          fill={kindColor}
                          fillOpacity={isSelected ? 0.95 : buildingFillOpacity}
                          stroke={isSelected ? colors.text : kindColor}
                          strokeWidth={isSelected ? 3 : 1.5}
                        />
                        <SvgText
                          x={b.x + b.w / 2}
                          y={b.y + b.h / 2 + 4.5}
                          fill={isSelected ? colors.onPrimary : colors.text}
                          fontSize={13}
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {label}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              )}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* 検索/一覧ボタン (右上) */}
        <View style={styles.listButtonWrap} pointerEvents="box-none">
          <RoundButton icon="search" label={t('map.openList')} onPress={() => setListVisible(true)} />
        </View>

        {/* ズームコントロール (右下フロート) */}
        <View style={styles.controls} pointerEvents="box-none">
          <RoundButton icon="add" label={t('map.zoomIn')} onPress={() => zoomBy(ZOOM_STEP)} />
          <RoundButton icon="remove" label={t('map.zoomOut')} onPress={() => zoomBy(1 / ZOOM_STEP)} />
          <RoundButton icon="refresh" label={t('map.reset')} onPress={resetView} />
        </View>

        {/* 選択建物カード (下部) */}
        {selected !== null && (
          <View
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {selected.name[locale]}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {selected.name[otherLocale]}
              </Text>
              <Badge
                label={t(KIND_LABEL_KEY[selected.kind])}
                color={colors[KIND_COLOR_KEY[selected.kind]]}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={8}
              onPress={() => setSelectedId(null)}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>

      <SelectModal
        visible={listVisible}
        title={t('map.buildingList')}
        options={listOptions}
        onSelect={onSelectFromList}
        onClose={() => setListVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topArea: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 3,
  },
  campus: {
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
  },
  mapArea: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gestureSurface: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  listButtonWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  controls: {
    position: 'absolute',
    right: 12,
    bottom: 124,
    gap: 10,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
