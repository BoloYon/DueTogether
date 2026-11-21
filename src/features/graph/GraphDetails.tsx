import { ManagePostMenu } from '@/components/campus/ManagePostMenu';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { findThreadByPerson } from '@/shared/selectors';
import { routes } from '@/shared/navigation';
import type { CanvasItem } from '@/shared/types';
import { openInCanvas, studyForThis } from '../calendar/CanvasItemRow';
import { canStudy, courseLabel, displayTitle, kindLabel, safeCanvasUrl, timeLabel, urgencyLabel } from '../calendar/model';
import type { FeedActions } from '../feed/actions';
import {
  attendanceLabel, courseOrTopic, personById, personName, postStatus, sessionPlace, startsLabel, timeLeftLabel, type FeedSections,
} from '../feed/model';
import { ProjectAction, SessionActions } from '../feed/rows';
import { Button, Card, Tag, Txt } from '../feed/ui';
import type { GraphNode } from './model';

/** Selected-node details below the graph. All Join / Open in Canvas / Message / Connect / Ask to join actions live here. */
export function GraphDetails({ node, sections, items, actions, now, sample }: {
  node: GraphNode | null; sections: FeedSections; items: CanvasItem[]; actions: FeedActions; now: number; sample: boolean;
}) {
  const { state } = actions;
  if (!node) {
    return <Card><Txt variant="small" tone="secondary">Tap a node, or choose one from Browse nodes, to see details and actions here.</Txt></Card>;
  }
  const error = actions.errors[node.entityId];
  let content;
  switch (node.shape) {
    case 'diamond': {
      const session = state.sessions.find(item => item.id === node.entityId);
      if (!session) return null;
      content = <>
        <View style={styles.tags}>{node.live ? <Tag label="LIVE" tone="live" icon="live" /> : <Tag label="Upcoming" tone="accent" />}<Tag label={courseOrTopic(session)} /></View>
        <Txt variant="heading">{session.title}</Txt>
        <Txt variant="small" tone="secondary">{node.live ? timeLeftLabel(session, now) : startsLabel(session, now)} · {sessionPlace(session)}</Txt>
        <Txt variant="small" tone="secondary">Host {personName(state, session.hostId)} · {attendanceLabel(session)}</Txt>
        <View style={styles.actions}>
          <SessionActions session={session} actions={actions} now={now} />
          <Button compact label="Open session" onPress={() => router.push(routes.session(session.id))} />
        </View>
      </>;
      break;
    }
    case 'canvas': {
      const item = items.find(entry => entry.id === node.entityId);
      if (!item) return null;
      const { title, lockdown } = displayTitle(item);
      content = <>
        <View style={styles.tags}>
          <Tag label={kindLabel(item.kind)} tone="accent" /><Tag label={urgencyLabel(item, now)} tone="warning" />
          {lockdown && <Tag label="LockDown" tone="warning" icon="lock" />}{sample && <Tag label="Sample" />}
        </View>
        <Txt variant="heading">{title}</Txt>
        <Txt variant="small" tone="secondary">{courseLabel(item)} · {timeLabel(item)}</Txt>
        <View style={styles.actions}>
          {canStudy(item) && <Button compact tone="primary" label="Study for this" accessibilityLabel={`Study for ${title}`} onPress={() => studyForThis(item)} />}
          {safeCanvasUrl(item) && <Button compact icon="external" label="Open in Canvas" onPress={() => openInCanvas(item)} />}
          <Button compact tone="plain" label="See in Calendar" onPress={() => router.push(routes.calendar)} />
        </View>
      </>;
      break;
    }
    case 'capsule': {
      const post = sections.partnersWanted.find(item => item.id === node.entityId);
      if (!post) return null;
      const status = postStatus(state, post);
      const author = personName(state, post.authorId);
      content = <>
        <View style={styles.tags}><Tag label={courseOrTopic(post)} tone="accent" />{status.kind === 'new' && <Tag label="New to you" />}</View>
        <Txt variant="heading">{post.title}</Txt>
        <Txt variant="small" tone="secondary">{post.description}</Txt>
        <Txt variant="small" tone="secondary">Posted by {author}</Txt>
        <View style={styles.actions}>
          {status.kind !== 'own' && <Button compact tone="primary" label={status.kind === 'linked' ? 'Message' : 'Connect'}
            accessibilityLabel={status.kind === 'linked' ? `Message ${author}` : `Connect with ${author}`} onPress={() => actions.connect(post)} />}
          {status.kind === 'own' && <Button compact label="View post" onPress={() => router.push(routes.post(post.id))} />}
          {status.kind === 'own' && <ManagePostMenu kind="request" id={post.id} />}
          <Button compact label="View author" onPress={() => router.push(status.kind === 'own' ? routes.profile : routes.person(post.authorId))} />
        </View>
      </>;
      break;
    }
    case 'hexagon': {
      const project = sections.newProjects.find(item => item.id === node.entityId);
      if (!project) return null;
      content = <>
        <View style={styles.tags}><Tag label={courseOrTopic(project)} tone="accent" /></View>
        <Txt variant="heading">{project.title}</Txt>
        <Txt variant="small" tone="secondary">{project.pitch}</Txt>
        <Txt variant="small" tone="secondary">Owner {personName(state, project.ownerId)} · Team {project.teamIds.length}/{project.capacity}{project.openRoles.length ? ` · Needs ${project.openRoles.join(', ')}` : ''}</Txt>
        <View style={styles.actions}>
          <ProjectAction project={project} actions={actions} />
          <Button compact label="Open project" onPress={() => router.push(routes.project(project.id))} />
        </View>
      </>;
      break;
    }
    case 'moon': {
      if (node.isYou) { content = <><Txt variant="heading">You</Txt><Txt variant="small" tone="secondary">Solid lines show people you already have a conversation with.</Txt></>; break; }
      const person = personById(state, node.entityId);
      const thread = findThreadByPerson(state, node.entityId);
      // A new-to-you author can be reached through their newest partner post (Connect carries the post ID).
      const post = !thread ? sections.partnersWanted.find(item => item.authorId === node.entityId) : undefined;
      content = <>
        <View style={styles.tags}>{thread ? <Tag label="In your conversations" tone="success" /> : <Tag label="New to you" />}</View>
        <Txt variant="heading">{person?.name ?? 'Unknown student'}</Txt>
        {person?.courses.length ? <Txt variant="small" tone="secondary">{person.courses.join(' · ')}</Txt> : null}
        <View style={styles.actions}>
          {thread && <Button compact tone="primary" label="Message" accessibilityLabel={`Message ${person?.name ?? 'this person'}`} onPress={() => actions.message(thread.id)} />}
          {post && <Button compact tone="primary" label="Connect" accessibilityLabel={`Connect with ${person?.name ?? 'this person'} about ${post.title}`} onPress={() => actions.connect(post)} />}
          <Button compact label="View profile" onPress={() => router.push(routes.person(node.entityId))} />
        </View>
      </>;
      break;
    }
    case 'planet':
      content = <>
        <Txt variant="heading">{node.entityId}</Txt>
        {node.label ? <Txt variant="small" tone="secondary">{node.label}</Txt> : null}
        <Txt variant="small" tone="secondary">Items linked to this course are highlighted.</Txt>
      </>;
      break;
  }
  return <Card>
    {content}
    {error ? <Txt variant="small" tone="live">{error}</Txt> : null}
  </Card>;
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
});
