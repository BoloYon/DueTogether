import { ConnectionNotice, useConnectionNotice } from '@/features/chat/ConnectionNotice';
import { FilterChip } from '@/features/feed/ui';
import { ProfileCollections } from '@/features/profile/collections';
import { ProfileHeader } from '@/features/profile/profile-header';
import { TabPage } from '@/components/campus/TabPage';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Badge, Body, Button, EmptyState, ListRow, Notice, Row, Screen, Section, TextField, formatWhen, useNow,
} from '@/components/campus';
import { useCampus } from '@/shared/adapters';
import { routes, type DetailParams } from '@/shared/navigation';
import { findAvailabilityOverlaps, findThreadByPerson, normalizeCourse, selectFeedSections } from '@/shared/selectors';
import { coursesForAvailability, filterPartnerPostsByCourses, isContact, postsByAuthor, sortedInvites } from './logic';
import { InviteRow, MatchCard, PersonRow, PostCard } from './parts';

type PartnersSection = 'sessions' | 'courses' | 'collaboration';

export function PartnersScreen() {
  const { state } = useCampus();
  const router = useRouter();
  const now = useNow();
  const notice = useConnectionNotice();
  const [collapsed, setCollapsed] = useState<Partial<Record<PartnersSection, boolean>>>({});
  const collapse = (key: PartnersSection) => ({
    expanded: !collapsed[key],
    onToggle: () => setCollapsed(current => ({ ...current, [key]: !current[key] })),
  });
  const [selection, setSelection] = useState<string[]>([]);
  const courses = [...new Set(state.currentUser.courses.map(normalizeCourse).filter(Boolean))];
  const selected = selection.filter(course => courses.includes(course));
  const discovery = selectFeedSections(state, [], now);
  const sessions = [...discovery.happeningNow, ...discovery.comingUp];
  const coursePosts = filterPartnerPostsByCourses(discovery.partnersWanted.filter(post => post.course?.trim()), selected);
  const collaboration = discovery.partnersWanted.filter(post => !post.course?.trim());
  const clear = () => setSelection([]);
  const pendingInvites = state.invites.filter(invite => invite.status === 'pending').length;
  return (
    <TabPage title="Partners" contentContainerStyle={{ padding: 16, gap: 20 }} footer={notice.confirmation &&
      <ConnectionNotice confirmation={notice.confirmation} onDismiss={notice.dismiss} />}>
      <Body small secondary>Campus demo · Fictional classmates</Body>
      <Row wrap>
        <Button label="Find a study match" onPress={() => router.push(routes.partnerFind)} />
        <Button label={pendingInvites ? `Invites (${pendingInvites})` : 'Invites'} variant="secondary"
          accessibilityLabel={pendingInvites ? `Study invites, ${pendingInvites} pending` : 'Study invites'}
          onPress={() => router.push(routes.partnerInvite)} />
      </Row>

      <Section title="Study sessions" collapse={collapse('sessions')} count={sessions.length}>
        {sessions.length ? sessions.map(session =>
          <ListRow key={session.id} title={session.title}
            subtitle={`${session.course ?? session.topic ?? 'Study'} · ${formatWhen(session.startsAt, now)}`}
            trailing={session.startsAt <= now ? <Badge label="Live" tone="live" /> : undefined}
            onPress={() => router.push(routes.session(session.id))} accessibilityHint="Opens session details" />
        ) : <Body secondary>No upcoming study sessions.</Body>}
      </Section>

      <Section title="Course requests" collapse={collapse('courses')} count={coursePosts.length}
        action={<Button compact variant="ghost" label="New post" accessibilityLabel="Create a partner post" onPress={() => router.push(routes.create({ kind: 'partner' }))} />}>
        {courses.length > 0 ? <Row wrap>
          {courses.map(course => <FilterChip key={course} label={course} selected={selected.includes(course)}
            onPress={() => setSelection(current => current.includes(course) ? current.filter(item => item !== course) : [...current, course])} />)}
          {selected.length > 0 && <Button compact variant="ghost" label="Clear" accessibilityLabel="Clear course filters" onPress={clear} />}
        </Row> : <Row wrap>
          <Body secondary>No course codes saved.</Body>
          <Button compact variant="ghost" label="Edit courses" onPress={() => router.push(routes.profileSettings)} />
        </Row>}
        {coursePosts.length ? coursePosts.map(post => <PostCard key={post.id} post={post} onConnected={notice.show} />)
          : selected.length > 0 ? <EmptyState title="No partner posts for these courses" body="Clear the filters to see all course requests."
            action={<Button label="Clear" onPress={clear} />} />
            : <Body secondary>No course requests right now.</Body>}
      </Section>
      <Section title="Collaboration requests" collapse={collapse('collaboration')} count={collaboration.length}>
        {collaboration.length ? collaboration.map(post => <PostCard key={post.id} post={post} onConnected={notice.show} />)
          : <Body secondary>No collaboration requests right now.</Body>}
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
