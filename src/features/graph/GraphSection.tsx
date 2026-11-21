import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import Svg from 'react-native-svg';
import type { DueRange } from '@/shared/selectors';
import type { CalendarAdapter } from '@/shared/types';
import type { FeedActions } from '../feed/actions';
import { useScreenReader } from '../feed/hooks';
import { SECTION_ORDER, SECTION_TITLES, initialGraphSection, type FeedSections, type SectionKey } from '../feed/model';
import { usePalette } from '../feed/palette';
import { EmptyState, FilterChip, Icon, Tag, Txt } from '../feed/ui';
import { GraphDetails } from './GraphDetails';
import { GraphStage } from './GraphStage';
import type { GraphMemory } from './memory';
import { buildGraph } from './model';
import { LegendGlyph } from './shapes';

const DUE_RANGES: { value: DueRange; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: 'tomorrow', label: 'Tomorrow' }, { value: 'next-seven-days', label: 'Next 7 days' },
];

/** Course Galaxy: underline section tabs, one graph at a time, legend, details and an accessible node list. */
export function GraphSection({ sections, calendar, actions, now, memory, reducedMotion, onInteraction }: {
  sections: FeedSections; calendar: CalendarAdapter; actions: FeedActions; now: number; memory: GraphMemory;
  reducedMotion: boolean; onInteraction: (active: boolean) => void;
}) {
  const palette = usePalette();
  const focused = useIsFocused();
  const screenReader = useScreenReader();
  const window = useWindowDimensions();
  const [active, setActiveState] = useState<SectionKey>(() => memory.active() ?? initialGraphSection(sections));
  const [dueRange, setDueRangeState] = useState<DueRange>(() => memory.dueRange());
  const [selected, setSelectedState] = useState<string | null>(() => memory.get(memory.active() ?? initialGraphSection(sections)).selected);
  const [width, setWidth] = useState(0);
  const [browseOpen, setBrowseOpen] = useState(false);

  const setActive = (key: SectionKey) => {
    memory.setActive(key);
    setActiveState(key);
    setSelectedState(memory.get(key).selected);
  };
  const setSelected = (id: string | null) => {
    memory.save(active, { selected: id });
    setSelectedState(id);
  };
  const setDueRange = (range: DueRange) => {
    memory.setDueRange(range);
    setDueRangeState(range);
  };
  useEffect(() => { if (memory.active() === null) memory.setActive(active); }, [memory, active]);

  const model = useMemo(() => buildGraph(active, { state: actions.state, sections, items: calendar.items, now, dueRange }),
    [active, actions.state, sections, calendar.items, now, dueRange]);
  const selectedNode = model.nodes.find(node => node.id === selected) ?? null;

  // Compact stage: shorter than wide on phones so the details below peek into view.
  const height = Math.round(Math.max(190, Math.min(width * 0.68, window.height * 0.34)));

  return <View style={styles.wrap}>
    <UnderlineTabs active={active} sections={sections} onChange={setActive} />

    {active === 'dueSoon' && <View style={styles.filters}>
      {DUE_RANGES.map(range => <FilterChip key={range.value} label={range.label} selected={dueRange === range.value} onPress={() => setDueRange(range.value)}
        accessibilityLabel={`Show items due ${range.label.toLowerCase()}`} />)}
      {calendar.mode === 'sample' && <Tag label="Sample coursework" tone="warning" />}
    </View>}

    <View onLayout={(event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width))}>
      {model.nodes.length === 0
        ? <View style={[styles.emptyStage, { borderColor: palette.border, backgroundColor: palette.graphBg }]}>
          <EmptyState title={`Nothing in ${SECTION_TITLES[active]}`} body={active === 'dueSoon' ? 'No coursework due in this range. Try another filter.' : 'Try another section, or switch to List view.'} />
        </View>
        : width > 0 && <GraphStage key={active} model={model} memory={memory.get(active)} onSave={patch => memory.save(active, patch)}
          summary={`Course galaxy for ${SECTION_TITLES[active]}. ${model.summary} Use Browse nodes below to select an item.`}
          width={width} height={height} reducedMotion={reducedMotion} focused={focused}
          selected={selected} onSelect={setSelected} onInteraction={onInteraction} />}
    </View>

    {model.legend.length > 0 && model.nodes.length > 0 && <View style={styles.legend} accessibilityLabel="Legend" accessible>
      {model.legend.map(entry => <View key={entry.key} style={styles.legendItem}>
        <Svg width={20} height={20}><LegendGlyph entry={entry} palette={palette} /></Svg>
        <Txt variant="caption" tone="secondary">{entry.label}</Txt>
      </View>)}
    </View>}

    <GraphDetails node={selectedNode} sections={sections} items={calendar.items} actions={actions} now={now} sample={calendar.mode === 'sample'} />

    {model.nodes.length > 0 && <View>
      <Pressable accessibilityRole="button" aria-expanded={browseOpen || screenReader} onPress={() => setBrowseOpen(open => !open)} style={styles.browse}>
        <Icon name={browseOpen || screenReader ? 'chevron-down' : 'chevron-right'} size={16} color={palette.textSecondary} />
        <Txt variant="small" style={styles.bold}>{`Browse nodes (${model.nodes.length})`}</Txt>
      </Pressable>
      {(browseOpen || screenReader) && model.nodes.map(node => <Pressable key={node.id} accessibilityRole="button"
        aria-selected={node.id === selected} accessibilityLabel={node.a11y} accessibilityHint="Selects this node and shows its details"
        onPress={() => setSelected(node.id === selected ? null : node.id)}
        style={[styles.nodeRow, { borderColor: palette.border }, node.id === selected && { backgroundColor: palette.accentSoft }]}>
        <Txt variant="small" style={node.id === selected ? styles.bold : undefined}>{node.a11y}</Txt>
      </Pressable>)}
    </View>}
  </View>;
}

