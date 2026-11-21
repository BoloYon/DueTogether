import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Avatar, Badge, Body, Button, Card, Choices, EmptyState, ErrorBanner, ListRow, Notice, Row, Screen, Section, TextField, Title,
  formatAgo, formatDayLabel, formatWhen, upcomingDayKeys, useNow,
} from '@/components/campus';
import { threadSummaries } from '@/features/chat/logic';
import { useCampus } from '@/shared/adapters';
import { routes, type DetailParams } from '@/shared/navigation';
import { findAvailabilityOverlaps, findThreadByPerson, normalizeCourse } from '@/shared/selectors';
import type { AvailabilityWindow } from '@/shared/types';
import { buildWindow, coursesForAvailability, isContact, myWindows, postsByAuthor, searchPartners, sortedInvites, minuteToInput, windowPassed } from './logic';
import { InviteRow, MatchCard, PersonRow, PostCard, windowLabel } from './parts';

/* ---------------- Partners tab ---------------- */

export function PartnersScreen() {
  const { state } = useCampus();
  const router = useRouter();
  const now = useNow();
  const summaries = threadSummaries(state);
  const posts = searchPartners(state, '').posts;
  const pendingInvites = state.invites.filter(invite => invite.status === 'pending').length;
  return (
    <Screen title="Partners">
      <Row wrap>
        <Button label="Find partners" onPress={() => router.push(routes.partnerFind)} />
        <Button label="Availability" variant="secondary" onPress={() => router.push(routes.partnerAvailability)} />
        <Button label={pendingInvites ? `Invites (${pendingInvites})` : 'Invites'} variant="secondary"
          accessibilityLabel={pendingInvites ? `Study invites, ${pendingInvites} pending` : 'Study invites'}
          onPress={() => router.push(routes.partnerInvite)} />
      </Row>

      <Section title="Messages" count={summaries.length}>
        {summaries.length ? summaries.map(({ thread, person, last, unread }) => (
          <ListRow
            key={thread.id}
            leading={<Avatar name={person?.name ?? '?'} initials={person?.initials} />}
            title={person?.name ?? 'Classmate'}
            subtitle={thread.pendingReply ? 'Typing… (simulated)' : last ? `${last.authorId === state.currentUser.id ? 'You: ' : ''}${last.text}` : 'No messages yet'}
            meta={last ? formatAgo(last.sentAt, now) : undefined}
            trailing={unread ? <Badge label={String(unread)} tone="accent" accessibilityLabel={`${unread} unread`} /> : undefined}
            onPress={() => router.push(routes.chat(thread.id))}
            accessibilityLabel={`${person?.name ?? 'Classmate'}${unread ? `, ${unread} unread` : ''}`}
            accessibilityHint="Opens conversation"
          />
        )) : <EmptyState title="No conversations yet" body="Connect on a partner post below to start a chat." />}
      </Section>

      <Section title="Partners wanted" count={posts.length}
        action={<Button compact variant="ghost" label="New post" accessibilityLabel="Create a partner post" onPress={() => router.push(routes.create({ kind: 'partner' }))} />}>
        {posts.length ? posts.map(post => <PostCard key={post.id} post={post} />)
          : <EmptyState title="No partner posts" body="Be the first to post what you want to study." />}
      </Section>

      <Section title="Classmates" count={state.people.length}>
        {state.people.map(person => <PersonRow key={person.id} person={person} />)}
      </Section>
      <Notice tone="neutral">Fictional classmates for the demo. Nothing leaves this device.</Notice>
    </Screen>
  );
}

/* ---------------- Find partners ---------------- */

