import type { GraphModel, GraphNode, NodeBox } from './model';

/**
 * Small deterministic force layout (no dependency, no randomness).
 * Planets are anchored; links act as springs; nodes repel; label-aware
 * rectangle collision (including diamond corners and label text) separates
 * boxes; velocities are damped and positions bounded. `step` returns the
 * largest movement so callers can stop the loop once settled.
 */

export interface Point { x: number; y: number }
export type Positions = Record<string, Point>;

interface Body { node: GraphNode; x: number; y: number; vx: number; vy: number; anchor?: Point; pinned: boolean }

export interface Simulation {
  bodies: Map<string, Body>;
  model: GraphModel;
  ticks: number;
  settled: boolean;
}

const BOUND = 900;
const DAMPING = 0.78;
const REPULSION = 1400;
const PADDING = 6;
export const SETTLE_EPSILON = 0.08;
export const MAX_TICKS = 420;

export function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619) >>> 0;
  return value;
}

/** Planet anchors: one in the middle, or evenly spaced on a ring sized to the cluster count. */
export function planetAnchors(planetIds: string[]): Record<string, Point> {
  const sorted = [...planetIds].sort();
  if (sorted.length === 1) return { [sorted[0]]: { x: 0, y: 0 } };
  // A wide, short ellipse that matches a phone-width stage: two clusters sit side by side.
  const radius = 55 + 25 * sorted.length;
  const anchors: Record<string, Point> = {};
  sorted.forEach((id, index) => {
    const angle = Math.PI + (index / sorted.length) * Math.PI * 2;
    anchors[id] = { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius * 0.7) };
  });
  return anchors;
}

export function createSimulation(model: GraphModel, previous: Positions = {}): Simulation {
  const planets = model.nodes.filter(node => node.shape === 'planet').map(node => node.id);
  const anchors = planetAnchors(planets);
  const bodies = new Map<string, Body>();
  for (const node of model.nodes) {
    if (node.shape === 'planet') {
      const anchor = anchors[node.id];
      const start = previous[node.id] ?? anchor;
      bodies.set(node.id, { node, x: start.x, y: start.y, vx: 0, vy: 0, anchor, pinned: false });
    }
  }
  // Non-planets start near the average of the planets they connect to (multi-course people land between clusters).
  const related = new Map<string, Set<string>>();
  const relate = (a: string, b: string) => { related.set(a, (related.get(a) ?? new Set()).add(b)); };
  for (const link of model.links) { relate(link.source, link.target); relate(link.target, link.source); }
  const clusterOf = (id: string, seen = new Set<string>()): string[] => {
    const node = model.nodes.find(item => item.id === id);
    if (!node || seen.has(id)) return [];
    seen.add(id);
    if (node.shape === 'planet') return [id];
    if (node.cluster) return [node.cluster];
    return [...(related.get(id) ?? [])].filter(other => !other.startsWith('person:')).flatMap(other => clusterOf(other, seen));
  };
  for (const node of model.nodes) {
    if (bodies.has(node.id)) continue;
    const kept = previous[node.id];
    if (kept) { bodies.set(node.id, { node, x: kept.x, y: kept.y, vx: 0, vy: 0, pinned: false }); continue; }
    const clusters = clusterOf(node.id);
    const centers = clusters.map(id => bodies.get(id)!).filter(Boolean);
    const cx = centers.length ? centers.reduce((sum, body) => sum + body.x, 0) / centers.length : 0;
    const cy = centers.length ? centers.reduce((sum, body) => sum + body.y, 0) / centers.length : 0;
    const seed = hash(node.id);
    const angle = (seed % 360) * (Math.PI / 180);
    const distance = 70 + (seed % 50);
    bodies.set(node.id, { node, x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance, vx: 0, vy: 0, pinned: false });
  }
  return { bodies, model, ticks: 0, settled: model.nodes.length === 0 };
}

function overlap(a: Body, b: Body) {
  const ab: NodeBox = a.node.box;
  const bb: NodeBox = b.node.box;
  const dx = Math.min(a.x + ab.right, b.x + bb.right) - Math.max(a.x + ab.left, b.x + bb.left) + PADDING;
  const dy = Math.min(a.y + ab.bottom, b.y + bb.bottom) - Math.max(a.y + ab.top, b.y + bb.top) + PADDING;
  return { dx, dy };
}

