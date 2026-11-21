import { TabPage } from '@/components/campus/TabPage';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Avatar, Badge, Body, Button, Card, EmptyState, ErrorBanner, ListRow, Notice, Row, Screen, Section, Segmented,
} from '@/components/campus';
import { personById } from '@/features/sessions/logic';
import { useCampus } from '@/shared/adapters';
import { routes, type DetailParams } from '@/shared/navigation';
import type { Project } from '@/shared/types';
import { describeProject, sortedProjects, type ProjectStatus } from './logic';

const statusTone: Record<ProjectStatus, 'success' | 'accent' | 'warning' | 'neutral'> = {
  owner: 'success', member: 'success', requested: 'warning', full: 'neutral', open: 'accent',
};

function useProjectAction(project: Project | undefined) {
  const { dispatch } = useCampus();
  const [error, setError] = useState<string | null>(null);
  const run = (type: 'project/request' | 'project/cancel') => {
    if (!project) return;
    const result = dispatch({ type, id: project.id });
    setError(result.ok ? null : result.message);
  };
  return { error, run };
}

function ProjectCard({ project }: { project: Project }) {
  const { state } = useCampus();
  const router = useRouter();
  const view = describeProject(state, project);
  const { error, run } = useProjectAction(project);
  return (
    <Card style={{ gap: 8 }}>
      <Body bold>{project.title}</Body>
      <Row wrap>
        <Badge label={view.categoryLabel} tone="accent" />
        {view.status !== 'open' && <Badge label={view.statusLabel} tone={statusTone[view.status]} />}
      </Row>
      <Body secondary numberOfLines={3}>{project.pitch}</Body>
      {project.openRoles.length > 0 && <Body small secondary>{`Roles: ${project.openRoles.join(', ')}`}</Body>}
      <Body small secondary>{project.teamIds.length}/{project.capacity} on team</Body>
      <ErrorBanner message={error} />
      <Row>
        <Button flex label="Details" variant="secondary" accessibilityLabel={`View details: ${project.title}`}
          onPress={() => router.push(routes.project(project.id))} />
        {view.action && <Button flex label={view.action.label} variant={view.action.type === 'project/cancel' ? 'secondary' : 'primary'}
          accessibilityLabel={`${view.action.label}: ${project.title}`} onPress={() => run(view.action!.type)} />}
      </Row>
    </Card>
  );
}

export function ProjectsScreen() {
  const { state } = useCampus();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const projects = sortedProjects(state, filter);
  return (
    <TabPage title="Projects" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Body small secondary>Campus demo · Requests stay on this device</Body>
      <Segmented label="Show projects" value={filter} onChange={setFilter}
        options={[{ value: 'all', label: 'All' }, { value: 'mine', label: 'Yours & requested' }]} />
      {projects.length ? projects.map(project => <ProjectCard key={project.id} project={project} />)
        : <EmptyState title={filter === 'mine' ? 'Nothing here yet' : 'No projects yet'}
          body={filter === 'mine' ? 'Ask to join a project or create one.' : 'Create the first project and list the roles you need.'} />}
    </TabPage>
  );
}

export function ProjectScreen({ id }: DetailParams) {
  const { state } = useCampus();
  const router = useRouter();
  const project = state.projects.find(item => item.id === id);
  const { error, run } = useProjectAction(project);
  if (!project) {
    return (
      <Screen title="Project">
        <EmptyState title="Project unavailable" body="Return to Projects to browse available teams."
          action={<Button label="Browse projects" variant="secondary" onPress={() => router.navigate(routes.projects)} />} />
      </Screen>
    );
  }
  const view = describeProject(state, project);
  const me = state.currentUser.id;
  const team = project.teamIds.map(memberId => personById(state, memberId)).filter(person => !!person);
  return (
    <Screen title={project.title}
      footer={view.action ? <Button label={view.action.label} variant={view.action.type === 'project/cancel' ? 'secondary' : 'primary'} onPress={() => run(view.action!.type)} /> : undefined}>
      <Row wrap>
        <Badge label={view.categoryLabel} tone="accent" />
        <Badge label={view.statusLabel} tone={statusTone[view.status]} />
      </Row>
      <Body>{project.pitch}</Body>
      {view.status === 'requested' && <Notice tone="warning">Awaiting the owner’s response in the demo.</Notice>}
      <ErrorBanner message={error} />

      <Section title="Open roles" count={project.openRoles.length}>
        {project.openRoles.length
          ? <Row wrap>{project.openRoles.map(role => <Badge key={role} label={role} />)}</Row>
          : <Body secondary>No open roles listed.</Body>}
      </Section>

      <Section title="Team">
        <Body small secondary>{view.occupancyText}</Body>
        {team.map(person => (
          <ListRow key={person!.id}
            leading={<Avatar name={person!.name} initials={person!.initials} size={34} />}
            title={person!.id === me ? `${person!.name} (you)` : person!.name}
            subtitle={person!.id === project.ownerId ? 'Owner' : 'Member'}
            onPress={person!.id === me ? undefined : () => router.push(routes.person(person!.id))}
            accessibilityHint={person!.id === me ? undefined : 'Opens profile'} />
        ))}
      </Section>
    </Screen>
  );
}
