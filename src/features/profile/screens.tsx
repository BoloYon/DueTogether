import { TabPage } from '@/components/campus/TabPage';
import { appearanceOptions, useAppearance } from '@/hooks/appearance';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Badge, Body, Button, Card, ErrorBanner, ListRow, Notice, Row, Screen, Section, TextField, formatWhen, useNow,
} from '@/components/campus';
import { describeSession } from '@/features/sessions/logic';
import { useCampus } from '@/shared/adapters';
import { hasContributionCredit } from '@/shared/contributions';
import { BIO_LIMIT, countGraphemes } from '@/shared/profile-media';
import { routes } from '@/shared/navigation';
import type { ContributionKind, StudySession } from '@/shared/types';
import { ProfileCollections } from './collections';
import { ProfileHeader } from './profile-header';
import { useMediaPicker } from './media';
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
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const now = useNow();
  const user = state.currentUser;
  const sections = profileSections(state, now);
  const [demoError, setDemoError] = useState<string>();
  const sampleAction = (kind: ContributionKind, id: string) => {
    if (!state.people.length || hasContributionCredit(state, kind, id)) return;
    return (
      <Button label={kind === 'post' ? 'Simulate classmate connection' : 'Simulate classmate joining'} variant="secondary" onPress={() => {
        const result = dispatch({ type: 'demo/contribute', kind, id });
        setDemoError(result.ok ? undefined : result.message);
      }} />
    );
  };
  return (
    <TabPage title="Profile" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <ProfileHeader user={user} />
      <Row wrap>{user.courses.map(course => <Badge key={course} label={course} tone="accent" />)}</Row>
      <ProfileCollections ownerId={user.id} />
      <ErrorBanner message={demoError} />
      <Section title="Going" count={sections.going.length}>
        <SessionRows sessions={sections.going} empty="Join a session from the Feed to see it here." />
      </Section>
      <Section title="Hosting" count={sections.hosting.length}
        action={<Button compact variant="ghost" label="New session" accessibilityLabel="Create a study session" onPress={() => router.push(routes.create({ kind: 'session' }))} />}>
        {sections.hosting.length ? sections.hosting.map(session => (
          <Card key={session.id}>
            <SessionRows sessions={[session]} empty="" />
            {sampleAction('session', session.id)}
          </Card>
        )) : <Body secondary>Sessions you create appear here.</Body>}
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
            {sampleAction('post', post.id)}
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
          <Card key={project.id}>
            <ListRow title={project.title} subtitle={project.ownerId === user.id ? 'Owner' : 'Member'}
              onPress={() => router.push(routes.project(project.id))} accessibilityHint="Opens project" />
            {project.ownerId === user.id && sampleAction('project', project.id)}
          </Card>
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
        <Body secondary>Reset restores the fictional campus demo and removes your imported files, profile pictures and collections from this device. Your Canvas connection, calendar and appearance are kept.</Body>
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
  const [bio, setBio] = useState(state.currentUser.bio ?? '');
  const bioLength = countGraphemes(bio);
  const { busy, error, pick } = useMediaPicker();
  const setPicture = (field: 'avatar' | 'banner', key?: string) => dispatch({ type: 'profile/picture', field, key });
  const [fieldError, setFieldError] = useState<{ field: 'name' | 'major'; error: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    const checked = validateProfile(name, major);
    if (!checked.ok) { setFieldError(checked); setSaved(false); return; }
    const result = dispatch({ type: 'profile/update', profile: { ...checked.profile, bio } });
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
      <TextField label="Bio (optional)" value={bio} onChangeText={value => { setBio(value); setSaved(false); }}
        multiline hint={`${bioLength} / ${BIO_LIMIT} characters`}
        error={bioLength > BIO_LIMIT ? 'Keep your bio to 150 characters.' : undefined} />
      <ErrorBanner message={failure} />
      {saved && <Notice tone="success">Profile saved.</Notice>}
      <Button label="Save profile" disabled={bioLength > BIO_LIMIT} onPress={save} />
      <Section title="Profile pictures">
        <ProfileHeader user={state.currentUser} />
        {(['avatar', 'banner'] as const).map(field => (
          <Row key={field} wrap>
            <Button label={`${state.currentUser[field] ? 'Change' : 'Add'} ${field}`} variant="secondary" disabled={busy}
              onPress={() => void pick(true, file => setPicture(field, file.source.key))} />
            {state.currentUser[field] && <Button label={`Remove ${field}`} variant="ghost" disabled={busy} onPress={() => {
              const result = setPicture(field);
              setFailure(result.ok ? null : result.message);
            }} />}
          </Row>
        ))}
        <ErrorBanner message={error} />
      </Section>
    </Section>
  );
}
