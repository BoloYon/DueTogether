import type { CampusState, Project } from '@/shared/types';

export type ProjectStatus = 'owner' | 'member' | 'requested' | 'full' | 'open';

export function projectStatus(state: CampusState, project: Project): ProjectStatus {
  const me = state.currentUser.id;
  if (project.ownerId === me) return 'owner';
  const membership = state.memberships.find(item => item.projectId === project.id && item.userId === me);
  if (project.teamIds.includes(me) || membership?.status === 'member') return 'member';
  if (membership?.status === 'requested') return 'requested';
  return project.teamIds.length >= project.capacity ? 'full' : 'open';
}

export interface ProjectView {
  status: ProjectStatus;
  statusLabel: string;
  occupancyText: string;
  openSpots: number;
  categoryLabel: string;
  /** Request/cancel action from shared state; null when not applicable. */
  action: { type: 'project/request' | 'project/cancel'; label: string } | null;
  note?: string;
}

export function describeProject(state: CampusState, project: Project): ProjectView {
  const status = projectStatus(state, project);
  const openSpots = Math.max(0, project.capacity - project.teamIds.length);
  const labels: Record<ProjectStatus, string> = { owner: 'Your project', member: 'On the team', requested: 'Requested', full: 'Team full', open: 'Open' };
  const action: ProjectView['action'] = status === 'open'
    ? { type: 'project/request', label: 'Ask to join' }
    : status === 'requested' ? { type: 'project/cancel', label: 'Cancel request' } : null;
  const note = {
    owner: 'You own this project. Requests from classmates would appear here in a connected version.',
    member: 'You are on this team.',
    requested: 'Request sent. The owner has not responded in this demo. You are not on the team yet.',
    full: 'This team is full and is not accepting requests.',
    open: undefined,
  }[status];
  return {
    status, statusLabel: labels[status], openSpots, action, note,
    occupancyText: `${project.teamIds.length} of ${project.capacity} on the team${openSpots ? ` · ${openSpots} open` : ''}`,
    categoryLabel: project.course ?? project.category ?? 'Personal',
  };
}

export function sortedProjects(state: CampusState, filter: 'all' | 'mine' = 'all') {
  return [...state.projects]
    .filter(project => filter === 'all' || ['owner', 'member', 'requested'].includes(projectStatus(state, project)))
    .sort((left, right) => right.createdAt - left.createdAt);
}
