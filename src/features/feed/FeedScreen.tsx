import { TabPage } from '@/components/campus/TabPage';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCalendar } from '@/shared/adapters';
import type { Clock } from '@/shared/types';
import { GraphSection } from '../graph/GraphSection';
import { createGraphMemory } from '../graph/memory';
import { useFeedActions } from './actions';
import { FeedList, type ExpandedOverrides } from './FeedList';
import { useFocusedNow, useReducedMotion } from './hooks';
import { feedSections } from './model';
import { Reveal } from './Reveal';
import { SocialPreview } from './SocialPreview';
import { CompactToggle, FilledSwitch, Txt } from './ui';

type Area = 'social' | 'work';
type WorkView = 'list' | 'graph';

/** Work / Social Feed. Route export for `/`. `clock` is an optional test/harness seam. */
export function FeedScreen({ clock }: { clock?: Clock } = {}) {
  const calendar = useCalendar();
  const now = useFocusedNow(clock);
  const actions = useFeedActions(now);
  const reducedMotion = useReducedMotion();
  const [area, setArea] = useState<Area>('work');
  const [view, setView] = useState<WorkView>('list');
  const [viewChanged, setViewChanged] = useState(false);
  const [overrides, setOverrides] = useState<ExpandedOverrides>({});
  const [graphBusy, setGraphBusy] = useState(false);
  const [memory] = useState(createGraphMemory);

  // List and Graph read the very same section arrays.
  const sections = feedSections(actions.state, calendar.items, now);

  const changeArea = (next: Area) => { setGraphBusy(false); setArea(next); };
  const changeView = (next: WorkView) => { setGraphBusy(false); setViewChanged(true); setView(next); };

  return <TabPage title="Feed" titleTrailing={
    <Image source={require('./usf-bull-u.png')} contentFit="contain" style={styles.bullU}
      accessible accessibilityRole="image" accessibilityLabel="University of South Florida" />
  } scrollEnabled={!graphBusy} contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled">
    <FilledSwitch label="Feed area" value={area} onChange={changeArea} options={[{ value: 'social', label: 'Social' }, { value: 'work', label: 'Work' }]} />

    {area === 'social' ? <SocialPreview /> : <>
      <View style={styles.subhead}>
        <Txt variant="caption" tone="secondary" style={styles.flex}>Campus demo · {calendar.mode === 'sample' ? 'Sample coursework' : 'Your Canvas'}</Txt>
        <CompactToggle label="Feed view" value={view} onChange={changeView} options={[{ value: 'list', label: 'List', accessibilityLabel: 'List View' }, { value: 'graph', label: 'Graph', accessibilityLabel: 'Graph View' }]} />
      </View>
      <Reveal key={view} reducedMotion={reducedMotion} animate={viewChanged}>
      {view === 'list'
        ? <FeedList sections={sections} actions={actions} now={now} calendar={calendar} reducedMotion={reducedMotion}
          overrides={overrides} onToggle={(key, expanded) => setOverrides(current => ({ ...current, [key]: expanded }))} />
        : <GraphSection sections={sections} calendar={calendar} actions={actions} now={now} memory={memory}
          reducedMotion={reducedMotion} onInteraction={setGraphBusy} />}
      </Reveal>
    </>}
  </TabPage>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  bullU: { width: 44, aspectRatio: 165 / 218, borderRadius: 8 },
  flex: { flexGrow: 1, flexShrink: 1, flexBasis: 144 },
  subhead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
});
