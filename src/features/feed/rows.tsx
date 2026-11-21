import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { routes } from '@/shared/navigation';
import type { PartnerPost, Project, StudySession } from '@/shared/types';
import type { FeedActions } from './actions';
import {
  PROJECT_STATUS_LABEL, ageLabel, attendanceLabel, courseOrTopic, personName, postStatus, projectStatus, sessionPlace, sessionStatus, startsLabel, timeLeftLabel,
} from './model';
import { usePalette } from './palette';
import { Button, Card, Icon, Tag, Txt } from './ui';

function ErrorText({ message }: { message?: string }) {
  return message ? <Txt variant="small" tone="live" style={styles.error}>{message}</Txt> : null;
}

export function SessionActions({ session, actions, now }: { session: StudySession; actions: FeedActions; now: number }) {
  const status = sessionStatus(actions.state, session, now);
  if (status.hosting) return <Tag label="Hosting" tone="accent" />;
  if (status.ended) return <Tag label="Ended" />;
  if (!status.joined && status.full) return <Tag label="Full" tone="warning" />;
  return <Button compact tone={status.joined ? 'secondary' : 'primary'} label={status.joined ? 'Leave' : 'Join'}
    accessibilityLabel={`${status.joined ? 'Leave' : 'Join'} ${session.title}`} onPress={() => actions.toggleJoin(session)} />;
}

export function FeaturedLiveSession({ session, actions, now }: { session: StudySession; actions: FeedActions; now: number }) {
  const palette = usePalette();
  return <Card style={{ borderColor: palette.live, borderWidth: 1.5 }}>
    <Pressable accessibilityRole="button" accessibilityHint="Opens the session"
      accessibilityLabel={`Live now, featured: ${session.title}, ${courseOrTopic(session)}. ${timeLeftLabel(session, now)}. ${sessionPlace(session)}. ${attendanceLabel(session)}.`}
      onPress={() => router.push(routes.session(session.id))} style={styles.featuredMain}>
      <View style={styles.liveRow}>
        <View style={[styles.liveBadge, { backgroundColor: palette.live }]}><Icon name="live" size={8} color={palette.onDanger} /><Txt variant="caption" style={[styles.liveText, { color: palette.onDanger }]}>LIVE</Txt></View>
        <Txt variant="small" tone="live" style={styles.bold}>{timeLeftLabel(session, now)}</Txt>
      </View>
      <Txt variant="heading">{session.title}</Txt>
      <Txt variant="small" tone="secondary">{courseOrTopic(session)} · hosted by {personName(actions.state, session.hostId)}</Txt>
      <Meta icon={session.format === 'online' ? 'globe' : 'pin'} text={sessionPlace(session)} />
      <Meta icon="people" text={attendanceLabel(session)} />
    </Pressable>
    <View style={styles.actionsRow}><SessionActions session={session} actions={actions} now={now} /></View>
    <ErrorText message={actions.errors[session.id]} />
  </Card>;
}

export function SessionRow({ session, actions, now, live }: { session: StudySession; actions: FeedActions; now: number; live: boolean }) {
  const palette = usePalette();
  const when = live ? timeLeftLabel(session, now) : startsLabel(session, now);
  return <View style={[styles.row, { borderColor: palette.border }]}>
    <View style={styles.rowTop}>
      <Pressable style={styles.rowMain} accessibilityRole="button" accessibilityHint="Opens the session"
        accessibilityLabel={`${live ? 'Live' : 'Upcoming'}: ${session.title}, ${courseOrTopic(session)}. ${when}. ${sessionPlace(session)}. ${attendanceLabel(session)}.`}
        onPress={() => router.push(routes.session(session.id))}>
        <View style={styles.liveRow}>
          {live && <Tag label="LIVE" tone="live" icon="live" />}
          <Txt variant="small" tone={live ? 'live' : 'accent'} style={styles.bold}>{when}</Txt>
        </View>
        <Txt variant="body" style={styles.bold} numberOfLines={2}>{session.title}</Txt>
        <Txt variant="small" tone="secondary" numberOfLines={1}>{courseOrTopic(session)} · {sessionPlace(session)} · {attendanceLabel(session)}</Txt>
      </Pressable>
      <SessionActions session={session} actions={actions} now={now} />
    </View>
    <ErrorText message={actions.errors[session.id]} />
  </View>;
}

