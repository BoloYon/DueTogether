import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, GestureStateManager, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Svg, { G } from 'react-native-svg';
import { usePalette } from '../feed/palette';
import { IconButton } from '../feed/ui';
import { GalaxySky, useGalaxyTheme } from './galaxy';
import {
  createSimulation, fitViewport, hitTest, pin, positionsOf, release, settle, step, zoomAt,
  type Point, type Positions, type Simulation, type Viewport,
} from './layout';
import type { SectionMemory } from './memory';
import { neighbors, type GraphModel } from './model';
import { LinkLine, NodeShape } from './shapes';

/** Movement (pt) before a touch on a node becomes a drag. */
const DRAG_THRESHOLD = 6;
/** Movement (pt) on empty stage before deciding between graph pan (horizontal) and Feed scroll (vertical). */
const PAN_THRESHOLD = 10;
const PRE_TICKS = 40;
/** Bottom strip kept clear for the zoom/fit controls when fitting. */
const CONTROLS_STRIP = 48;

function signatureOf(model: GraphModel) {
  return `${model.section}|${model.nodes.map(node => `${node.id}:${Math.round(node.box.right - node.box.left)}x${Math.round(node.box.bottom - node.box.top)}`).join(',')}|${model.links.map(link => link.id).join(',')}`;
}

type Touch = { mode: 'idle' | 'pending' | 'drag' | 'pan'; start: Point; abs: Point | null; node: string | null; nodeStart: Point; viewportStart: Viewport | null };

