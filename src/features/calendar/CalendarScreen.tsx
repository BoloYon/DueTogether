import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useCalendar } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import type { CalendarAdapter, Clock, DayKey } from '@/shared/types';
import { useFocusedNow, useReducedMotion } from '../feed/hooks';
import { Reveal } from '../feed/Reveal';
import { hueFor } from '../feed/hues';
import { usePalette } from '../feed/palette';
import { Banner, Button, CompactToggle, EmptyState, FilterChip, IconButton, Txt } from '../feed/ui';
import { CanvasItemRow } from './CanvasItemRow';
import { MONTHS, WEEKDAYS, WEEKDAYS_SHORT, dayKey, groupCalendar, itemsByDay, lastSyncedLabel, monthGrid, parseDayKey, relativeDayLabel, shiftMonth } from './model';
import { errorCopy, isBusy } from './status';

type CalendarView = 'list' | 'month';
const VIEW_KEY = 'duetogether.calendar.view';
/** In-memory copy so tab switches keep the choice even before storage resolves. */
let rememberedView: CalendarView | null = null;

function useRememberedView(): [CalendarView, (view: CalendarView) => void] {
  const [view, setView] = useState<CalendarView>(rememberedView ?? 'list');
  useEffect(() => {
    if (rememberedView) return;
    AsyncStorage.getItem(VIEW_KEY).then(stored => {
      if (stored === 'list' || stored === 'month') { rememberedView = stored; setView(stored); }
    }).catch(() => undefined);
  }, []);
  return [view, next => {
    rememberedView = next;
    setView(next);
    AsyncStorage.setItem(VIEW_KEY, next).catch(() => undefined);
  }];
}

/** Mode, sync and error status shared by the Calendar tab and its settings. */
export function CalendarStatus({ calendar, now, compact }: { calendar: CalendarAdapter; now: number; compact?: boolean }) {
  const settings = <Button compact tone="secondary" label={calendar.mode === 'sample' ? 'Connect' : 'Settings'} accessibilityLabel="Open calendar settings" onPress={() => router.push(routes.calendarSettings)} />;
  return <View style={styles.status}>
    {calendar.mode === 'sample'
      ? <Banner tone="warning" title="Sample calendar · fictional coursework" body="This is demo data, not your Canvas account." action={compact ? undefined : settings} />
      : <Banner tone="accent" title={`Canvas · ${calendar.account?.name ?? 'Connected'}`}
        body={calendar.status === 'syncing' ? 'Syncing…' : lastSyncedLabel(calendar.lastSyncedAt, now)}
        action={compact ? undefined : <Button compact tone="secondary" icon="refresh" label="Sync now" busy={calendar.status === 'syncing'} onPress={() => { calendar.sync(); }} />} />}
    {calendar.status === 'connecting' && <Banner title="Connecting to Canvas…" body="Loading your account and coursework before switching." />}
    {calendar.error && <ErrorBanner calendar={calendar} />}
  </View>;
}

function ErrorBanner({ calendar }: { calendar: CalendarAdapter }) {
  const copy = errorCopy(calendar.error!);
  const action = copy.action === 'retry'
    ? <Button compact tone="danger" label="Retry" busy={isBusy(calendar)} onPress={() => { calendar.sync(); }} />
    : copy.action === 'settings' ? <Button compact tone="danger" label="Settings" accessibilityLabel="Open calendar settings" onPress={() => router.push(routes.calendarSettings)} /> : undefined;
  return <Banner tone="live" title={copy.title} body={copy.body} action={action} />;
}

