import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SectionToggle } from '@/components/campus/SectionToggle';
import { routes } from '@/shared/navigation';
import type { CalendarAdapter } from '@/shared/types';
import { CanvasItemRow } from '../calendar/CanvasItemRow';
import type { FeedActions } from './actions';
import { SECTION_ORDER, SECTION_TITLES, type FeedSections, type SectionKey } from './model';
import { usePalette } from './palette';
import { Reveal } from './Reveal';
import { FeaturedLiveSession, PartnerPostRow, ProjectRow, SessionRow } from './rows';
import { Button, EmptyState, Tag, Txt } from './ui';


export type ExpandedOverrides = Partial<Record<SectionKey, boolean>>;

/** Populated sections start open; user toggles are independent overrides. */
export function isExpanded(overrides: ExpandedOverrides, key: SectionKey, count: number) {
  return overrides[key] ?? count > 0;
}

export function FeedList({ sections, actions, now, calendar, overrides, onToggle, reducedMotion }: {
  sections: FeedSections; actions: FeedActions; now: number; calendar: CalendarAdapter;
  overrides: ExpandedOverrides; onToggle: (key: SectionKey, expanded: boolean) => void; reducedMotion: boolean;
}) {
  const sample = calendar.mode === 'sample';
  const bodies: Record<SectionKey, ReactNode> = {
    happeningNow: sections.happeningNow.length
      ? <>
        <FeaturedLiveSession session={sections.happeningNow[0]} actions={actions} now={now} />
        {sections.happeningNow.slice(1).map(session => <SessionRow key={session.id} session={session} actions={actions} now={now} live />)}
      </>
      : <EmptyState title="No live sessions right now" body="Check Coming Up, or start one yourself from Create." action={<Button compact label="Create a session" onPress={() => router.push(routes.create({ kind: 'session' }))} />} />,
    dueSoon: sections.dueSoon.length
      ? <>{sections.dueSoon.map(item => <CanvasItemRow key={item.id} item={item} now={now} showDay sample={sample} />)}</>
      : <EmptyState title="Nothing due in the next 7 days"
        body={calendar.mode === 'live' ? 'Your synced Canvas coursework has no deadlines this week.' : 'Connect Canvas in Calendar settings to see your own deadlines.'} />,
    comingUp: sections.comingUp.length
      ? <>{sections.comingUp.map(session => <SessionRow key={session.id} session={session} actions={actions} now={now} live={false} />)}</>
      : <EmptyState title="No upcoming sessions" body="Create a session and classmates will see it here." />,
    partnersWanted: sections.partnersWanted.length
      ? <>{sections.partnersWanted.map(post => <PartnerPostRow key={post.id} post={post} actions={actions} now={now} />)}</>
      : <EmptyState title="No partner posts yet" body="Post what you’re looking for from Create." />,
    newProjects: sections.newProjects.length
      ? <>{sections.newProjects.map(project => <ProjectRow key={project.id} project={project} actions={actions} now={now} />)}</>
      : <EmptyState title="No projects yet" body="Pitch a project from Create to find teammates." />,
  };

  return <View style={styles.list}>
    {SECTION_ORDER.map(key => {
      const count = sections[key].length;
      const expanded = isExpanded(overrides, key, count);
      return <View key={key} style={styles.section}>
        <View style={styles.headerRow}>
          <SectionHeader title={SECTION_TITLES[key]} count={count} expanded={expanded} onPress={() => onToggle(key, !expanded)}
            badge={key === 'dueSoon' && sample ? <Tag label="Sample" tone="warning" /> : key === 'happeningNow' && count ? <Tag label="LIVE" tone="live" icon="live" /> : undefined} />
          {key === 'dueSoon' && <Button compact tone="plain" label="See all" accessibilityLabel="See all coursework in Calendar" onPress={() => router.push(routes.calendar)} />}
        </View>
        {expanded && <Reveal reducedMotion={reducedMotion} animate={overrides[key] !== undefined} style={styles.body}>{bodies[key]}</Reveal>}
      </View>;
    })}
  </View>;
}

function SectionHeader({ title, count, expanded, onPress, badge }: { title: string; count: number; expanded: boolean; onPress: () => void; badge?: ReactNode }) {
  const palette = usePalette();
  return <SectionToggle label={`${title}, ${count} ${count === 1 ? 'item' : 'items'}`} expanded={expanded}
    onPress={onPress} style={styles.header} color={palette.textSecondary}>
    <Txt variant="heading">{title}</Txt>
    <View style={[styles.count, { backgroundColor: palette.backgroundElement }]}><Txt variant="caption" tone="secondary" style={styles.countText}>{String(count)}</Txt></View>
    {badge ? <View style={styles.badge}>{badge}</View> : null}
  </SectionToggle>;
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  section: { gap: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { alignSelf: 'center' },
  header: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  count: { minWidth: 24, paddingHorizontal: 6, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  countText: { fontWeight: '700' },
  body: { paddingLeft: 4, paddingBottom: 8 },
});
