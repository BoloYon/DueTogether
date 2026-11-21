
import type { CampusState, CanvasItem, Clock } from './types';

export function localDayKey(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
}

const additionalStudyRequests = [
  { id: 'demo-mat240-eigenvectors', authorId: 'dev', course: 'MAT 240', title: 'Check eigenvectors by hand', description: 'Work two practice matrices and compare how we check each eigenvector.' },
  { id: 'demo-phy220-standing-waves', authorId: 'noa', course: 'PHY 220', title: 'Sketch standing-wave modes', description: 'Draw the first three modes for a string and compare where the nodes land.' },
];

export function addDemoStudyRequests(state: CampusState, now: number): CampusState {
  if (state.currentUser.id !== 'you') return state;
  const missing = additionalStudyRequests.filter(request =>
    state.people.some(person => person.id === request.authorId) && !state.posts.some(post => post.id === request.id));
  if (!missing.length) return state;
  return { ...state, posts: [...state.posts, ...missing.map((request, index) => ({
    ...request, createdAt: now - (4 + index) * 3_600_000,
  }))] };
}

export function makeCampusFixtures(clock: Clock = Date.now): CampusState {
  const now = clock();
  const hour = 3_600_000;
  const course = 'MAT 240';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = localDayKey(tomorrow);
  const currentUser = { id: 'you', name: 'Avery Vale', major: 'Applied Computing', courses: [course, 'PHY 220'] };
  const people = [
    { id: 'mira', name: 'Mira Quill', courses: [course] },
    { id: 'dev', name: 'Dev Rowan', courses: [course, 'PHY 220'] },
    { id: 'noa', name: 'Noa Flint', courses: ['PHY 220'] },
  ];
  return addDemoStudyRequests({
    currentUser, people,
    sessions: [
      { id: 'live', title: 'Matrix problem lab', course, hostId: 'mira', attendeeIds: ['mira', 'dev'], startsAt: now - hour / 2, endsAt: now + hour, createdAt: now - 24 * hour, location: 'Juniper Study Loft', capacity: 6 },
      { id: 'upcoming', title: 'Wave diagrams', course: 'PHY 220', hostId: 'noa', attendeeIds: ['noa'], startsAt: now + 2 * hour, endsAt: now + 3 * hour, createdAt: now - hour, format: 'online' },
      { id: 'ended', title: 'Vector review', course, hostId: 'dev', attendeeIds: ['dev'], startsAt: now - 3 * hour, endsAt: now - hour, createdAt: now - 24 * hour },
      { id: 'full', title: 'Proofs roundtable', course, hostId: 'dev', attendeeIds: ['dev', 'mira'], startsAt: now + 3 * hour, endsAt: now + 4 * hour, createdAt: now - hour, capacity: 2 },
    ],
    savedSessionIds: ['upcoming'],
    posts: [
      { id: 'mira-1', authorId: 'mira', course, title: 'Practice diagonalization', description: 'Compare solutions to the practice set.', createdAt: now - hour },
      { id: 'mira-2', authorId: 'mira', course, title: 'Compare proof outlines', description: 'Work through two proof strategies.', createdAt: now - 2 * hour },
      { id: 'dev-1', authorId: 'dev', course: 'PHY 220', title: 'Simulate a wave', description: 'Compare predictions with the simulator.', createdAt: now - hour / 2 },
    ],
    postToThread: { 'mira-1': 'thread-mira' },
    threads: [{ id: 'thread-mira', personId: 'mira', postIds: ['mira-1'], messages: [{ id: 'hello', authorId: 'mira', text: 'Want to compare notes tomorrow?', sentAt: now - hour, course }] }],
    projects: [
      { id: 'garden', title: 'Pocket greenhouse', pitch: 'Prototype a sensor dashboard.', ownerId: 'dev', teamIds: ['dev', 'mira'], openRoles: ['Interface design'], capacity: 4, category: 'Personal', createdAt: now - hour },
      { id: 'wave', title: 'Wave atlas', pitch: 'Build an interactive reference for wave patterns.', ownerId: 'noa', teamIds: ['noa', 'you'], openRoles: ['Illustration'], capacity: 2, course: 'PHY 220', createdAt: now - 3 * hour },
    ],
    memberships: [{ userId: 'you', projectId: 'wave', status: 'member' }],
    availability: {
      you: { [course]: [{ date, startMinute: 600, endMinute: 720 }] },
      mira: { [course]: [{ date, startMinute: 660, endMinute: 780 }] },
      dev: { [course]: [{ date, startMinute: 690, endMinute: 750 }] },
    },
    invites: [],
    notifications: [{ id: 'welcome', title: 'Sample workspace', body: 'Explore with fictional classmates.', createdAt: now - hour, read: false, href: '/partners' }],
  }, now);
}

export function makeCanvasFixtures(clock: Clock = Date.now): CanvasItem[] {
  const now = clock();
  const due = (day: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    return date.toISOString();
  };
  const eventDate = new Date(due(5));
  const math = { courseId: 'sample-math', courseName: 'Matrix Methods', courseCode: 'MAT 240' };
  const physics = { courseId: 'sample-physics', courseName: 'Wave Mechanics', courseCode: 'PHY 220' };
  return [
    { ...math, id: 'sample-homework-old', canvasId: 'old', title: 'Vector practice', kind: 'homework', dueDate: due(-2) },
    { ...math, id: 'sample-quiz', canvasId: 'quiz', title: 'Matrix check-in', kind: 'quiz', dueDate: new Date(now + 3_600_000).toISOString() },
    { ...physics, id: 'sample-homework', canvasId: 'hw', title: 'Wave sketches', kind: 'homework', dueDate: due(1) },
    { ...math, id: 'sample-exam', canvasId: 'exam', title: 'Matrix methods exam', kind: 'exam', dueDate: due(3), lockdown: true },
    { ...physics, id: 'sample-event', canvasId: 'event', title: 'Open lab day', kind: 'event', allDayDate: localDayKey(eventDate) },
    { ...physics, id: 'sample-quiz-2', canvasId: 'quiz-2', title: 'Wave review quiz', kind: 'quiz', dueDate: due(6) },
  ];
}
