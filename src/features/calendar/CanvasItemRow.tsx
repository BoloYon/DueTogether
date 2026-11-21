import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';
import { routes } from '@/shared/navigation';
import type { CanvasItem } from '@/shared/types';
import { hueFor } from '../feed/hues';
import { usePalette } from '../feed/palette';
import { Button, Icon, Tag, Txt, type IconName } from '../feed/ui';
import { canStudy, courseLabel, displayTitle, kindLabel, relativeDayLabel, safeCanvasUrl, studyDraftParams, timeLabel, itemDayKey } from './model';

export const KIND_ICON: Record<CanvasItem['kind'], IconName> = { homework: 'homework', quiz: 'quiz', exam: 'exam', event: 'event' };

export function openInCanvas(item: CanvasItem) {
  const url = safeCanvasUrl(item);
  if (url) WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

/** Navigates to /create with the agreed draft params. Shared by Calendar rows and graph details. */
export function studyForThis(item: CanvasItem) {
  router.push(routes.create(studyDraftParams(item)));
}

/** Calendar/Feed row: title, class, date/time, type, optional LockDown tag, and Canvas actions. */
export function CanvasItemRow({ item, now, showDay = false, compact = false, sample }: { item: CanvasItem; now: number; showDay?: boolean; compact?: boolean; sample: boolean }) {
  const palette = usePalette();
  const { title, lockdown } = displayTitle(item);
  const url = safeCanvasUrl(item);
  const key = itemDayKey(item);
  const when = `${showDay && key ? `${relativeDayLabel(key, now)} · ` : ''}${timeLabel(item)}`;
  const hue = hueFor(item.courseCode ?? item.courseName);
  return <View style={[styles.row, { borderColor: palette.border }]}>
    <View accessible accessibilityLabel={`${kindLabel(item.kind)}: ${title}. ${courseLabel(item)}. ${when}.${lockdown ? ' Requires LockDown Browser.' : ''}${sample ? ' Sample item.' : ''}`} style={styles.main}>
      <View style={[styles.icon, { backgroundColor: palette.backgroundElement, borderColor: hue }]}><Icon name={KIND_ICON[item.kind]} size={18} color={hue} /></View>
      <View style={styles.text}>
        <Txt variant="body" style={styles.title} numberOfLines={2}>{title}</Txt>
        <Txt variant="small" tone="secondary" numberOfLines={1}>{courseLabel(item)}</Txt>
        <View style={styles.meta}>
          <Txt variant="small" tone="secondary">{when}</Txt>
          <Tag label={kindLabel(item.kind)} tone={item.kind === 'exam' || item.kind === 'quiz' ? 'accent' : 'neutral'} />
          {lockdown && <Tag label="LockDown" tone="warning" icon="lock" />}
        </View>
      </View>
    </View>
    {!compact && (url || canStudy(item)) && <View style={styles.actions}>
      {canStudy(item) && <Button compact tone="primary" label="Study for this" accessibilityLabel={`Study for ${title}`} accessibilityHint="Opens a prefilled study session draft" onPress={() => studyForThis(item)} />}
      {url && <Button compact tone="secondary" icon="external" label="Open in Canvas" accessibilityLabel={`Open ${title} in Canvas`} onPress={() => openInCanvas(item)} />}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  main: { flexDirection: 'row', gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 48 },
});
