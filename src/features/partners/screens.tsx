import { ProfileCollections } from '@/features/profile/collections';
import { ProfileHeader } from '@/features/profile/profile-header';
import { TabPage } from '@/components/campus/TabPage';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Avatar, Badge, Body, Button, EmptyState, ListRow, Notice, Row, Screen, Section, TextField,
  formatAgo, formatWhen, useNow,
} from '@/components/campus';
import { threadSummaries } from '@/features/chat/logic';
import { useCampus } from '@/shared/adapters';
import { routes, type DetailParams } from '@/shared/navigation';
import { findAvailabilityOverlaps, findThreadByPerson, normalizeCourse } from '@/shared/selectors';
import { coursesForAvailability, isContact, postsByAuthor, searchPartners, sortedInvites } from './logic';
import { InviteRow, MatchCard, PersonRow, PostCard } from './parts';

/* ---------------- Partners tab ---------------- */

export function PartnersScreen() {
  const { state } = useCampus();
  const router = useRouter();
  const now = useNow();
  const summaries = threadSummaries(state);
  const posts = searchPartners(state, '').posts;
  const pendingInvites = state.invites.filter(invite => invite.status === 'pending').length;
  return (
    <TabPage title="Partners" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <Body small secondary>Campus demo · Fictional classmates</Body>
      <Row wrap>
        <Button label="Find a study match" onPress={() => router.push(routes.partnerFind)} />
        <Button label={pendingInvites ? `Invites (${pendingInvites})` : 'Invites'} variant="secondary"
          accessibilityLabel={pendingInvites ? `Study invites, ${pendingInvites} pending` : 'Study invites'}
          onPress={() => router.push(routes.partnerInvite)} />
      </Row>

      <Section title="Messages">
        {summaries.length ? summaries.map(({ thread, person, last, unread }) => (
          <ListRow
            key={thread.id}
            leading={<Avatar name={person?.name ?? '?'} initials={person?.initials} />}
            title={person?.name ?? 'Classmate'}
            subtitle={thread.pendingReply ? 'Typing…' : last ? `${last.authorId === state.currentUser.id ? 'You: ' : ''}${last.text}` : 'No messages yet'}
            meta={last ? formatAgo(last.sentAt, now) : undefined}
            trailing={unread ? <Badge label={String(unread)} tone="accent" accessibilityLabel={`${unread} unread`} /> : undefined}
            onPress={() => router.push(routes.chat(thread.id))}
            accessibilityLabel={`${person?.name ?? 'Classmate'}${unread ? `, ${unread} unread` : ''}`}
            accessibilityHint="Opens conversation"
          />
        )) : <EmptyState title="No conversations yet" body="Connect on a partner post below to start a chat." />}
      </Section>

      <Section title="Partners wanted"
        action={<Button compact variant="ghost" label="New post" accessibilityLabel="Create a partner post" onPress={() => router.push(routes.create({ kind: 'partner' }))} />}>
        {posts.length ? posts.map(post => <PostCard key={post.id} post={post} />)
          : <EmptyState title="No partner posts" body="Use New post to find a partner." />}
      </Section>

      <Section title="Classmates">
        {state.people.map(person => <PersonRow key={person.id} person={person} />)}
      </Section>
    </TabPage>
  );
}

/* ---------------- Person ---------------- */

export function PersonScreen({ id }: DetailParams) {
  const { state } = useCampus();
  const router = useRouter();
  const now = useNow();
  const person = state.people.find(item => item.id === id);
  if (!person) {
    return (
      <Screen title="Profile">
        <EmptyState title="Profile unavailable" body="This classmate is not in the demo data. Browse classmates instead."
          action={<Button label="Browse partners" variant="secondary" onPress={() => router.navigate(routes.partners)} />} />
      </Screen>
    );
  }
  const thread = findThreadByPerson(state, person.id);
  const known = isContact(state, person.id);
  const posts = postsByAuthor(state, person.id);
  const shared = person.courses.map(normalizeCourse).filter(course => state.currentUser.courses.map(normalizeCourse).includes(course));
  const overlaps = shared.flatMap(course => findAvailabilityOverlaps(state, course, now).filter(match => match.personId === person.id));
  const sessions = state.sessions
    .filter(session => session.attendeeIds.includes(person.id) && session.endsAt > now)
    .sort((left, right) => left.startsAt - right.startsAt);
  return (
    <Screen title={person.name}>
      <ProfileHeader user={person} dashed={!known}>
        <Badge label={known ? 'In your messages' : 'New to you'} tone={known ? 'success' : 'neutral'} />
      </ProfileHeader>
      <Row wrap>{person.courses.map(course => <Badge key={course} label={course} tone={shared.includes(normalizeCourse(course)) ? 'accent' : 'neutral'} />)}</Row>
      {thread
        ? <Button label="Message" onPress={() => router.push(routes.chat(thread.id))} accessibilityLabel={`Message ${person.name}`} />
        : <Notice tone="accent">Connect on a post to start a conversation.</Notice>}

      <ProfileCollections ownerId={person.id} />

      <Section title="Partner posts" count={posts.length}>
        {posts.length ? posts.map(post => <PostCard key={post.id} post={post} showAuthor={false} />)
          : <Body secondary>No partner posts right now.</Body>}
      </Section>

      <Section title="Shared free time">
        {overlaps.length ? overlaps.map(match => <MatchCard key={`${match.course}-${match.date}-${match.startMinute}`} match={match} />)
          : <Body secondary>{shared.length ? 'No overlapping availability yet. Add your free time to find a match.' : 'No shared courses.'}</Body>}
        <Button label="Edit your availability" variant="ghost" onPress={() => router.push(routes.partnerAvailability)} />
      </Section>

      {sessions.length > 0 && (
        <Section title="Upcoming sessions">
          {sessions.map(session => (
            <ListRow key={session.id} title={session.title} subtitle={formatWhen(session.startsAt, now)}
              onPress={() => router.push(routes.session(session.id))} accessibilityHint="Opens session" />
          ))}
        </Section>
      )}
    </Screen>
  );
}

/* ---------------- Invites ---------------- */

export function InviteScreen() {
  const { state } = useCampus();
  const router = useRouter();
  const now = useNow();
  const [location, setLocation] = useState('');
  const invites = sortedInvites(state);
  const matches = coursesForAvailability(state).flatMap(course => findAvailabilityOverlaps(state, course, now))
    .sort((left, right) => left.date.localeCompare(right.date) || left.startMinute - right.startMinute);
  return (
    <Screen title="Study invites">
      <Section title="Sent invites" count={invites.length}>
        {invites.length ? invites.map(invite => <InviteRow key={invite.id} invite={invite} />)
          : <Body secondary>No invites yet. Send one from a match below.</Body>}
      </Section>
      <Section title="Availability matches" count={matches.length}>
        <TextField label="Meeting place (optional)" value={location} onChangeText={setLocation} placeholder="e.g. Library, room 2" maxLength={80}
          hint="Applied to the next invite you send" />
        {matches.length ? matches.map(match => <MatchCard key={`${match.personId}-${match.course}-${match.date}-${match.startMinute}`} match={match} location={location} />)
          : <EmptyState title="No overlapping free time" body="Add your availability to see classmates you can invite."
            action={<Button label="Add availability" variant="secondary" onPress={() => router.push(routes.partnerAvailability)} />} />}
      </Section>
      <Notice tone="neutral">In this demo, a simulated acceptance creates a study session and sends a notification.</Notice>
    </Screen>
  );
}
