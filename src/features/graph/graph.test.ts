import assert from 'node:assert/strict';
import test from 'node:test';
import { transitionCampus } from '@/shared/mockCampus';
import { makeCampusFixtures, makeCanvasFixtures } from '@/shared/mockData';
import { feedSections, SECTION_ORDER } from '../feed/model';
import { contentBounds, createSimulation, fitViewport, hitTest, positionsOf, settle } from './layout';
import { buildGraph, neighbors, SIZES } from './model';

const now = new Date(2026, 10, 21, 12).getTime();
const input = (state = makeCampusFixtures(() => now), dueRange: 'today' | 'tomorrow' | 'next-seven-days' = 'next-seven-days') => {
  const items = makeCanvasFixtures(() => now);
  return { state, items, now, dueRange, sections: feedSections(state, items, now) };
};

test('graph nodes come from the same section records the list renders', () => {
  const data = input();
  for (const section of SECTION_ORDER) {
    const model = buildGraph(section, data);
    const entityNodes = model.nodes.filter(node => ['diamond', 'capsule', 'hexagon'].includes(node.shape)).map(node => node.entityId);
    if (section === 'dueSoon') continue;
    assert.deepEqual(entityNodes.sort(), data.sections[section].map(item => item.id).sort(), section);
  }
});

test('one node per person, stable IDs, no duplicate links', () => {
  const model = buildGraph('newProjects', input());
  const ids = model.nodes.map(node => node.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.filter(id => id === 'person:mira').length, 1);
  assert.equal(new Set(model.links.map(link => link.id)).size, model.links.length);
  assert.deepEqual(buildGraph('newProjects', input()).nodes.map(node => node.id), ids);
});

test('session diamonds are bigger than student and canvas circles; live diamonds carry the live indicator', () => {
  assert.ok(SIZES.diamond > SIZES.moon && SIZES.diamond > SIZES.canvas);
  const live = buildGraph('happeningNow', input()).nodes.find(node => node.id === 'session:live')!;
  assert.equal(live.live, true);
  assert.match(live.detail!, /^LIVE · 2 going$/);
  const upcoming = buildGraph('comingUp', input()).nodes.find(node => node.id === 'session:upcoming')!;
  assert.ok(!upcoming.live);
  assert.match(upcoming.detail!, /^Today 2 PM$/);
});

test('contacts get a line to You, new-to-you people get no line; project requests never create a connection', () => {
  const data = input();
  const partners = buildGraph('partnersWanted', data);
  const mira = partners.nodes.find(node => node.id === 'person:mira')!;
  const dev = partners.nodes.find(node => node.id === 'person:dev')!;
  assert.equal(mira.isNew, false);
  assert.equal(dev.isNew, true);
  assert.equal(dev.detail, 'New to you');
  assert.ok(partners.links.some(link => link.kind === 'contact' && link.target === 'person:mira'));
  assert.ok(!partners.links.some(link => link.kind === 'contact' && link.target === 'person:dev'));

  const [requested] = transitionCampus(data.state, { type: 'project/request', id: 'garden' }, now, 'r');
  const projects = buildGraph('newProjects', input(requested));
  assert.equal(projects.nodes.find(node => node.id === 'project:garden')!.detail, 'Requested');
  assert.ok(!projects.links.some(link => link.kind === 'contact' && link.target === 'person:dev'));
});

test('Due Soon graph honours Today / Tomorrow / Next 7 days and urgent items sit closer to their planet', () => {
  const today = buildGraph('dueSoon', input(undefined, 'today'));
  assert.deepEqual(today.nodes.filter(node => node.shape === 'canvas').map(node => node.entityId), ['sample-quiz']);
  const tomorrow = buildGraph('dueSoon', input(undefined, 'tomorrow'));
  assert.deepEqual(tomorrow.nodes.filter(node => node.shape === 'canvas').map(node => node.entityId), ['sample-homework']);
  const week = buildGraph('dueSoon', input());
  assert.equal(week.nodes.filter(node => node.shape === 'canvas').length, 4, 'graph may show more than the list preview of three');
  const rest = (id: string) => week.links.find(link => link.source === id)!.rest;
  assert.ok(rest('item:sample-quiz') < rest('item:sample-exam'));
  assert.equal(week.nodes.find(node => node.id === 'item:sample-quiz')!.detail, 'Today');
  assert.equal(week.nodes.find(node => node.id === 'item:sample-homework')!.detail, 'Tomorrow');
});

test('layout is deterministic, bounded, settles, and keeps positions for unchanged IDs', () => {
  const model = buildGraph('happeningNow', input());
  const first = positionsOf(settle(createSimulation(model)));
  const second = positionsOf(settle(createSimulation(model)));
  assert.deepEqual(first, second);
  for (const point of Object.values(first)) assert.ok(Math.abs(point.x) <= 900 && Math.abs(point.y) <= 900);

  const [joined] = transitionCampus(input().state, { type: 'session/join', id: 'live' }, now, 'j');
  const changed = buildGraph('happeningNow', input(joined));
  const sim = createSimulation(changed, first);
  assert.deepEqual(sim.bodies.get('person:mira')!.x, first['person:mira'].x);
  assert.ok(sim.bodies.has('person:you'));
});

test('settled layout has no overlapping label boxes', () => {
  const model = buildGraph('newProjects', input());
  const positions = positionsOf(settle(createSimulation(model)));
  for (let i = 0; i < model.nodes.length; i += 1) {
    for (let j = i + 1; j < model.nodes.length; j += 1) {
      const a = model.nodes[i]; const b = model.nodes[j];
      const pa = positions[a.id]; const pb = positions[b.id];
      const dx = Math.min(pa.x + a.box.right, pb.x + b.box.right) - Math.max(pa.x + a.box.left, pb.x + b.box.left);
      const dy = Math.min(pa.y + a.box.bottom, pb.y + b.box.bottom) - Math.max(pa.y + a.box.top, pb.y + b.box.top);
      assert.ok(dx <= 1 || dy <= 1, `${a.id} overlaps ${b.id}`);
    }
  }
});

test('fit view contains every outer label inside the measured stage; hit testing finds nodes', () => {
  const model = buildGraph('partnersWanted', input());
  const positions = positionsOf(settle(createSimulation(model)));
  const viewport = fitViewport(model, positions, 320, 142);
  const bounds = contentBounds(model, positions);
  assert.ok(bounds.left * viewport.scale + viewport.x >= 0);
  assert.ok(bounds.right * viewport.scale + viewport.x <= 320);
  assert.ok(bounds.top * viewport.scale + viewport.y >= 0);
  assert.ok(bounds.bottom * viewport.scale + viewport.y <= 142);
  const target = positions['post:mira-2'];
  assert.equal(hitTest(model, positions, viewport, { x: target.x * viewport.scale + viewport.x, y: target.y * viewport.scale + viewport.y }), 'post:mira-2');
  assert.equal(hitTest(model, positions, viewport, { x: -500, y: -500 }), null);
});

test('selection neighbors are direct links only', () => {
  const model = buildGraph('happeningNow', input());
  assert.deepEqual([...neighbors(model, 'session:live')].sort(), ['course:MAT 240', 'person:dev', 'person:mira', 'session:live']);
});
