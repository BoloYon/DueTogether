
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, EmptyState, ErrorBanner, Row, Screen, Section, Title, useNow } from '@/components/campus';
import { usePalette } from '@/components/campus/palette';
import { Icon } from '@/features/feed/ui';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import { coursesForAvailability, studyMatchWindows, studyMatches } from './logic';
import { MatchCard, windowLabel } from './parts';

export function PartnerFindScreen() {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const now = useNow();
  const palette = usePalette();
  const courses = coursesForAvailability(state);
  const { courses: courseParam } = useLocalSearchParams<{ courses?: string }>();
  const selection = typeof courseParam === 'string' ? courseParam.split(',') : [];
  const [failure, setFailure] = useState<string | null>(null);
  const selected = courses.filter(course => selection.includes(course));
  const windows = studyMatchWindows(state, courses, now);
  const canSeeMatches = windows.some(({ course }) => selected.includes(course));
  const addRoute = selected.length === 1 ? routes.addAvailability(selected[0]) : routes.partnerAvailability;

  return <Screen title="Study match" footer={<Button label="See matches" disabled={!canSeeMatches}
    onPress={() => router.push(routes.studyMatches(selected))} />}>
    <Title>Find a Study Match</Title>
    <Section title="Courses">
      {courses.length === 0 && <Body secondary>No courses available.</Body>}
      <Row wrap>{courses.map(course => {
        const checked = selected.includes(course);
        return <Pressable key={course} accessibilityRole="checkbox" accessibilityState={{ checked }}
          onPress={() => router.setParams({ courses: (checked ? selected.filter(item => item !== course) : [...selected, course]).join(',') })}
          style={[styles.chip, { borderColor: checked ? palette.accent : palette.border, backgroundColor: checked ? palette.accentSoft : palette.backgroundElement }]}>
          <Text style={{ color: checked ? palette.accent : palette.text, fontWeight: '600' }}>{course}</Text>
        </Pressable>;
      })}</Row>
    </Section>
    <Section title="Your upcoming availability" count={windows.length}>
      <View style={[styles.group, { borderColor: palette.border, backgroundColor: palette.backgroundElement }]}>
        {windows.map(({ course, window }) => {
          const label = windowLabel(window, now);
          return <View key={`${course}-${window.date}-${window.startMinute}-${window.endMinute}`}
            style={[styles.line, { borderBottomColor: palette.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${course}, ${label}`}
              onPress={() => router.push(routes.editAvailability(course, window))} style={styles.edit}>
              <Body>{label}</Body>
              <Body small secondary>{course}</Body>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${course}, ${label}`}
              style={styles.remove} onPress={() => {
                const result = dispatch({ type: 'availability/remove', course, window });
                setFailure(result.ok ? null : result.message);
              }}>
              <Icon name="minus" color={palette.danger} />
            </Pressable>
          </View>;
        })}
        <Pressable accessibilityRole="button" disabled={courses.length === 0}
          onPress={() => router.push(addRoute)} style={styles.add}>
          <Icon name="plus" color={palette.accent} />
          <Text style={{ color: palette.accent, fontWeight: '600' }}>Add availability</Text>
        </Pressable>
      </View>
      {windows.length === 0 && <Body secondary>No upcoming windows saved.</Body>}
      {!canSeeMatches && <Body secondary>Select a course with upcoming availability to see matches.</Body>}
      <ErrorBanner message={failure} />
    </Section>
  </Screen>;
}

export function StudyMatchesScreen() {
  const { state } = useCampus();
  const now = useNow();
  const { courses } = useLocalSearchParams<{ courses?: string }>();
  const requested = typeof courses === 'string' ? courses.split(',') : [];
  const selected = coursesForAvailability(state).filter(course => requested.includes(course));
  const matches = studyMatches(state, selected, now);

  return <Screen title="Study Matches">
    {selected.length > 0 && <Body secondary>{selected.join(' · ')}</Body>}
    {matches.length ? matches.map(match => <MatchCard
      key={`${match.course}-${match.personId}-${match.date}-${match.startMinute}-${match.endMinute}`} match={match} />)
      : <EmptyState title="No study matches" body="Go back to try another course or add a different time window." />}
  </Screen>;
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 22 },
  group: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  edit: { flex: 1, minHeight: 48, justifyContent: 'center', paddingVertical: 6, paddingLeft: 12 },
  remove: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  add: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
});
