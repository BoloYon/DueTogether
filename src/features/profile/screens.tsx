import { TabPage } from '@/components/campus/TabPage';
import { appearanceOptions, useAppearance } from '@/hooks/appearance';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Avatar, Badge, Body, Button, Card, ErrorBanner, ListRow, Notice, Row, Screen, Section, TextField, Title, formatWhen, useNow,
} from '@/components/campus';
import { describeSession } from '@/features/sessions/logic';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import type { StudySession } from '@/shared/types';
import { MAJOR_MAX, NAME_MAX, profileSections, validateProfile } from './logic';

function SessionRows({ sessions, empty }: { sessions: StudySession[]; empty: string }) {
  const { state } = useCampus();
  const router = useRouter();
  const now = useNow();
  if (!sessions.length) return <Body secondary>{empty}</Body>;
  return sessions.map(session => {
    const view = describeSession(session, state, now);
    return (
      <ListRow key={session.id} title={session.title}
        subtitle={`${view.subject} · ${formatWhen(session.startsAt, now)}`}
        meta={view.placeText}
        trailing={<Badge label={view.phaseLabel} tone={view.phase === 'live' ? 'live' : view.phase === 'ended' ? 'neutral' : 'accent'} />}
        onPress={() => router.push(routes.session(session.id))} accessibilityHint="Opens session" />
    );
  });
}

export function ProfileScreen() {
  const { state } = useCampus();
  const router = useRouter();
  const now = useNow();
  const user = state.currentUser;
  const sections = profileSections(state, now);
  return (
    <TabPage title="Profile" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Row>
        <Avatar name={user.name} initials={user.initials} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Title>{user.name}</Title>
          <Body secondary>{user.major || 'Add your major in settings'}</Body>
        </View>
      </Row>
      <Row wrap>{user.courses.map(course => <Badge key={course} label={course} tone="accent" />)}</Row>
      <Section title="Going" count={sections.going.length}>
        <SessionRows sessions={sections.going} empty="Join a session from the Feed to see it here." />
      </Section>
      <Section title="Hosting" count={sections.hosting.length}
        action={<Button compact variant="ghost" label="New session" accessibilityLabel="Create a study session" onPress={() => router.push(routes.create({ kind: 'session' }))} />}>
        <SessionRows sessions={sections.hosting} empty="Sessions you create appear here." />
      </Section>
      <Section title="Saved" count={sections.saved.length}>
        <SessionRows sessions={sections.saved} empty="Save sessions to keep an eye on them without joining." />
      </Section>
      <Section title="Your posts" count={sections.posts.length}>
        {sections.posts.length ? sections.posts.map(post => (
          <Card key={post.id}>
            <Badge label={post.course ?? post.topic ?? 'General'} tone="accent" />
            <Body bold>{post.title}</Body>
            <Body secondary>{post.description}</Body>
          </Card>
        )) : <Body secondary>No partner posts yet.</Body>}
      </Section>
      <Section title="Project requests" count={sections.requested.length}>
        {sections.requested.length ? sections.requested.map(project => (
          <ListRow key={project.id} title={project.title} subtitle="Requested · waiting for owner"
            trailing={<Badge label="Requested" tone="warning" />}
            onPress={() => router.push(routes.project(project.id))} accessibilityHint="Opens project, where you can cancel" />
        )) : <Body secondary>No pending requests.</Body>}
      </Section>
      <Section title="Your teams" count={sections.teams.length}>
        {sections.teams.length ? sections.teams.map(project => (
          <ListRow key={project.id} title={project.title}
            subtitle={project.ownerId === user.id ? 'Owner' : 'Member'}
            onPress={() => router.push(routes.project(project.id))} accessibilityHint="Opens project" />
        )) : <Body secondary>You are not on a project team yet.</Body>}
      </Section>
      <ResetDemoData />
    </TabPage>
  );
}

function ResetDemoData() {
  const { dispatch } = useCampus();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  const reset = () => {
    const result = dispatch({ type: 'demo/reset' });
    setConfirmReset(false);
    if (!result.ok) { setFailure(result.message); return; }
    setFailure(null);
    setResetCount(count => count + 1);
  };

  return (
      <Section title="Demo data">
        <Body secondary>Reset restores the fictional sample sessions, posts, chats, projects, availability, invites and notifications on this device. Your Canvas connection, calendar and appearance are kept.</Body>
        {resetCount > 0 && <Notice tone="success">Demo data reset.</Notice>}
        <ErrorBanner message={failure} />
        {confirmReset ? (
          <Card>
            <Body bold>Reset all campus demo data?</Body>
            <Body secondary>This removes everything you created or joined in the demo. It cannot be undone.</Body>
            <Row>
              <Button flex variant="secondary" label="Keep data" onPress={() => setConfirmReset(false)} />
              <Button flex variant="danger" label="Reset" accessibilityLabel="Confirm reset demo data" onPress={reset} />
            </Row>
          </Card>
        ) : (
          <Button variant="danger" label="Reset demo data" accessibilityHint="Asks for confirmation first" onPress={() => setConfirmReset(true)} />
        )}
      </Section>
  );
}

export function ProfileSettingsScreen() {
  const { choice, select } = useAppearance();
  return <Screen title="Profile settings">
    <Section title="Appearance">
      <Card>
        {appearanceOptions.map(option => <ListRow key={option}
          title={option[0].toUpperCase() + option.slice(1)}
          selected={choice === option}
          trailing={choice === option ? <Body bold>✓</Body> : undefined} onPress={() => select(option)} />)}
      </Card>
    </Section>
    <ProfileForm />
  </Screen>;
}

function ProfileForm() {
  const { state, dispatch } = useCampus();
  const [name, setName] = useState(state.currentUser.name);
  const [major, setMajor] = useState(state.currentUser.major ?? '');
  const [fieldError, setFieldError] = useState<{ field: 'name' | 'major'; error: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    const checked = validateProfile(name, major);
    if (!checked.ok) { setFieldError(checked); setSaved(false); return; }
    const result = dispatch({ type: 'profile/update', profile: checked.profile });
    if (!result.ok) { setFailure(result.message); setSaved(false); return; }
    setFieldError(null);
    setFailure(null);
    setName(checked.profile.name);
    setSaved(true);
  };

  return (
    <Section title="Profile">
      <TextField label="Display name" value={name} onChangeText={value => { setName(value); setSaved(false); }} maxLength={NAME_MAX + 10}
        error={fieldError?.field === 'name' ? fieldError.error : undefined} autoCapitalize="words" />
      <TextField label="Major (optional)" value={major} onChangeText={value => { setMajor(value); setSaved(false); }} maxLength={MAJOR_MAX + 10}
        error={fieldError?.field === 'major' ? fieldError.error : undefined} />
      <ErrorBanner message={failure} />
      {saved && <Notice tone="success">Profile saved.</Notice>}
      <Button label="Save profile" onPress={save} />
    </Section>
  );
}
