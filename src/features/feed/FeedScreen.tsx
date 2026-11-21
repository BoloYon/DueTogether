import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useCalendar } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import type { Clock } from '@/shared/types';
import { GraphSection } from '../graph/GraphSection';
import { createGraphMemory } from '../graph/memory';
import { useFeedActions } from './actions';
import { FeedList, type ExpandedOverrides } from './FeedList';
import { useFocusedNow, useReducedMotion } from './hooks';
import { feedSections } from './model';
import { usePalette } from './palette';
import { SocialPreview } from './SocialPreview';
import { CompactToggle, FilledSwitch, IconButton, Txt } from './ui';

type Area = 'social' | 'work';
type WorkView = 'list' | 'graph';

/** Work / Social Feed. Route export for `/`. `clock` is an optional test/harness seam. */
export function FeedScreen({ clock }: { clock?: Clock } = {}) {
  const palette = usePalette();
  const calendar = useCalendar();
  const now = useFocusedNow(clock);
  const actions = useFeedActions(now);
  const reducedMotion = useReducedMotion();
  const [area, setArea] = useState<Area>('work');
  const [view, setView] = useState<WorkView>('list');
  const [overrides, setOverrides] = useState<ExpandedOverrides>({});
  const [graphBusy, setGraphBusy] = useState(false);
  const [memory] = useState(createGraphMemory);

  // List and Graph read the very same section arrays.
  const sections = feedSections(actions.state, calendar.items, now);

  return <ScrollView scrollEnabled={!graphBusy} style={{ backgroundColor: palette.page }} contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled">
    <View style={styles.top}>
      <View style={styles.flex}>
        <FilledSwitch label="Feed area" value={area} onChange={setArea} options={[{ value: 'social', label: 'Social' }, { value: 'work', label: 'Work' }]} />
      </View>
      <IconButton icon="plus" label="Create" onPress={() => router.push(routes.create())} />
    </View>

    {area === 'social' ? <SocialPreview /> : <>
      <View style={styles.subhead}>
        <Txt variant="caption" tone="secondary" style={styles.flex}>Fictional campus demo · {calendar.mode === 'sample' ? 'sample coursework' : 'your Canvas coursework'}</Txt>
        <CompactToggle label="Feed view" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'graph', label: 'Graph' }]} />
      </View>
      {view === 'list'
        ? <FeedList sections={sections} actions={actions} now={now} calendar={calendar} reducedMotion={reducedMotion}
          overrides={overrides} onToggle={(key, expanded) => setOverrides(current => ({ ...current, [key]: expanded }))} />
        : <GraphSection sections={sections} calendar={calendar} actions={actions} now={now} memory={memory}
          reducedMotion={reducedMotion} onInteraction={setGraphBusy} />}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  subhead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
