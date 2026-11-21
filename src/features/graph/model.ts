import { normalizeCourse, selectDueItems, type DueRange } from '@/shared/selectors';
import type { CampusState, CanvasItem, Id } from '@/shared/types';
import { displayTitle, itemDayKey, kindLabel, urgencyLabel, dayKey, parseDayKey } from '../calendar/model';
import { hueFor } from '../feed/hues';
import {
  courseOrTopic, initials, isKnownContact, personById, projectStatus, sessionStatus, shortDateLabel, type FeedSections, type SectionKey,
} from '../feed/model';

/**
 * Course Galaxy graph derivation. Pure: nodes and links come only from the
 * same section arrays the List view renders (plus the calendar items for the
 * Due Soon range filter). IDs are stable: `<kind>:<entity id>`.
 */

export type NodeShape = 'planet' | 'moon' | 'diamond' | 'canvas' | 'capsule' | 'hexagon';
export type LinkKind = 'cluster' | 'member' | 'author' | 'contact';

export interface NodeBox { left: number; right: number; top: number; bottom: number }

export interface GraphNode {
  id: string;
  shape: NodeShape;
  entityId: Id;
  /** Text drawn inside the silhouette. */
  inner: string;
  /** Primary label under the shape. */
  label: string;
  /** Secondary label line (date, urgency, status). */
  detail?: string;
  /** Planet node id this node belongs to, if any. */
  cluster?: string;
  hue: string;
  /** Half-size of the silhouette (radius, half-diagonal or half-width). */
  size: number;
  /** Collision/touch bounds relative to the center, including labels and diamond corners. */
  box: NodeBox;
  live?: boolean;
  attendees?: number;
  canvasKind?: CanvasItem['kind'];
  /** 0 = most urgent. Used for item-to-planet distance. */
  urgency?: number;
  isYou?: boolean;
  /** Person with no conversation thread: dashed outline and a "New to you" label, no line to You. */
  isNew?: boolean;
  status?: string;
  /** Plain-language description for the accessible node list and details. */
  a11y: string;
}

export interface GraphLink { id: string; source: string; target: string; kind: LinkKind; rest: number; strength: number }

export interface LegendEntry { key: string; shape: NodeShape | 'contact-line' | 'new-outline'; label: string; live?: boolean }

export interface GraphModel { section: SectionKey; nodes: GraphNode[]; links: GraphLink[]; legend: LegendEntry[]; summary: string }

export const SIZES = { planet: 30, moon: 15, diamond: 33, canvas: 16, capsuleHalfWidth: 44, capsuleHalfHeight: 14, hexagon: 25 } as const;
const CHAR = 6.2;
const LINE = 14;

export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function boxFor(shape: NodeShape, size: number, label: string, detail?: string): NodeBox {
  // Planets have a decorative ring 6 pt outside the body; diamonds use their half-diagonal so corners are covered.
  const ring = shape === 'planet' ? 6 : 0;
  const halfW = shape === 'capsule' ? SIZES.capsuleHalfWidth : size + ring;
  const halfH = shape === 'capsule' ? SIZES.capsuleHalfHeight : size + ring;
  const textHalf = (Math.max(label.length, detail?.length ?? 0) * CHAR) / 2 + 2;
  const lines = (label ? 1 : 0) + (detail ? 1 : 0);
  return { left: -Math.max(halfW, textHalf), right: Math.max(halfW, textHalf), top: -halfH, bottom: halfH + (lines ? 4 + lines * LINE : 0) };
}

function makeNode(input: Omit<GraphNode, 'size' | 'box'>): GraphNode {
  const size = input.shape === 'capsule' ? SIZES.capsuleHalfWidth : SIZES[input.shape];
  return { ...input, size, box: boxFor(input.shape, size, input.label, input.detail) };
}

export function shortCode(name: string) {
  const code = name.trim();
  if (code.length <= 7) return code;
  const match = /^([A-Za-z]{2,4})\s*-?\s*(\d{2,4}[A-Za-z]?)/.exec(code);
  if (match) return `${match[1].toUpperCase()} ${match[2]}`;
  return code.split(/\s+/).map(word => word[0]).join('').slice(0, 4).toUpperCase();
}

interface Builder { nodes: Map<string, GraphNode>; links: Map<string, GraphLink> }

function addLink(builder: Builder, source: string, target: string, kind: LinkKind, rest: number, strength = 0.06) {
  const id = `${kind}:${source}>${target}`;
  if (!builder.links.has(id) && builder.nodes.has(source) && builder.nodes.has(target)) builder.links.set(id, { id, source, target, kind, rest, strength });
}

