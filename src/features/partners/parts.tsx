import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Avatar, Badge, Body, Button, Card, ErrorBanner, ListRow, Row, formatAgo, formatDayLabel, formatMinuteOfDay, formatClock, formatWhen, useNow,
} from '@/components/campus';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import type { AvailabilityMatch, PartnerPost, StudyInvite, User } from '@/shared/types';
import { connectState, inviteDraftFromMatch, inviteForMatch, isContact } from './logic';

/** Partner post with author and Connect, which opens or reuses the author's chat. */
export function PostCard({ post, showAuthor = true }: { post: PartnerPost; showAuthor?: boolean }) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const now = useNow(60_000);
  const [error, setError] = useState<string | null>(null);
  const author = state.people.find(person => person.id === post.authorId);
  const connect = connectState(state, post);
  const known = isContact(state, post.authorId);
  const onConnect = () => {
    if (connect.threadId) { router.push(routes.chat(connect.threadId)); return; }
    const result = dispatch({ type: 'post/connect', postId: post.id });
    if (!result.ok) { setError(result.message); return; }
    setError(null);
    if (result.id) router.push(routes.chat(result.id));
  };
  return (
    <Card>
      <Row wrap>
        <Badge tone="accent" label={post.course ?? post.topic ?? 'General'} />
        <Body small secondary>{formatAgo(post.createdAt, now)}</Body>
      </Row>
      <Body bold>{post.title}</Body>
      <Body secondary>{post.description}</Body>
      {showAuthor && author && (
        <ListRow
          leading={<Avatar name={author.name} initials={author.initials} size={32} dashed={!known} />}
          title={author.name}
          subtitle={known ? 'In your messages' : 'New to you'}
          onPress={() => router.push(routes.person(author.id))}
          accessibilityHint="Opens profile"
        />
      )}
      <ErrorBanner message={error} />
      <Button label={connect.label} variant={connect.threadId ? 'secondary' : 'primary'} disabled={connect.disabled} onPress={onConnect}
        accessibilityLabel={`${connect.label} with ${author?.name ?? 'author'} about ${post.title}`} />
    </Card>
  );
}

export function PersonRow({ person, subtitle }: { person: User; subtitle?: string }) {
  const { state } = useCampus();
  const router = useRouter();
  const known = isContact(state, person.id);
  return (
    <ListRow
      leading={<Avatar name={person.name} initials={person.initials} dashed={!known} />}
      title={person.name}
      subtitle={subtitle ?? [person.major, person.courses.join(', ')].filter(Boolean).join(' · ')}
      trailing={<Badge label={known ? 'Contact' : 'New to you'} tone={known ? 'success' : 'neutral'} />}
      onPress={() => router.push(routes.person(person.id))}
      accessibilityHint="Opens profile"
    />
  );
}

export function windowLabel(window: { date: string; startMinute: number; endMinute: number }, now: number) {
  return `${formatDayLabel(window.date, now)} · ${formatMinuteOfDay(window.startMinute)} – ${formatMinuteOfDay(window.endMinute)}`;
}

/** Overlapping free time with a classmate, with a Send invite action. */
export function MatchCard({ match, location }: { match: AvailabilityMatch; location?: string }) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const person = state.people.find(item => item.id === match.personId);
  const existing = inviteForMatch(state, match);
  const name = person?.name ?? 'Classmate';
  const send = () => {
    const result = dispatch({ type: 'invite/send', draft: inviteDraftFromMatch(match, location, Date.now()) });
    setError(result.ok ? null : result.message);
  };
  return (
    <Card>
      <Row>
        <Avatar name={name} initials={person?.initials} size={34} />
        <Body bold style={{ flex: 1 }}>{name}</Body>
        <Badge label={match.course} tone="accent" />
      </Row>
      <Body>{windowLabel(match, now)}</Body>
      <ErrorBanner message={error} />
      {existing ? (
        existing.status === 'accepted' && existing.sessionId
          ? <Button label="Invite accepted · View session" variant="secondary" onPress={() => router.push(routes.session(existing.sessionId!))} />
          : <Badge label="Invite sent · Waiting for simulated reply" tone="warning" />
      ) : (
        <Button label="Send study invite" onPress={send} accessibilityLabel={`Send study invite to ${name} for ${windowLabel(match, now)}`} />
      )}
    </Card>
  );
}

export function InviteRow({ invite }: { invite: StudyInvite }) {
  const { state } = useCampus();
  const router = useRouter();
  const now = useNow();
  const person = state.people.find(item => item.id === invite.personId);
  const accepted = invite.status === 'accepted';
  return (
    <ListRow
      leading={<Avatar name={person?.name ?? '?'} initials={person?.initials} size={34} />}
      title={`${invite.course} with ${person?.name ?? 'classmate'}`}
      subtitle={`${formatWhen(invite.startsAt, now)} – ${formatClock(invite.endsAt)}${invite.location ? ` · ${invite.location}` : ''}`}
      meta={accepted ? 'Accepted (simulated). Session created.' : 'Pending. A simulated reply arrives shortly.'}
      trailing={<Badge label={accepted ? 'Accepted' : 'Pending'} tone={accepted ? 'success' : 'warning'} />}
      onPress={accepted && invite.sessionId ? () => router.push(routes.session(invite.sessionId!)) : undefined}
      accessibilityHint={accepted ? 'Opens the study session' : undefined}
    />
  );
}