/** Horizontal text tabs with an underline; scrolls the active tab into view. Distinct from both switches. */
function UnderlineTabs({ active, sections, onChange }: { active: SectionKey; sections: FeedSections; onChange: (key: SectionKey) => void }) {
  const palette = usePalette();
  const scroll = useRef<ScrollViewInstance>(null);
  const offsets = useRef<Partial<Record<SectionKey, { x: number; width: number }>>>({});
  const [viewport, setViewport] = useState(0);
  useEffect(() => {
    const target = offsets.current[active];
    if (target && viewport) scroll.current?.scrollTo({ x: Math.max(0, target.x - (viewport - target.width) / 2), animated: true });
  }, [active, viewport]);
  return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} onLayout={event => setViewport(event.nativeEvent.layout.width)}
    accessibilityRole="tablist" style={[styles.tabs, { borderColor: palette.border }]} contentContainerStyle={styles.tabsContent}>
    {SECTION_ORDER.map(key => {
      const selected = key === active;
      const count = sections[key].length;
      return <Pressable key={key} accessibilityRole="tab" aria-selected={selected} accessibilityLabel={`${SECTION_TITLES[key]}, ${count}`}
        onLayout={event => { offsets.current[key] = { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width }; }}
        onPress={() => onChange(key)} style={styles.tab}>
        <Txt variant="small" style={{ color: selected ? palette.text : palette.textSecondary, fontWeight: selected ? '700' : '500' }}>
          {SECTION_TITLES[key]} <Txt variant="caption" tone="secondary">{String(count)}</Txt>
        </Txt>
        <View style={[styles.underline, { backgroundColor: selected ? palette.accent : 'transparent' }]} />
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  tabs: { borderBottomWidth: StyleSheet.hairlineWidth, flexGrow: 0 },
  tabsContent: { gap: 18, paddingRight: 8 },
  tab: { minHeight: 44, justifyContent: 'flex-end', paddingTop: 8 },
  underline: { height: 3, borderRadius: 2, marginTop: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  emptyStage: { height: 200, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  browse: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  nodeRow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  bold: { fontWeight: '700' },
});