function planet(builder: Builder, key: string, courseNames: Map<string, string>): string {
  const id = `course:${normalizeCourse(key)}`;
  if (!builder.nodes.has(id)) {
    const known = courseNames.get(normalizeCourse(key));
    const name = known ?? (shortCode(key) !== key ? key : undefined);
    builder.nodes.set(id, makeNode({
      id, shape: 'planet', entityId: key, inner: shortCode(key), label: name ? truncate(name, 20) : '', hue: hueFor(normalizeCourse(key)),
      a11y: `Course ${key}${name ? `, ${name}` : ''}`,
    }));
  }
  return id;
}

function person(builder: Builder, state: CampusState, personId: Id, withNewness: boolean): string {
  const id = `person:${personId}`;
  if (!builder.nodes.has(id)) {
    const isYou = personId === state.currentUser.id;
    const user = personById(state, personId);
    const name = isYou ? 'You' : user?.name ?? 'Unknown student';
    const isNew = withNewness && !isYou && !isKnownContact(state, personId);
    const firstName = isYou ? 'You' : name.split(' ')[0];
    builder.nodes.set(id, makeNode({
      id, shape: 'moon', entityId: personId, inner: isYou ? 'You' : initials(user ?? { name }), label: truncate(firstName, 12),
      detail: isNew ? 'New to you' : undefined, hue: isYou ? '#1f5fd6' : '#7b8294', isYou, isNew,
      a11y: isYou ? 'You' : `${name}${withNewness ? (isNew ? ', new to you' : ', in your conversations') : ''}`,
    }));
  }
  return id;
}

function courseNameMap(items: CanvasItem[]) {
  const map = new Map<string, string>();
  for (const item of items) {
    if (item.courseCode) map.set(normalizeCourse(item.courseCode), item.courseName);
  }
  return map;
}

function finish(builder: Builder, section: SectionKey, legend: LegendEntry[], noun: string): GraphModel {
  const nodes = [...builder.nodes.values()];
  const count = (shape: NodeShape) => nodes.filter(node => node.shape === shape).length;
  const planets = count('planet');
  const people = count('moon');
  const items = nodes.length - planets - people;
  const summary = nodes.length
    ? `${planets} ${planets === 1 ? 'course' : 'courses'}, ${items} ${noun}${people ? `, ${people} ${people === 1 ? 'person' : 'people'}` : ''}.`
    : 'Nothing to show in this section yet.';
  return { section, nodes, links: [...builder.links.values()], legend, summary };
}

export interface GraphInput { state: CampusState; sections: FeedSections; items: CanvasItem[]; now: number; dueRange: DueRange }