export function GraphStage({ model, summary, memory, onSave, width, height, reducedMotion, focused, selected, onSelect, onInteraction }: {
  model: GraphModel; summary: string; memory: SectionMemory; onSave: (patch: Partial<SectionMemory>) => void;
  width: number; height: number; reducedMotion: boolean; focused: boolean;
  selected: string | null; onSelect: (id: string | null) => void; onInteraction: (active: boolean) => void;
}) {
  const palette = usePalette();
  const theme = useGalaxyTheme();
  const signature = useMemo(() => signatureOf(model), [model]);
  const [positions, setPositions] = useState<Positions>(memory.positions);
  const [viewport, setViewportState] = useState<Viewport | null>(memory.viewport);
  const sim = useRef<Simulation | null>(null);
  const frame = useRef<number | null>(null);
  const positionsRef = useRef<Positions>(memory.positions);
  const viewportRef = useRef<Viewport | null>(memory.viewport);
  const userViewport = useRef(memory.userViewport);
  /** Auto-fit only until the person drags, pans or zooms; after that Fit View is explicit. */
  const autoFit = useRef(!memory.userViewport);
  const touch = useRef<Touch>({ mode: 'idle', start: { x: 0, y: 0 }, abs: null, node: null, nodeStart: { x: 0, y: 0 }, viewportStart: null });
  const live = useRef({ model, width, height, focused, reducedMotion, onSave, onSelect, onInteraction });
  useEffect(() => { live.current = { model, width, height, focused, reducedMotion, onSave, onSelect, onInteraction }; });

  const setViewport = (next: Viewport, byUser: boolean) => {
    viewportRef.current = next;
    userViewport.current = byUser;
    setViewportState(next);
    live.current.onSave({ viewport: next, userViewport: byUser });
  };
  const fit = () => {
    const { model: current, width: w, height: h } = live.current;
    if (w > 0 && h > 0) setViewport(fitViewport(current, positionsRef.current, w, h - CONTROLS_STRIP), false);
  };
  const commit = () => {
    if (!sim.current) return;
    const next = positionsOf(sim.current);
    positionsRef.current = next;
    setPositions(next);
    live.current.onSave({ positions: next });
  };
  const stopLoop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  const startLoop = () => {
    const current = sim.current;
    if (!current || frame.current !== null || !live.current.focused) return;
    if (live.current.reducedMotion) {
      if (touch.current.mode !== 'drag') { settle(current); commit(); if (autoFit.current) fit(); }
      return;
    }
    const tick = () => {
      frame.current = null;
      if (!sim.current || !live.current.focused) return;
      step(sim.current); step(sim.current);
      commit();
      if (sim.current.settled && touch.current.mode !== 'drag') { if (autoFit.current) fit(); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  // Rebuild the simulation when the graph's structure changes, keeping positions for unchanged IDs.
  useEffect(() => {
    stopLoop();
    const next = createSimulation(live.current.model, positionsRef.current);
    sim.current = next;
    if (live.current.reducedMotion) settle(next);
    else for (let index = 0; index < PRE_TICKS && !next.settled; index += 1) step(next);
    commit();
    if (!userViewport.current) fit();
    startLoop();
    return stopLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Keep the loop off while unfocused; settle immediately when Reduce Motion turns on.
  useEffect(() => {
    if (!focused) { stopLoop(); return; }
    startLoop();
    return stopLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, reducedMotion]);

  // Fit to the measured stage when it first becomes known or changes size.
  useEffect(() => {
    if (!userViewport.current || !viewportRef.current) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const endInteraction = () => {
    const state = touch.current;
    if (state.mode === 'drag' && state.node && sim.current) {
      release(sim.current, state.node);
      touch.current = { ...state, mode: 'idle', node: null, abs: null };
      if (live.current.reducedMotion) { settle(sim.current); commit(); } else startLoop();
    } else {
      touch.current = { ...state, mode: 'idle', node: null, abs: null };
    }
    live.current.onInteraction(false);
  };

  // Single-finger gesture with manual activation so it cooperates with the vertical Feed scroll:
  // on a node → drag after a small threshold; on empty stage → horizontal pan, vertical movement fails to the ScrollView.
  const pan = usePanGesture({
    runOnJS: true,
    manualActivation: true,
    maxPointers: 1,
    // Touch-down: absolute start for movement deltas (touch coordinates are window-based on some platforms).
    onTouchesDown: event => {
      const point = event.allTouches[0];
      if (!point) return;
      touch.current = { ...touch.current, mode: 'pending', abs: { x: point.absoluteX, y: point.absoluteY } };
    },
    // Begin: view-relative position for the hit test.
    onBegin: event => {
      if (!viewportRef.current) return;
      const node = hitTest(live.current.model, positionsRef.current, viewportRef.current, { x: event.x, y: event.y });
      touch.current = { ...touch.current, mode: 'pending', start: { x: event.x, y: event.y }, node, nodeStart: node ? positionsRef.current[node] : { x: 0, y: 0 }, viewportStart: viewportRef.current };
    },
    onTouchesMove: event => {
      const state = touch.current;
      const point = event.allTouches[0];
      if (state.mode !== 'pending' || !point || !state.abs) return;
      if (event.numberOfTouches > 1) { GestureStateManager.fail(event.handlerTag); return; }
      const dx = point.absoluteX - state.abs.x;
      const dy = point.absoluteY - state.abs.y;
      if (state.node) {
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) GestureStateManager.activate(event.handlerTag);
      } else if (Math.abs(dx) > PAN_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) {
        GestureStateManager.activate(event.handlerTag);
      } else if (Math.abs(dy) > PAN_THRESHOLD) {
        GestureStateManager.fail(event.handlerTag);
      }
    },
    onActivate: () => {
      const state = touch.current;
      touch.current = { ...state, mode: state.node ? 'drag' : 'pan' };
      autoFit.current = false;
      live.current.onInteraction(true);
      if (state.node) stopLoop();
    },
    onUpdate: event => {
      const state = touch.current;
      const start = state.viewportStart;
      if (!start) return;
      const dx = event.x - state.start.x;
      const dy = event.y - state.start.y;
      if (state.mode === 'pan') {
        setViewport({ ...start, x: start.x + dx, y: start.y + dy }, true);
      } else if (state.mode === 'drag' && state.node && sim.current) {
        const scale = viewportRef.current?.scale ?? start.scale;
        pin(sim.current, state.node, { x: state.nodeStart.x + dx / scale, y: state.nodeStart.y + dy / scale });
        if (!live.current.reducedMotion) { step(sim.current); }
        commit();
      }
    },
    onFinalize: () => endInteraction(),
  });

  const pinchStart = useRef<{ viewport: Viewport; focal: Point } | null>(null);
  const pinch = usePinchGesture({
    runOnJS: true,
    onActivate: event => {
      if (!viewportRef.current) return;
      pinchStart.current = { viewport: viewportRef.current, focal: { x: event.focalX, y: event.focalY } };
      autoFit.current = false;
      live.current.onInteraction(true);
    },
    onUpdate: event => {
      const start = pinchStart.current;
      if (!start) return;
      const zoomed = zoomAt(start.viewport, event.scale, start.focal);
      setViewport({ ...zoomed, x: zoomed.x + event.focalX - start.focal.x, y: zoomed.y + event.focalY - start.focal.y }, true);
    },
    onFinalize: () => { pinchStart.current = null; live.current.onInteraction(false); },
  });

  // Tap selects (or clears) only. It never dispatches Join/Connect/Ask actions.
  const tap = useTapGesture({
    runOnJS: true,
    maxDistance: DRAG_THRESHOLD + 2,
    onActivate: event => {
      if (!viewportRef.current) return;
      live.current.onSelect(hitTest(live.current.model, positionsRef.current, viewportRef.current, { x: event.x, y: event.y }));
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch, tap);

  const zoomBy = (factor: number) => {
    autoFit.current = false;
    if (viewportRef.current) setViewport(zoomAt(viewportRef.current, factor, { x: width / 2, y: height / 2 }), true);
  };

  const highlight = selected && model.nodes.some(node => node.id === selected) ? neighbors(model, selected) : null;
  const byId = new Map(model.nodes.map(node => [node.id, node]));
  const view = viewport ?? { scale: 1, x: width / 2, y: height / 2 };

  return <View style={[styles.stage, { height, backgroundColor: theme.field, borderColor: theme.edge }]}>
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel={summary}>
        {width > 0 && <Svg width={width} height={height}>
          <GalaxySky width={width} height={height} theme={theme} />
          {/* Nested groups make the order explicit: translate the stage, then scale the world. */}
          <G transform={`translate(${view.x}, ${view.y})`}>
          <G transform={`scale(${view.scale})`}>
            {model.links.map(link => {
              const from = positions[link.source];
              const to = positions[link.target];
              if (!from || !to) return null;
              const lit = !!highlight && highlight.has(link.source) && highlight.has(link.target);
              return <LinkLine key={link.id} link={link} from={from} to={to} theme={theme}
                hue={byId.get(link.target)?.hue ?? theme.link} dimmed={!!highlight && !lit} highlighted={lit} />;
            })}
            {model.nodes.map(node => {
              const point = positions[node.id];
              if (!point) return null;
              return <NodeShape key={node.id} node={node} x={point.x} y={point.y} palette={palette} theme={theme}
                selected={node.id === selected} dimmed={!!highlight && !highlight.has(node.id)} />;
            })}
          </G>
          </G>
        </Svg>}
      </View>
    </GestureDetector>
    <View style={[styles.controls, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
      <IconButton icon="plus" label="Zoom in" onPress={() => zoomBy(1.25)} />
      <IconButton icon="minus" label="Zoom out" onPress={() => zoomBy(0.8)} />
      <IconButton icon="fit" label="Fit graph to view" onPress={fit} />
    </View>
  </View>;
}


const styles = StyleSheet.create({
  stage: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  controls: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
});
