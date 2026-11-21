import { memo } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Circle, Defs, Ellipse, G, RadialGradient, Rect, Stop } from 'react-native-svg';

const themes = {
  light: {
    field: '#F3EDF9', edge: '#C8B4DB', cloud: '#C9A6EC', halo: '#E7B65D',
    stars: '#77549B', orbit: '#9275AF', selection: '#76429D',
    contact: '#895610', link: '#746485', body: '#FFFAFF', moon: '#EDE0F6',
    text: '#241736', secondary: '#534364', surface: '#FBF7FF',
  },
  dark: {
    field: '#151022', edge: '#53416B', cloud: '#5D3088', halo: '#A6573B',
    stars: '#DCBEFF', orbit: '#A883D0', selection: '#FFD078',
    contact: '#FFD078', link: '#AB96C3', body: '#241831', moon: '#302241',
    text: '#F8EFFF', secondary: '#D5C2E9', surface: '#21172F',
  },
};

export function useGalaxyTheme() {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export type GalaxyTheme = ReturnType<typeof useGalaxyTheme>;

// Fixed composition in stage coordinates. Panning the graph leaves the sky still.
function starCoordinate(seed: number) {
  const mixed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  const hash = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 2 ** 32;
}

const stars = Array.from({ length: 74 }, (_, index) => ({
  x: starCoordinate(index + 1),
  y: starCoordinate(index + 201),
  bright: index % 13 === 0,
}));

export const GalaxySky = memo(function GalaxySky({ width, height, theme }: { width: number; height: number; theme: GalaxyTheme }) {
  return <G>
    <Defs>
      <RadialGradient id="violet-cloud" cx="46%" cy="45%" rx="54%" ry="52%">
        <Stop offset="0" stopColor={theme.cloud} stopOpacity={0.8} />
        <Stop offset="1" stopColor={theme.cloud} stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id="amber-cloud" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={theme.halo} stopOpacity={0.45} />
        <Stop offset="1" stopColor={theme.halo} stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id="planet-shade" cx="33%" cy="26%" r="75%">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.14} />
        <Stop offset="0.45" stopColor="#1B0C39" stopOpacity={0.24} />
        <Stop offset="1" stopColor="#130A25" stopOpacity={0.76} />
      </RadialGradient>
    </Defs>
    <Rect width={width} height={height} fill={theme.field} />
    <Rect x={-width * 0.25} y={-height * 0.24} width={width * 1.35} height={height * 1.4} fill="url(#violet-cloud)" />
    <Rect x={width * 0.42} y={height * 0.26} width={width * 0.8} height={height} fill="url(#amber-cloud)" />
    <G transform={`translate(${width * 0.51} ${height * 0.53}) rotate(-16)`}>
      {[0.32, 0.46, 0.61].map(radius => <Ellipse key={radius}
        rx={width * radius} ry={height * radius * 0.58} fill="none"
        stroke={theme.orbit} strokeWidth={1} strokeOpacity={0.17} />)}
    </G>
    {stars.map(({ x, y, bright }) => bright
      ? <Rect key={x} x={width * x} y={height * y} width={2} height={2} fill={theme.stars} opacity={0.54} />
      : <Circle key={x} cx={width * x} cy={height * y} r={0.7} fill={theme.stars} opacity={0.37} />)}
  </G>;
});