export function buildGraph(section: SectionKey, input: GraphInput): GraphModel {
  const { state, sections, items, now } = input;
  const builder: Builder = { nodes: new Map(), links: new Map() };
  const names = courseNameMap(items);

  if (section === 'happeningNow' || section === 'comingUp') {
    const live = section === 'happeningNow';
    for (const session of sections[section]) {
      const cluster = planet(builder, courseOrTopic(session), names);
      const id = `session:${session.id}`;
      const status = sessionStatus(state, session, now);
      const date = shortDateLabel(session.startsAt, now);
      const hour = new Date(session.startsAt);
      const time = `${hour.getHours() % 12 || 12}${hour.getMinutes() ? `:${String(hour.getMinutes()).padStart(2, '0')}` : ''} ${hour.getHours() < 12 ? 'AM' : 'PM'}`;
      builder.nodes.set(id, makeNode({
        id, shape: 'diamond', entityId: session.id, cluster, hue: builder.nodes.get(cluster)!.hue,
        inner: String(session.attendeeIds.length), label: truncate(session.title, 18),
        detail: live ? `LIVE · ${session.attendeeIds.length} going` : `${date} ${time}`,
        live, attendees: session.attendeeIds.length,
        status: status.hosting ? 'Hosting' : status.joined ? 'Going' : status.full ? 'Full' : undefined,
        a11y: `${live ? 'Live session' : 'Upcoming session'} ${session.title}, ${courseOrTopic(session)}, ${session.attendeeIds.length} going${live ? '' : `, ${date} at ${time}`}`,
      }));
      addLink(builder, id, cluster, 'cluster', 95, 0.08);
      for (const attendee of session.attendeeIds) addLink(builder, person(builder, state, attendee, false), id, 'member', 58);
    }
    return finish(builder, section, [
      { key: 'planet', shape: 'planet', label: 'Course' },
      { key: 'diamond', shape: 'diamond', label: live ? 'Live session' : 'Upcoming session', live },
      { key: 'moon', shape: 'moon', label: 'Student' },
    ], sections[section].length === 1 ? 'session' : 'sessions');
  }

  if (section === 'dueSoon') {
    const due = selectDueItems(items, now, input.dueRange);
    const today = parseDayKey(dayKey(new Date(now))).getTime();
    for (const item of due) {
      const cluster = planet(builder, item.courseCode ?? item.courseName, names);
      const key = itemDayKey(item);
      const days = key ? Math.max(0, Math.round((parseDayKey(key).getTime() - today) / 86_400_000)) : 6;
      const id = `item:${item.id}`;
      const { title, lockdown } = displayTitle(item);
      const urgency = urgencyLabel(item, now);
      builder.nodes.set(id, makeNode({
        id, shape: 'canvas', entityId: item.id, cluster, hue: builder.nodes.get(cluster)!.hue,
        inner: item.kind === 'quiz' ? 'Q' : item.kind === 'exam' ? 'E' : item.kind === 'homework' ? 'A' : '•',
        label: truncate(title, 18), detail: urgency, canvasKind: item.kind, urgency: days,
        status: lockdown ? 'LockDown' : undefined,
        a11y: `${kindLabel(item.kind)} ${title}, ${item.courseCode ?? item.courseName}, due ${urgency}`,
      }));
      addLink(builder, id, cluster, 'cluster', 62 + Math.min(days, 7) * 16, 0.1);
    }
    return finish(builder, section, [
      { key: 'planet', shape: 'planet', label: 'Course' },
      { key: 'canvas', shape: 'canvas', label: 'Canvas item · closer is sooner' },
    ], due.length === 1 ? 'item' : 'items');
  }

  if (section === 'partnersWanted') {
    const you = person(builder, state, state.currentUser.id, true);
    for (const post of sections.partnersWanted) {
      const cluster = planet(builder, courseOrTopic(post), names);
      const id = `post:${post.id}`;
      const linked = !!state.postToThread[post.id];
      builder.nodes.set(id, makeNode({
        id, shape: 'capsule', entityId: post.id, cluster, hue: builder.nodes.get(cluster)!.hue, inner: truncate(post.title, 13),
        label: '', detail: linked ? 'Connected' : undefined,
        a11y: `Partner post ${post.title}, ${courseOrTopic(post)}, by ${personById(state, post.authorId)?.name ?? 'unknown'}${linked ? ', connected' : ''}`,
      }));
      addLink(builder, id, cluster, 'cluster', 92, 0.08);
      addLink(builder, person(builder, state, post.authorId, true), id, 'author', 62);
    }
    addContactLinks(builder, state, you);
    return finish(builder, section, [
      { key: 'planet', shape: 'planet', label: 'Course' },
      { key: 'capsule', shape: 'capsule', label: 'Partner post' },
      { key: 'moon', shape: 'moon', label: 'Author' },
      { key: 'contact', shape: 'contact-line', label: 'Your conversation' },
      { key: 'new', shape: 'new-outline', label: 'New to you' },
    ], sections.partnersWanted.length === 1 ? 'post' : 'posts');
  }

  const you = person(builder, state, state.currentUser.id, true);
  for (const project of sections.newProjects) {
    const cluster = planet(builder, courseOrTopic(project), names);
    const id = `project:${project.id}`;
    const status = projectStatus(state, project);
    builder.nodes.set(id, makeNode({
      id, shape: 'hexagon', entityId: project.id, cluster, hue: builder.nodes.get(cluster)!.hue,
      inner: `${project.teamIds.length}/${project.capacity}`, label: truncate(project.title, 18),
      detail: status === 'requested' ? 'Requested' : status === 'full' ? 'Team full' : status === 'member' || status === 'owner' ? 'Your team' : undefined,
      status,
      a11y: `Project ${project.title}, ${project.teamIds.length} of ${project.capacity} places filled${status === 'requested' ? ', you requested to join' : ''}`,
    }));
    addLink(builder, id, cluster, 'cluster', 98, 0.08);
    for (const member of new Set([project.ownerId, ...project.teamIds])) addLink(builder, person(builder, state, member, true), id, 'member', 60);
  }
  addContactLinks(builder, state, you);
  return finish(builder, section, [
    { key: 'planet', shape: 'planet', label: 'Course or category' },
    { key: 'hexagon', shape: 'hexagon', label: 'Project' },
    { key: 'moon', shape: 'moon', label: 'Owner or member' },
    { key: 'contact', shape: 'contact-line', label: 'Your conversation' },
    { key: 'new', shape: 'new-outline', label: 'New to you' },
  ], sections.newProjects.length === 1 ? 'project' : 'projects');
}

/** Solid line from You to each person you have a real conversation thread with. */
function addContactLinks(builder: Builder, state: CampusState, you: string) {
  for (const node of builder.nodes.values()) {
    if (node.shape === 'moon' && !node.isYou && !node.isNew) addLink(builder, you, node.id, 'contact', 110, 0.015);
  }
}

/** Direct neighbors of a node, for highlight/dim on selection. */
export function neighbors(model: GraphModel, id: string): Set<string> {
  const result = new Set([id]);
  for (const link of model.links) {
    if (link.source === id) result.add(link.target);
    if (link.target === id) result.add(link.source);
  }
  return result;
}