const mass = (body: Body) => (body.node.shape === 'planet' ? 4 : 1);

/** One integration tick. Returns the largest per-body displacement. */
export function step(sim: Simulation): number {
  const bodies = [...sim.bodies.values()];
  const force = new Map<Body, Point>(bodies.map(body => [body, { x: 0, y: 0 }]));
  const add = (body: Body, x: number, y: number) => { const f = force.get(body)!; f.x += x; f.y += y; };

  for (const body of bodies) {
    if (body.anchor) add(body, (body.anchor.x - body.x) * 0.12, (body.anchor.y - body.y) * 0.12);
    else if (body.node.isYou) add(body, -body.x * 0.004, -body.y * 0.004);
  }
  for (const link of sim.model.links) {
    const a = sim.bodies.get(link.source);
    const b = sim.bodies.get(link.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy) || 0.01;
    const pull = (distance - link.rest) * link.strength;
    add(a, (dx / distance) * pull, (dy / distance) * pull);
    add(b, (-dx / distance) * pull, (-dy / distance) * pull);
  }
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distanceSq = dx * dx + dy * dy;
      if (distanceSq < 0.01) {
        // Deterministic nudge for coincident bodies.
        const angle = ((hash(a.node.id + b.node.id) % 360) * Math.PI) / 180;
        dx = Math.cos(angle); dy = Math.sin(angle); distanceSq = 1;
      }
      if (distanceSq > 200 * 200) continue;
      const distance = Math.sqrt(distanceSq);
      const push = REPULSION / distanceSq;
      add(a, (-dx / distance) * push, (-dy / distance) * push);
      add(b, (dx / distance) * push, (dy / distance) * push);
    }
  }

  const previous = new Map(bodies.map(body => [body, { x: body.x, y: body.y }]));
  for (const body of bodies) {
    if (body.pinned) { body.vx = 0; body.vy = 0; continue; }
    const f = force.get(body)!;
    body.vx = (body.vx + f.x / mass(body)) * DAMPING;
    body.vy = (body.vy + f.y / mass(body)) * DAMPING;
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > 24) { body.vx = (body.vx / speed) * 24; body.vy = (body.vy / speed) * 24; }
    body.x = clamp(body.x + body.vx, -BOUND, BOUND);
    body.y = clamp(body.y + body.vy, -BOUND, BOUND);
  }

  // Label-aware collision: separate overlapping boxes along the shallower axis.
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i];
        const b = bodies[j];
        const { dx, dy } = overlap(a, b);
        if (dx <= 0 || dy <= 0) continue;
        const wa = a.pinned ? 0 : 1 / mass(a);
        const wb = b.pinned ? 0 : 1 / mass(b);
        const total = wa + wb;
        if (!total) continue;
        if (dx < dy) {
          const dir = b.x >= a.x ? 1 : -1;
          a.x -= (dir * dx * wa) / total; b.x += (dir * dx * wb) / total;
        } else {
          const dir = b.y >= a.y ? 1 : -1;
          a.y -= (dir * dy * wa) / total; b.y += (dir * dy * wb) / total;
        }
      }
    }
  }

  // Velocity follows the real displacement (including collision corrections), so pushes are damped too.
  let maxMove = 0;
  for (const body of bodies) {
    const before = previous.get(body)!;
    const moved = { x: body.x - before.x, y: body.y - before.y };
    if (!body.pinned) { body.vx = moved.x * DAMPING; body.vy = moved.y * DAMPING; }
    maxMove = Math.max(maxMove, Math.hypot(moved.x, moved.y));
  }

  sim.ticks += 1;
  sim.settled = maxMove < SETTLE_EPSILON || sim.ticks >= MAX_TICKS;
  return maxMove;
}

/** Run to rest synchronously (reduced motion, tests, first paint). */
export function settle(sim: Simulation, maxTicks = MAX_TICKS) {
  let ticks = 0;
  while (!sim.settled && ticks < maxTicks) { step(sim); ticks += 1; }
  sim.settled = true;
  return sim;
}

