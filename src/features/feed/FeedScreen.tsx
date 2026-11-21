import { ConnectionNotice } from '@/features/chat/ConnectionNotice';
import { TabPage } from '@/components/campus/TabPage';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCalendar } from '@/shared/adapters';
import type { Clock } from '@/shared/types';
import { GraphSection } from '../graph/GraphSection';
import { createGraphMemory } from '../graph/memory';
import { useFeedActions } from './actions';
import { FeedList, type ExpandedOverrides } from './FeedList';
import { useFocusedNow, useReducedMotion } from './hooks';
import { workFeedContent } from './model';
import { usePalette } from './palette';
import { PartnerPostRow, ProjectRow, SessionRow } from './rows';
import { Reveal } from './Reveal';
import { SocialPreview } from './SocialPreview';
import { CompactToggle, FilledSwitch, Txt } from './ui';

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
  const [viewChanged, setViewChanged] = useState(false);
  const [overrides, setOverrides] = useState<ExpandedOverrides>({});
  const [graphBusy, setGraphBusy] = useState(false);
  const [memory] = useState(createGraphMemory);

  const content = workFeedContent(actions.state, calendar.items, now);

  const changeArea = (next: Area) => { setGraphBusy(false); setArea(next); };
  const changeView = (next: WorkView) => { setGraphBusy(false); setViewChanged(true); setView(next); };

  return <TabPage title="Feed" scrollEnabled={!graphBusy} style={{ backgroundColor: palette.page }} contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled" footer={actions.connection.confirmation &&
      <ConnectionNotice confirmation={actions.connection.confirmation} onDismiss={actions.connection.dismiss} />}>
    <FilledSwitch label="Feed area" value={area} onChange={changeArea} options={[{ value: 'social', label: 'Social' }, { value: 'work', label: 'Work' }]} />

    {area === 'social' ? <SocialPreview /> : <>
      <View style={styles.subhead}>
        <Txt variant="caption" tone="secondary" style={styles.flex}>Fictional campus demo · {calendar.mode === 'sample' ? 'sample coursework' : 'your Canvas coursework'}</Txt>
        <CompactToggle label="Feed view" value={view} onChange={changeView} options={[{ value: 'list', label: 'List View' }, { value: 'graph', label: 'Graph View' }]} />
      </View>
      <Reveal key={view} reducedMotion={reducedMotion} animate={viewChanged}>
      {view === 'list'
        ? <>
          {content.ownPosts.length > 0 && <View style={styles.ownPosts}>
            <Txt variant="heading">Your posts</Txt>
            {content.ownPosts.map(item => {
              const key = item.kind + ':' + item.post.id;
              if (item.kind === 'session') return <SessionRow key={key} session={item.post} actions={actions} now={now} live={item.live} />;
              if (item.kind === 'project') return <ProjectRow key={key} project={item.post} actions={actions} now={now} />;
              return <PartnerPostRow key={key} post={item.post} actions={actions} now={now} />;
            })}
          </View>}
          <FeedList sections={content.list} actions={actions} now={now} calendar={calendar} reducedMotion={reducedMotion}
            overrides={overrides} onToggle={(key, expanded) => setOverrides(current => ({ ...current, [key]: expanded }))} />
        </>
        : <GraphSection sections={content.graph} calendar={calendar} actions={actions} now={now} memory={memory}
          reducedMotion={reducedMotion} onInteraction={setGraphBusy} />}
      </Reveal>
    </>}
  </TabPage>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  ownPosts: { gap: 4, paddingBottom: 8 },
  flex: { flex: 1 },
  subhead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