export function PartnerFindScreen() {
  const { state } = useCampus();
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('all');
  const courseOptions = [...new Set([...state.currentUser.courses, ...state.people.flatMap(person => person.courses)].map(normalizeCourse))];
  const results = searchPartners(state, query, course === 'all' ? undefined : course);
  return (
    <Screen title="Find partners">
      <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Course, topic or name" autoCapitalize="none" />
      <Choices label="Course" value={course} onChange={setCourse}
        options={[{ value: 'all', label: 'All' }, ...courseOptions.map(item => ({ value: item, label: item }))]} />
      <Section title="Posts" count={results.posts.length}>
        {results.posts.length ? results.posts.map(post => <PostCard key={post.id} post={post} />)
          : <EmptyState title="No matching posts" body="Try another course or clear the search." />}
      </Section>
      <Section title="People" count={results.people.length}>
        {results.people.length ? results.people.map(person => <PersonRow key={person.id} person={person} />)
          : <EmptyState title="No matching classmates" body="Search by name or a course code like MAT 240." />}
      </Section>
    </Screen>
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
      <Row>
        <Avatar name={person.name} initials={person.initials} size={64} dashed={!known} />
        <View style={{ flex: 1, gap: 4 }}>
          <Title>{person.name}</Title>
          {(person.major || person.year) && <Body secondary>{[person.major, person.year].filter(Boolean).join(' · ')}</Body>}
          <Badge label={known ? 'In your messages' : 'New to you'} tone={known ? 'success' : 'neutral'} />
        </View>
      </Row>
      <Row wrap>{person.courses.map(course => <Badge key={course} label={course} tone={shared.includes(normalizeCourse(course)) ? 'accent' : 'neutral'} />)}</Row>
      {thread
        ? <Button label="Message" onPress={() => router.push(routes.chat(thread.id))} accessibilityLabel={`Message ${person.name}`} />
        : <Notice tone="accent">Connect on one of {person.name.split(' ')[0]}’s posts to start a conversation.</Notice>}

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

/* ---------------- Availability ---------------- */

export function AvailabilityScreen() {
  const { state, dispatch } = useCampus();
  const now = useNow();
  const courses = coursesForAvailability(state);
  const [course, setCourse] = useState(courses[0] ?? '');
  const days = upcomingDayKeys(now, 7);
  const [day, setDay] = useState(days[0]);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('12:00');
  const [editing, setEditing] = useState<AvailabilityWindow | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; error: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const windows = course ? myWindows(state, course) : [];
  const matches = course ? findAvailabilityOverlaps(state, course, now) : [];

  const reset = () => { setEditing(null); setFieldError(null); setFailure(null); };
  const save = () => {
    const built = buildWindow(day, start, end, Date.now());
    if (!built.ok) { setFieldError(built); return; }
    const result = dispatch({ type: 'availability/upsert', course, window: built.window, ...(editing ? { previous: editing } : {}) });
    if (!result.ok) { setFailure(result.message); return; }
    reset();
  };
  const edit = (window: AvailabilityWindow) => {
    setEditing(window);
    setDay(window.date);
    setStart(minuteToInput(window.startMinute));
    setEnd(minuteToInput(window.endMinute));
    setFieldError(null);
  };
  const remove = (window: AvailabilityWindow) => {
    const result = dispatch({ type: 'availability/remove', course, window });
    setFailure(result.ok ? null : result.message);
    if (editing && editing.date === window.date && editing.startMinute === window.startMinute) reset();
  };
  const dayOptions = [...new Set([...days, ...(editing ? [editing.date] : [])])];

  return (
    <Screen title="Availability">
      <Body secondary>Add when you are free for a course. Overlaps with classmates on the same day appear below, earliest first.</Body>
      {courses.length ? (
        <Choices label="Course" value={course} onChange={value => { setCourse(value); reset(); }} options={courses.map(item => ({ value: item, label: item }))} />
      ) : <EmptyState title="No courses" body="Add courses to your profile to share availability." />}

      <Section title="Your free time" count={windows.length}>
        {windows.length ? windows.map(window => {
          return (
            <Card key={`${window.date}-${window.startMinute}-${window.endMinute}`}>
              <Body bold>{windowLabel(window, now)}</Body>
              {windowPassed(window, now) && <Badge label="Passed · not used for matches" />}
              <Row>
                <Button flex compact variant="secondary" label="Edit" accessibilityLabel={`Edit ${windowLabel(window, now)}`} onPress={() => edit(window)} />
                <Button flex compact variant="danger" label="Remove" accessibilityLabel={`Remove ${windowLabel(window, now)}`} onPress={() => remove(window)} />
              </Row>
            </Card>
          );
        }) : <Body secondary>No windows for {course || 'this course'} yet.</Body>}
      </Section>

      <Section title={editing ? 'Edit window' : 'Add a window'}>
        <Choices label="Day" value={day} onChange={setDay} error={fieldError?.field === 'day' ? fieldError.error : undefined}
          options={dayOptions.map(key => ({ value: key, label: formatDayLabel(key, now) }))} />
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <TextField label="From" value={start} onChangeText={setStart} placeholder="10:00" maxLength={8}
              error={fieldError?.field === 'start' ? fieldError.error : undefined} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="To" value={end} onChangeText={setEnd} placeholder="12:00" maxLength={8}
              error={fieldError?.field === 'end' ? fieldError.error : undefined} />
          </View>
        </Row>
        <ErrorBanner message={failure} />
        <Row>
          <Button flex label={editing ? 'Update window' : 'Add window'} onPress={save} disabled={!course} />
          {editing && <Button flex variant="secondary" label="Cancel" onPress={reset} />}
        </Row>
      </Section>

      <Section title="Matches" count={matches.length}>
        {matches.length ? matches.map(match => <MatchCard key={`${match.personId}-${match.date}-${match.startMinute}`} match={match} />)
          : <EmptyState title="No overlaps yet" body="Add a window on a day classmates are free. Matches only count time that has not passed." />}
      </Section>
      <Notice tone="neutral">Classmate schedules are fictional sample data. Invites are accepted by a simulation.</Notice>
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
      <Section title="Suggested from shared free time" count={matches.length}>
        <TextField label="Meeting place (optional)" value={location} onChangeText={setLocation} placeholder="e.g. Library, room 2" maxLength={80}
          hint="Applied to the next invite you send" />
        {matches.length ? matches.map(match => <MatchCard key={`${match.personId}-${match.course}-${match.date}-${match.startMinute}`} match={match} location={location} />)
          : <EmptyState title="No overlapping free time" body="Add your availability to see classmates you can invite."
            action={<Button label="Add availability" variant="secondary" onPress={() => router.push(routes.partnerAvailability)} />} />}
      </Section>
      <Notice tone="neutral">Acceptance is simulated for the demo and creates one study session with both of you, plus a notification.</Notice>
    </Screen>
  );
}