export function positionsOf(sim: Simulation): Positions {
  const result: Positions = {};
  for (const [id, body] of sim.bodies) result[id] = { x: Math.round(body.x * 10) / 10, y: Math.round(body.y * 10) / 10 };
  return result;
}

export function pin(sim: Simulation, id: string, point: Point) {
  const body = sim.bodies.get(id);
  if (!body) return;
  body.pinned = true;
  body.x = clamp(point.x, -BOUND, BOUND);
  body.y = clamp(point.y, -BOUND, BOUND);
  sim.ticks = 0;
  sim.settled = false;
}

export function release(sim: Simulation, id: string) {
  const body = sim.bodies.get(id);
  if (!body) return;
  body.pinned = false;
  if (body.anchor) body.anchor = { x: body.x, y: body.y };
  sim.ticks = 0;
  sim.settled = false;
}

export interface Viewport { scale: number; x: number; y: number }
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 2.6;

/** Bounds of all nodes including their outer labels. */
export function contentBounds(model: GraphModel, positions: Positions) {
  let left = Infinity; let right = -Infinity; let top = Infinity; let bottom = -Infinity;
  for (const node of model.nodes) {
    const point = positions[node.id];
    if (!point) continue;
    left = Math.min(left, point.x + node.box.left);
    right = Math.max(right, point.x + node.box.right);
    top = Math.min(top, point.y + node.box.top - (node.live ? 8 : 0));
    bottom = Math.max(bottom, point.y + node.box.bottom);
  }
  if (!Number.isFinite(left)) return { left: -50, right: 50, top: -50, bottom: 50 };
  return { left, right, top, bottom };
}

/** Viewport that fits the whole graph (labels included) into the measured stage. */
export function fitViewport(model: GraphModel, positions: Positions, width: number, height: number, padding = 14): Viewport {
  const bounds = contentBounds(model, positions);
  const contentW = Math.max(1, bounds.right - bounds.left);
  const contentH = Math.max(1, bounds.bottom - bounds.top);
  const scale = clamp(Math.min((width - padding * 2) / contentW, (height - padding * 2) / contentH), 0.01, 1.6);
  return {
    scale,
    x: width / 2 - ((bounds.left + bounds.right) / 2) * scale,
    y: height / 2 - ((bounds.top + bounds.bottom) / 2) * scale,
  };
}

export function toWorld(viewport: Viewport, point: Point): Point {
  return { x: (point.x - viewport.x) / viewport.scale, y: (point.y - viewport.y) / viewport.scale };
}

/** Zoom around a focal point in stage coordinates. */
export function zoomAt(viewport: Viewport, factor: number, focal: Point): Viewport {
  const scale = clamp(viewport.scale * factor, Math.min(MIN_SCALE, viewport.scale), MAX_SCALE);
  const ratio = scale / viewport.scale;
  return { scale, x: focal.x - (focal.x - viewport.x) * ratio, y: focal.y - (focal.y - viewport.y) * ratio };
}

/**
 * Topmost node under a stage point. Touch bounds cover the shape and its
 * labels and never shrink below a 44 pt target on screen.
 */
export function hitTest(model: GraphModel, positions: Positions, viewport: Viewport, stagePoint: Point): string | null {
  const world = toWorld(viewport, stagePoint);
  const minHalf = 22 / viewport.scale;
  let best: { id: string; distance: number } | null = null;
  for (const node of model.nodes) {
    const point = positions[node.id];
    if (!point) continue;
    const box = node.box;
    const left = Math.min(box.left, -minHalf); const right = Math.max(box.right, minHalf);
    const top = Math.min(box.top, -minHalf); const bottom = Math.max(box.bottom, minHalf);
    const dx = world.x - point.x; const dy = world.y - point.y;
    if (dx < left || dx > right || dy < top || dy > bottom) continue;
    const distance = Math.hypot(dx, dy) + (node.shape === 'planet' ? 12 : 0);
    if (!best || distance < best.distance) best = { id: node.id, distance };
  }
  return best?.id ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
