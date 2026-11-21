import type { CampusState, ContributionKind, Id } from './types';

function creditKey(kind: ContributionKind, itemId: Id) {
  return `${kind}:${itemId}`;
}

export function hasContributionCredit(state: CampusState, kind: ContributionKind, id: Id) {
  return state.contributionCredits.some(credit => credit.kind === kind && credit.itemId === id);
}

// Record the first qualifying interaction, keeping credit if a member later leaves.
export function recordContributionCredits(state: CampusState): CampusState {
  const existing = state.contributionCredits;
  const credits = new Map(existing.map(credit => [creditKey(credit.kind, credit.itemId), credit]));
  let changed = credits.size !== existing.length;
  const people = new Set([state.currentUser.id, ...state.people.map(person => person.id)]);
  const add = (kind: ContributionKind, itemId: Id, authorId: Id) => {
    const key = creditKey(kind, itemId);
    if (credits.has(key)) return;
    credits.set(key, { kind, itemId, authorId });
    changed = true;
  };
  const isOther = (id: Id, authorId: Id) => id !== authorId && people.has(id);

  for (const session of state.sessions) {
    if (session.attendeeIds.some(id => isOther(id, session.hostId))) add('session', session.id, session.hostId);
  }
  const projectMembers = new Map<Id, Id[]>();
  for (const membership of state.memberships) {
    if (membership.status !== 'member') continue;
    const members = projectMembers.get(membership.projectId) ?? [];
    members.push(membership.userId);
    projectMembers.set(membership.projectId, members);
  }
  for (const project of state.projects) {
    const members = projectMembers.get(project.id) ?? [];
    if ([...project.teamIds, ...members].some(id => isOther(id, project.ownerId))) {
      add('project', project.id, project.ownerId);
    }
  }
  const posts = new Map(state.posts.map(post => [post.id, post]));
  for (const thread of state.threads) {
    if (!isOther(thread.personId, state.currentUser.id)) continue;
    for (const id of thread.postIds) {
      const post = posts.get(id);
      if (post && (post.authorId === thread.personId || post.authorId === state.currentUser.id)) {
        add('post', post.id, post.authorId);
      }
    }
  }
  return changed ? { ...state, contributionCredits: [...credits.values()] } : state;
}

export function contributionTotal(state: CampusState, personId: Id) {
  const earned = state.contributionCredits.filter(credit => credit.authorId === personId).length;
  const guideStars = state.collections
    .filter(collection => collection.ownerId === personId)
    .flatMap(collection => collection.guides)
    .reduce((sum, guide) => sum + new Set(guide.starredBy.filter(id => id !== personId)).size, 0);
  return earned + guideStars;
}

const levels = [
  { minimum: 50, label: '🌀 Galactic Core' },
  { minimum: 25, label: '🌌 Nebula' },
  { minimum: 10, label: '⭐ Rising Star' },
  { minimum: 1, label: '☄️ Comet' },
];

export function contributionLevel(total: number) {
  return levels.find(level => total >= level.minimum)?.label ?? '🌑 New Moon';
}