export function CalendarScreen({ clock }: { clock?: Clock } = {}) {
  const calendar = useCalendar();
  const palette = usePalette();
  const now = useFocusedNow(clock, 60_000);
  const [view, setViewRaw] = useRememberedView();
  const [viewChanged, setViewChanged] = useState(false);
  const setView = (next: 'list' | 'month') => { setViewChanged(true); setViewRaw(next); };
  const reducedMotion = useReducedMotion();
  const [examsOnly, setExamsOnly] = useState(false);
  const [listRange, setListRange] = useState<'upcoming' | 'past'>('upcoming');
  const today = dayKey(new Date(now));
  const [selected, setSelected] = useState<DayKey>(today);
  const [month, setMonth] = useState(() => { const date = new Date(now); return { year: date.getFullYear(), month: date.getMonth() }; });
  const [refreshing, setRefreshing] = useState(false);
  const sample = calendar.mode === 'sample';

  const groups = useMemo(() => groupCalendar(calendar.items, now, examsOnly), [calendar.items, now, examsOnly]);
  const byDay = useMemo(() => itemsByDay(calendar.items, examsOnly), [calendar.items, examsOnly]);

  // Pull-to-refresh is live-only; view and range navigation never sync.
  const refresh = async () => {
    setRefreshing(true);
    try { await calendar.sync(); } finally { setRefreshing(false); }
  };

  const selectDay = (key: DayKey) => {
    setSelected(key);
    const date = parseDayKey(key);
    if (date.getMonth() !== month.month || date.getFullYear() !== month.year) setMonth({ year: date.getFullYear(), month: date.getMonth() });
  };
  const goToday = () => selectDay(today);

  const noItems = calendar.items.length === 0;

  return <ScrollView style={{ backgroundColor: palette.page }} contentContainerStyle={styles.content}
    refreshControl={calendar.mode === 'live' ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.accent} /> : undefined}>
    <View style={styles.headerRow}>
      <Txt variant="small" tone="secondary" style={styles.flex}>Only you can see your coursework here.</Txt>
      <IconButton icon="gear" label="Calendar settings" onPress={() => router.push(routes.calendarSettings)} />
    </View>
    <CalendarStatus calendar={calendar} now={now} />

    <View style={styles.controls}>
      <CompactToggle label="Calendar view" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'month', label: 'Month' }]} />
      <FilterChip label="Exams & quizzes" selected={examsOnly} onPress={() => setExamsOnly(value => !value)} accessibilityLabel="Show only exams and quizzes" />
    </View>

    {noItems ? <EmptyState
      title={calendar.mode === 'live' ? 'No coursework in this window' : 'No coursework to show'}
      body={calendar.mode === 'live'
        ? 'Canvas returned nothing dated between 120 days ago and 180 days ahead. Pull down or tap Sync now to check again.'
        : 'Connect your own Canvas account in Settings, or load the labeled sample calendar for a no-network demo.'}
      action={calendar.mode === 'live' ? undefined : <View style={styles.row}>
        <Button tone="primary" label="Connect Canvas" onPress={() => router.push(routes.calendarSettings)} />
        <Button label="Use sample calendar" onPress={calendar.enterSampleMode} />
      </View>} />
      : view === 'list'
        ? <Reveal key="list" reducedMotion={reducedMotion} animate={viewChanged} style={styles.section}>
          <CompactToggle label="Time range" value={listRange} onChange={setListRange} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
          {groups[listRange].length === 0
            ? <EmptyState title={listRange === 'upcoming' ? 'Nothing upcoming' : 'Nothing in the past window'}
              body={examsOnly ? 'No exams or quizzes here. Turn off the Exams & quizzes filter to see everything.' : listRange === 'upcoming' ? 'You’re all caught up for the synced window.' : 'Past items appear once their deadline or event end has passed.'} />
            : groups[listRange].map(group => <View key={group.key}>
              <Txt variant="small" tone="secondary" style={styles.dayHeader}>{dayHeading(group.key, now)}</Txt>
              {group.items.map(item => <CanvasItemRow key={item.id} item={item} now={now} sample={sample} />)}
            </View>)}
        </Reveal>
        : <Reveal key="month" reducedMotion={reducedMotion} animate={viewChanged} style={styles.section}>
          <MonthGrid year={month.year} month={month.month} selected={selected} today={today} byDay={byDay}
            onSelect={selectDay} onShift={delta => setMonth(current => shiftMonth(current.year, current.month, delta))} onToday={goToday} />
          <Txt variant="heading" style={styles.dayHeader}>{dayHeading(selected, now)}</Txt>
          {(byDay.get(selected) ?? []).length === 0
            ? <EmptyState title="Nothing on this day" body={examsOnly ? 'No exams or quizzes. Turn off the filter to see all coursework.' : 'Pick a day with a marker to see its coursework.'} />
            : byDay.get(selected)!.map(item => <CanvasItemRow key={item.id} item={item} now={now} sample={sample} />)}
        </Reveal>}
  </ScrollView>;
}

