import { Platform } from 'react-native';
import { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import type { Palette } from '../feed/palette';
import type { GalaxyTheme } from './galaxy';
import type { GraphLink, GraphNode, LegendEntry } from './model';
import { SIZES } from './model';

/** 24×24 single-path type icons drawn inside Canvas item circles. */
const KIND_PATHS: Record<string, string> = {
  quiz: 'M9.6 9.4a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.3M12 17v.2',
  exam: 'M7 4h10v16H7zM9.5 8.5h5M9.5 12h5M9.5 15.5h3',
  homework: 'M14.5 4.5l5 5L9 20H4v-5zM12.5 6.5l5 5',
  event: 'M5 6h14v13H5zM5 10h14M9 4v4M15 4v4',
};

function hexagonPoints(radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index;
    return `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
}

const LABEL_SIZE = 11;
const FONT = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined });

export function NodeShape({ node, x, y, palette, theme, selected, dimmed }: { node: GraphNode; x: number; y: number; palette: Palette; theme: GalaxyTheme; selected: boolean; dimmed: boolean }) {
  const halfH = node.shape === 'capsule' ? SIZES.capsuleHalfHeight : node.size;
  const labelY = halfH + 4 + LABEL_SIZE;
  const ring = selected ? theme.selection : undefined;
  let body;
  switch (node.shape) {
    case 'planet':
      body = <>
        <Circle r={node.size + 6} fill={node.hue} fillOpacity={0.18} />
        <Ellipse rx={node.size + 5} ry={node.size * 0.42} transform="rotate(-24)"
          fill="none" stroke={theme.orbit} strokeWidth={1.5} />
        <Circle r={node.size} fill={node.hue} />
        <Circle r={node.size} fill="url(#planet-shade)" stroke={ring ?? theme.orbit} strokeWidth={ring ? 3 : 1.2} />
        <Path d={`M${-node.size - 5},0 A${node.size + 5},${node.size * 0.42} 0 0 0 ${node.size + 5},0`}
          transform="rotate(-24)" fill="none" stroke={theme.orbit} strokeWidth={1.5} />
        <SvgText fontFamily={FONT} y={4} fontSize={11.5} fontWeight="800" fill="#ffffff" textAnchor="middle">{node.inner}</SvgText>
      </>;
      break;
    case 'diamond': {
      const side = node.size * Math.SQRT2;
      body = <>
        <Rect x={-side / 2} y={-side / 2} width={side} height={side} rx={7} transform="rotate(45)"
          fill={theme.body} stroke={ring ?? (node.live ? palette.live : node.hue)} strokeWidth={ring ? 3.5 : 2.5} />
        <SvgText fontFamily={FONT} y={5} fontSize={14} fontWeight="800" fill={theme.text} textAnchor="middle">{node.inner}</SvgText>
        {node.live && <Circle cx={0} cy={-node.size} r={6.5} fill={palette.live} stroke={theme.body} strokeWidth={2} />}
      </>;
      break;
    }
    case 'moon':
      body = <>
        <Circle r={node.size} fill={node.isYou ? palette.accent : theme.moon}
          stroke={ring ?? (node.isYou ? palette.accent : theme.secondary)} strokeWidth={ring ? 3 : node.isNew ? 1.8 : 1.4}
          strokeDasharray={node.isNew && !ring ? '3.5 3' : undefined} />
        <SvgText fontFamily={FONT} y={3.8} fontSize={node.isYou ? 9.5 : 10.5} fontWeight="700" fill={node.isYou ? palette.accentText : palette.text} textAnchor="middle">{node.inner}</SvgText>
      </>;
      break;
    case 'canvas':
      body = <>
        <Circle r={node.size} fill={theme.body} stroke={ring ?? node.hue} strokeWidth={ring ? 3 : 2} />
        <G transform="translate(-9 -9) scale(0.75)">
          <Path d={KIND_PATHS[node.canvasKind ?? 'homework']} stroke={theme.text} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </>;
      break;
    case 'capsule':
      body = <>
        <Rect x={-SIZES.capsuleHalfWidth} y={-SIZES.capsuleHalfHeight} width={SIZES.capsuleHalfWidth * 2} height={SIZES.capsuleHalfHeight * 2} rx={SIZES.capsuleHalfHeight}
          fill={theme.body} stroke={ring ?? node.hue} strokeWidth={ring ? 3 : 1.8} />
        <SvgText fontFamily={FONT} y={4} fontSize={10.5} fontWeight="600" fill={theme.text} textAnchor="middle">{node.inner}</SvgText>
      </>;
      break;
    case 'hexagon':
      body = <>
        <Polygon points={hexagonPoints(node.size - 2)} fill={theme.body} stroke={ring ?? node.hue} strokeWidth={ring ? 4 : 3} strokeLinejoin="round" />
        <SvgText fontFamily={FONT} y={4} fontSize={11} fontWeight="700" fill={theme.text} textAnchor="middle">{node.inner}</SvgText>
      </>;
      break;
  }
  const detailColor = node.live ? palette.live : node.isNew ? palette.warning : node.detail === 'Requested' ? palette.warning : theme.secondary;
  return <G transform={`translate(${x} ${y})`} opacity={dimmed ? 0.42 : 1}>
    {body}
    {node.label ? <SvgText fontFamily={FONT} y={labelY} fontSize={LABEL_SIZE} fontWeight="600" fill={theme.text} textAnchor="middle">{node.label}</SvgText> : null}
    {node.detail ? <SvgText fontFamily={FONT} y={node.label ? labelY + 13 : labelY} fontSize={10} fontWeight={node.live ? '800' : '600'} fill={detailColor} textAnchor="middle">{node.detail}</SvgText> : null}
  </G>;
}

export function LinkLine({ link, from, to, theme, hue, dimmed, highlighted }: {
  link: GraphLink; from: { x: number; y: number }; to: { x: number; y: number }; theme: GalaxyTheme; hue: string; dimmed: boolean; highlighted: boolean;
}) {
  const contact = link.kind === 'contact';
  const color = contact ? theme.contact : link.kind === 'cluster' ? hue : theme.link;
  const width = contact ? 2.6 : link.kind === 'cluster' ? 1.6 : 1.2;
  return <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={highlighted ? width + 1 : width}
    strokeOpacity={dimmed ? 0.12 : contact ? 0.9 : link.kind === 'cluster' ? 0.55 : 0.75} strokeLinecap="round" />;
}

/** Tiny glyph for the legend. */
export function LegendGlyph({ entry, palette, theme }: { entry: LegendEntry; palette: Palette; theme: GalaxyTheme }) {
  const c = 10;
  switch (entry.shape) {
    case 'planet': return <G>
      <Circle cx={c} cy={c} r={6} fill={theme.secondary} />
      <Ellipse cx={c} cy={c} rx={9} ry={3.5} transform="rotate(-24 10 10)" fill="none" stroke={theme.orbit} strokeWidth={1.5} />
    </G>;
    case 'diamond': return <G>
      <Rect x={c - 5.5} y={c - 5.5} width={11} height={11} rx={2.5} transform={`rotate(45 ${c} ${c})`} fill={palette.card} stroke={entry.live ? palette.live : palette.textSecondary} strokeWidth={1.8} />
      {entry.live && <Circle cx={c} cy={c - 7.5} r={2.8} fill={palette.live} />}
    </G>;
    case 'moon': return <Circle cx={c} cy={c} r={5.5} fill={palette.backgroundElement} stroke={palette.textSecondary} strokeWidth={1.4} />;
    case 'canvas': return <Circle cx={c} cy={c} r={6} fill={palette.card} stroke={palette.accent} strokeWidth={1.8} />;
    case 'capsule': return <Rect x={2} y={c - 5} width={16} height={10} rx={5} fill={palette.card} stroke={palette.textSecondary} strokeWidth={1.5} />;
    case 'hexagon': return <Polygon points={hexagonPoints(7).split(' ').map(point => { const [x, y] = point.split(',').map(Number); return `${x + c},${y + c}`; }).join(' ')} fill={palette.card} stroke={palette.textSecondary} strokeWidth={1.8} strokeLinejoin="round" />;
    case 'contact-line': return <Line x1={1} y1={c} x2={19} y2={c} stroke={theme.contact} strokeWidth={2.6} strokeLinecap="round" />;
    case 'new-outline': return <Circle cx={c} cy={c} r={6} fill="none" stroke={palette.textSecondary} strokeWidth={1.6} strokeDasharray="2.5 2" />;
  }
}