export function PartnerPostRow({ post, actions, now }: { post: PartnerPost; actions: FeedActions; now: number }) {
  const palette = usePalette();
  const status = postStatus(actions.state, post);
  const author = personName(actions.state, post.authorId);
  return <View style={[styles.row, { borderColor: palette.border }]}>
    <View style={styles.liveRow}>
      <Tag label={courseOrTopic(post)} tone="accent" />
      <Txt variant="caption" tone="secondary">{ageLabel(post.createdAt, now)}</Txt>
      {status.kind === 'new' && <Tag label="New to you" />}
    </View>
    <Txt variant="body" style={styles.bold}>{post.title}</Txt>
    <Txt variant="small" tone="secondary">{post.description}</Txt>
    <View style={styles.rowTop}>
      <Pressable accessibilityRole="link" accessibilityLabel={`Author ${author}. Opens profile.`} onPress={() => router.push(routes.person(post.authorId))} style={styles.author} hitSlop={8}>
        <Txt variant="small" tone="accent" style={styles.bold}>{author}</Txt>
      </Pressable>
      {status.kind !== 'own' && <Button compact tone={status.kind === 'linked' ? 'secondary' : 'primary'}
        label={status.kind === 'linked' ? 'Message' : 'Connect'}
        accessibilityLabel={status.kind === 'linked' ? `Message ${author}` : `Connect with ${author} about ${post.title}`}
        onPress={() => actions.connect(post)} />}
    </View>
    <ErrorText message={actions.errors[post.id]} />
  </View>;
}

export function ProjectRow({ project, actions, now }: { project: Project; actions: FeedActions; now: number }) {
  const palette = usePalette();
  const status = projectStatus(actions.state, project);
  return <View style={[styles.row, { borderColor: palette.border }]}>
    <Pressable accessibilityRole="button" accessibilityHint="Opens the project"
      accessibilityLabel={`Project ${project.title}. ${project.pitch.replace(/[.!?]$/, '')}. Owner ${personName(actions.state, project.ownerId)}. ${project.teamIds.length} of ${project.capacity} places filled. ${PROJECT_STATUS_LABEL[status]}.`}
      onPress={() => router.push(routes.project(project.id))} style={styles.rowMain}>
      <View style={styles.liveRow}>
        <Tag label={courseOrTopic(project)} tone="accent" />
        <Txt variant="caption" tone="secondary">{ageLabel(project.createdAt, now)}</Txt>
      </View>
      <Txt variant="body" style={styles.bold}>{project.title}</Txt>
      <Txt variant="small" tone="secondary">{project.pitch}</Txt>
      <Txt variant="small" tone="secondary">Owner {personName(actions.state, project.ownerId)} · Team {project.teamIds.length}/{project.capacity}</Txt>
      {project.openRoles.length > 0 && <View style={styles.tags}>{project.openRoles.map(role => <Tag key={role} label={role} />)}</View>}
    </Pressable>
    <View style={styles.actionsRow}><ProjectAction project={project} actions={actions} /></View>
    <ErrorText message={actions.errors[project.id]} />
  </View>;
}

export function ProjectAction({ project, actions }: { project: Project; actions: FeedActions }) {
  const status = projectStatus(actions.state, project);
  if (status === 'open') return <Button compact tone="primary" label="Ask to join" accessibilityLabel={`Ask to join ${project.title}`} onPress={() => actions.toggleRequest(project)} />;
  if (status === 'requested') return <View style={styles.liveRow}>
    <Tag label="Requested" tone="warning" />
    <Button compact tone="plain" label="Cancel request" accessibilityLabel={`Cancel request to join ${project.title}`} onPress={() => actions.toggleRequest(project)} />
  </View>;
  return <Tag label={PROJECT_STATUS_LABEL[status]} tone={status === 'full' ? 'neutral' : 'success'} />;
}

function Meta({ icon, text }: { icon: 'pin' | 'globe' | 'people' | 'clock'; text: string }) {
  const palette = usePalette();
  return <View style={styles.meta}><Icon name={icon} size={14} color={palette.textSecondary} /><Txt variant="small" tone="secondary">{text}</Txt></View>;
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowMain: { flex: 1, gap: 3 },
  featuredMain: { gap: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveText: { fontWeight: '800', letterSpacing: 0.5 },
  bold: { fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  author: { flex: 1, minHeight: 36, justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  error: { marginTop: 2 },
});
