import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Avatar, Badge, Body, Button, Card, EmptyState, ErrorBanner, ListRow, Notice, Row, Screen, Section, Title, useNow,
} from '@/components/campus';
import { useCampus } from '@/shared/adapters';
import { routes, type DetailParams } from '@/shared/navigation';
import { describeSession } from './logic';

export function SessionScreen({ id }: DetailParams) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const session = state.sessions.find(item => item.id === id);

  if (!session) {
    return (
      <Screen title="Session">
        <EmptyState
          title="Session unavailable"
          body="It may have been removed or the demo data was reset. Browse other sessions from the Feed."
          action={<Button label="Go to Feed" variant="secondary" onPress={() => router.navigate(routes.feed)} />}
        />
      </Screen>
    );
  }

  const view = describeSession(session, state, now);
  const run = (type: 'session/join' | 'session/leave' | 'session/save' | 'session/unsave') => {
    const result = dispatch({ type, id: session.id });
    setError(result.ok ? null : result.message);
  };
  const me = state.currentUser.id;

  return (
    <Screen
      title={session.title}
      footer={
        <Row>
          {view.attendance && (
            <Button flex label={view.attendance.label} variant={view.attendance.action === 'session/leave' ? 'secondary' : 'primary'}
              onPress={() => run(view.attendance!.action)} />
          )}
          <Button
            flex={!view.attendance}
            label={view.saved ? 'Saved' : 'Save'}
            accessibilityLabel={view.saved ? 'Unsave session' : 'Save session'}
            accessibilityHint="Saving is separate from joining"
            variant="secondary"
            onPress={() => run(view.saved ? 'session/unsave' : 'session/save')}
          />
        </Row>
      }>
      <Row wrap>
        <Badge label={view.phaseLabel} tone={view.phase === 'live' ? 'live' : view.phase === 'ended' ? 'neutral' : 'accent'} />
        {view.hosting && <Badge label="Hosting" tone="success" />}
        {view.joined && !view.hosting && <Badge label="Going" tone="success" />}
        {view.full && <Badge label="Full" tone="warning" />}
        {view.saved && <Badge label="Saved" />}
      </Row>
      <Title>{session.title}</Title>
      <Body secondary>{view.subject}</Body>

      <Card>
        <Body bold>{view.whenText}</Body>
        <Body secondary>{view.timingText}</Body>
        <Body>{view.placeText}</Body>
        <Body>{view.capacityText}</Body>
      </Card>

      {view.attendanceNote && <Notice tone={view.phase === 'ended' ? 'neutral' : 'accent'}>{view.attendanceNote}</Notice>}
      <ErrorBanner message={error} />

      {session.description ? (
        <Section title="About">
          <Body>{session.description}</Body>
        </Section>
      ) : null}

      <Section title="Host">
        {view.host ? (
          <ListRow
            leading={<Avatar name={view.host.name} initials={view.host.initials} />}
            title={view.host.id === me ? `${view.host.name} (you)` : view.host.name}
            subtitle={view.host.major}
            onPress={view.host.id === me ? undefined : () => router.push(routes.person(view.host!.id))}
            accessibilityHint="Opens profile"
          />
        ) : <Body secondary>Host details unavailable.</Body>}
      </Section>

      <Section title="Attendees" count={view.attendees.length}>
        {view.attendees.length ? view.attendees.map(person => (
          <ListRow
            key={person.id}
            leading={<Avatar name={person.name} initials={person.initials} size={34} />}
            title={person.id === me ? `${person.name} (you)` : person.name}
            subtitle={person.id === session.hostId ? 'Host' : undefined}
            onPress={person.id === me ? undefined : () => router.push(routes.person(person.id))}
            accessibilityHint={person.id === me ? undefined : 'Opens profile'}
          />
        )) : <Body secondary>No one has joined yet. Be the first.</Body>}
      </Section>

      <Notice tone="neutral">Fictional campus demo. Joining and saving update this device only.</Notice>
    </Screen>
  );
}
