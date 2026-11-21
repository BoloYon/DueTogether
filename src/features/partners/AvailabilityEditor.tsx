
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { Body, Button, Choices, ErrorBanner, Row, Screen, Title, dayKeyOf, formatMinuteOfDay, upcomingDayKeys, useNow } from '@/components/campus';
import { usePalette } from '@/components/campus/palette';
import { monthGrid, parseDayKey, shiftMonth } from '@/features/calendar/model';
import { IconButton } from '@/features/feed/ui';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import { availabilityError, coursesForAvailability, myWindows } from './logic';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDate = (date: string) => parseDayKey(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export function AvailabilityEditor() {
  const router = useRouter();
  const { state, dispatch } = useCampus();
  const params = useLocalSearchParams<{ course?: string; date?: string; start?: string; end?: string }>();
  const now = useNow(1_000);
  const courses = coursesForAvailability(state);
  const initialCourse = courses.find(course => course === params.course) ?? courses[0] ?? '';
  const [course, setCourse] = useState(initialCourse);
  const [original] = useState(() => myWindows(state, initialCourse).find(window => window.date === params.date
    && String(window.startMinute) === params.start && String(window.endMinute) === params.end));
  const [date, setDate] = useState(() => original?.date ?? upcomingDayKeys(now, 2)[1]);
  const [month, setMonth] = useState(() => {
    const selected = parseDayKey(date);
    return { year: selected.getFullYear(), month: selected.getMonth() };
  });
  const [start, setStart] = useState(original?.startMinute ?? 16 * 60);
  const [end, setEnd] = useState(original?.endMinute ?? 18 * 60);
  const [active, setActive] = useState<'start' | 'end'>('start');
  const [failure, setFailure] = useState<string | null>(null);
  const palette = usePalette();
  const heading = original ? 'Edit availability' : 'Add availability';
  const window = { date, startMinute: start, endMinute: end };
  const validation = availabilityError(window, now);
  const today = dayKeyOf(now);
  const displayed = new Date(month.year, month.month, 1);
  const disablePrevious = displayed <= new Date(today.slice(0, 7) + '-01T00:00:00');

  const save = () => {
    const error = availabilityError(window, Date.now());
    if (error) { setFailure(error); return; }
    const result = dispatch({ type: 'availability/upsert', course, window, previous: original });
    if (!result.ok) { setFailure(result.message); return; }
    router.dismissTo(routes.partnerFind);
  };

  return <Screen title="Availability">
    <Title>{heading}</Title>
    <View style={[styles.surface, { backgroundColor: palette.backgroundElement, borderColor: palette.border }]}>
      <Row style={styles.month}>
        <IconButton icon="chevron-left" label="Previous month" disabled={disablePrevious}
          onPress={() => setMonth(shiftMonth(month.year, month.month, -1))} />
        <Body bold>{displayed.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Body>
        <IconButton icon="chevron-right" label="Next month" onPress={() => setMonth(shiftMonth(month.year, month.month, 1))} />
      </Row>
      <View style={styles.week}>{weekdays.map(day => <Text key={day}
        style={[styles.weekday, { color: palette.textSecondary }]}>{day}</Text>)}</View>
      {monthGrid(month.year, month.month).map(week => <View key={week[0].key} style={styles.week}>
        {week.map(cell => {
          const selected = date === cell.key;
          const disabled = cell.key < today;
          if (!cell.inMonth) return <View key={cell.key} style={styles.cell} />;
          return <Pressable key={cell.key} style={styles.cell} disabled={disabled} accessibilityRole="button"
            accessibilityLabel={fullDate(cell.key)} accessibilityState={{ disabled, selected }}
            onPress={() => { setDate(cell.key); setFailure(null); }}>
            <View style={[styles.bubble, selected && { backgroundColor: palette.accent }]}>
              <Text style={{ color: selected ? palette.onAccent : palette.text, opacity: disabled ? 0.4 : 1 }}>{cell.day}</Text>
            </View>
          </Pressable>;
        })}
      </View>)}
      <View style={[styles.selectedDate, { borderBottomColor: palette.border }]}>
        <Body bold>{fullDate(date)}</Body>
      </View>
    </View>
    <View style={[styles.surface, { backgroundColor: palette.backgroundElement, borderColor: palette.border }]}>
      <Row>{(['start', 'end'] as const).map(field => {
        const selected = active === field;
        const label = field === 'start' ? 'Starts' : 'Ends';
        const time = formatMinuteOfDay(field === 'start' ? start : end);
        return <Pressable key={field} accessibilityRole="button" accessibilityState={{ selected }}
          accessibilityLabel={label + ', ' + time} onPress={() => setActive(field)}
          style={[styles.timeTab, { backgroundColor: selected ? palette.accentSoft : palette.background, borderColor: selected ? palette.accent : palette.border }]}>
          <Body small secondary>{label}</Body><Body bold>{time}</Body>
        </Pressable>;
      })}</Row>
      <TimeWheel key={active} value={active === 'start' ? start : end} onChange={minute => {
        setFailure(null);
        if (active === 'start') setStart(minute);
        else setEnd(minute === 0 ? 1440 : minute);
      }} />
    </View>
    {!original && courses.length > 1 && <Choices label="Course" value={course} onChange={setCourse}
      options={courses.map(item => ({ value: item, label: item }))} />}
    <ErrorBanner message={failure ?? validation ?? (!course ? 'Choose a course before saving.' : null)} />
    <Button label={original ? 'Save time window' : 'Add time window'} disabled={!course || !!validation} onPress={save} />
  </Screen>;
}

const hours = Array.from({ length: 12 }, (_, index) => String(index || 12));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const periods = ['AM', 'PM'];
const wheelRow = 44;

function TimeWheel({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const palette = usePalette();
  const hour = Math.floor(value / 60) % 12;
  const minute = value % 60;
  const period = Math.floor(value / 720) % 2;
  return <View style={styles.wheel}>
    <View pointerEvents="none" style={[styles.wheelHighlight, { borderColor: palette.border, backgroundColor: palette.accentSoft }]} />
    <WheelColumn label="Hour" values={hours} index={hour} onChange={part => onChange((period * 12 + part) * 60 + minute)} />
    <WheelColumn label="Minute" values={minutes} index={minute} onChange={part => onChange((period * 12 + hour) * 60 + part)} />
    <WheelColumn label="AM or PM" values={periods} index={period} onChange={part => onChange((part * 12 + hour) * 60 + minute)} />
  </View>;
}

function WheelColumn({ label, values, index, onChange }: { label: string; values: string[]; index: number; onChange: (index: number) => void }) {
  const palette = usePalette();
  const scroll = useRef<ScrollViewInstance>(null);
  const initial = useRef(index);
  const positioned = useRef(false);
  const choose = (next: number) => {
    onChange(next);
    scroll.current?.scrollTo({ y: next * wheelRow, animated: false });
  };
  const commitOffset = (offset: number) => onChange(Math.max(0, Math.min(values.length - 1, Math.round(offset / wheelRow))));
  return <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: values[index] }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={event => {
      const next = index + (event.nativeEvent.actionName === 'increment' ? 1 : -1);
      choose(Math.max(0, Math.min(values.length - 1, next)));
    }} style={styles.column}>
    <ScrollView ref={scroll} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.wheelContent}
      onContentSizeChange={() => {
        if (positioned.current) return;
        positioned.current = true;
        scroll.current?.scrollTo({ y: initial.current * wheelRow, animated: false });
      }}
      snapToInterval={wheelRow} decelerationRate="fast" overScrollMode="never"
      onScrollEndDrag={event => commitOffset(event.nativeEvent.contentOffset.y)}
      onMomentumScrollEnd={event => commitOffset(event.nativeEvent.contentOffset.y)}>
      {values.map((item, position) => <Pressable key={item} onPress={() => choose(position)} style={styles.wheelCell}>
        <Text style={{ color: position === index ? palette.text : palette.textSecondary, fontWeight: position === index ? '700' : '400' }}>{item}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  surface: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 8, gap: 4 },
  month: { justifyContent: 'space-between' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  cell: { flex: 1, height: 43, alignItems: 'center', justifyContent: 'center' },
  bubble: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  selectedDate: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  timeTab: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  wheel: { flexDirection: 'row', height: wheelRow * 3, marginTop: 6 },
  wheelHighlight: { position: 'absolute', left: 0, right: 0, top: wheelRow, height: wheelRow, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  column: { flex: 1 },
  wheelContent: { paddingVertical: wheelRow },
  wheelCell: { height: wheelRow, alignItems: 'center', justifyContent: 'center' },
});