function dayHeading(key: DayKey, now: number) {
  const date = parseDayKey(key);
  const relative = relativeDayLabel(key, now);
  const full = `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return relative === 'Today' || relative === 'Tomorrow' || relative === 'Yesterday' ? `${relative} · ${full}` : full;
}

function MonthGrid({ year, month, selected, today, byDay, onSelect, onShift, onToday }: {
  year: number; month: number; selected: DayKey; today: DayKey; byDay: Map<DayKey, import('@/shared/types').CanvasItem[]>;
  onSelect: (key: DayKey) => void; onShift: (delta: number) => void; onToday: () => void;
}) {
  const palette = usePalette();
  const weeks = monthGrid(year, month);
  return <View style={styles.month}>
    <View style={styles.monthHeader}>
      <IconButton icon="chevron-left" label="Previous month" onPress={() => onShift(-1)} />
      <Txt variant="heading" style={styles.monthTitle} >{`${MONTHS[month]} ${year}`}</Txt>
      <IconButton icon="chevron-right" label="Next month" onPress={() => onShift(1)} />
      <Button compact tone="secondary" label="Today" accessibilityLabel="Go to today" onPress={onToday} />
    </View>
    <View style={styles.week} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {WEEKDAYS_SHORT.map(day => <Txt key={day} variant="caption" tone="secondary" style={styles.weekday}>{day}</Txt>)}
    </View>
    {weeks.map(week => <View key={week[0].key} style={styles.week}>
      {week.map(cell => {
        const items = byDay.get(cell.key) ?? [];
        const isSelected = cell.key === selected;
        const isToday = cell.key === today;
        const date = parseDayKey(cell.key);
        return <Pressable key={cell.key} onPress={() => onSelect(cell.key)} accessibilityRole="button"
          aria-selected={isSelected}
          accessibilityLabel={`${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${cell.day}${isToday ? ', today' : ''}, ${items.length ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : 'no items'}`}
          style={[styles.cell, isSelected && { borderColor: palette.accent, borderWidth: 2 }]}>
          <View style={[styles.dayBubble, isToday && { backgroundColor: palette.accent }]}>
            <Txt variant="small" style={{ color: isToday ? palette.accentText : cell.inMonth ? palette.text : palette.textSecondary, fontWeight: isToday || isSelected ? '700' : '500', opacity: cell.inMonth ? 1 : 0.6 }}>{String(cell.day)}</Txt>
          </View>
          <View style={styles.markers}>
            {items.slice(0, 3).map(item => <View key={item.id} style={[styles.marker, { backgroundColor: hueFor(item.courseCode ?? item.courseName) }, (item.kind === 'exam' || item.kind === 'quiz') && styles.markerStrong]} />)}
          </View>
        </Pressable>;
      })}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  status: { gap: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  section: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  dayHeader: { marginTop: 10, fontWeight: '700' },
  month: { gap: 2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  monthTitle: { flex: 1, textAlign: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: 4 },
  cell: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: 'transparent', gap: 2 },
  dayBubble: { minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  markers: { flexDirection: 'row', gap: 2, height: 6 },
  marker: { width: 5, height: 5, borderRadius: 3 },
  markerStrong: { width: 6, height: 6 },
});
