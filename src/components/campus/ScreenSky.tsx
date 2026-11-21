import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';

const colors = {
  light: {
    grid: '#EBE3F2',
    white: '#D9CDE4',
    rose: '#D9BFCD',
    gold: '#DDC8A9',
    violet: '#CFC0E3',
  },
  dark: {
    grid: '#151020',
    white: '#D8CEDD',
    rose: '#AD7A8B',
    gold: '#C5A277',
    violet: '#755687',
  },
};

const dot = 'M0 0h2v2H0z';
const point = 'M2 0h1v2h2v1H3v2H2V3H0V2h2z';
const stepped = 'M3 0h1v2h1v1h2v1H5v1H4v2H3V5H2V4H0V3h2V2h1z';

const stars = [
  [26, 38, 'white', dot], [112, 83, 'rose', point], [268, 49, 'violet', dot],
  [380, 121, 'gold', stepped], [509, 57, 'white', dot], [551, 177, 'violet', point],
  [48, 195, 'gold', dot], [199, 222, 'white', stepped], [320, 183, 'rose', dot],
  [440, 267, 'white', point], [81, 343, 'violet', dot], [153, 298, 'gold', point],
  [259, 388, 'white', dot], [358, 319, 'rose', dot], [519, 405, 'gold', dot],
  [29, 468, 'rose', stepped], [136, 529, 'white', dot], [229, 474, 'violet', point],
  [337, 557, 'gold', dot], [469, 483, 'rose', point], [536, 583, 'white', dot],
  [68, 626, 'gold', dot], [186, 609, 'rose', dot], [281, 648, 'white', point],
  [421, 627, 'violet', dot],
] as const;

export function ScreenSky() {
  const id = `screenSky-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const sky = colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}
      aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={`${id}-grid`} width={48} height={48} patternUnits="userSpaceOnUse">
            <Path d="M0 0h48v1H1v47H0z" fill={sky.grid} />
          </Pattern>
          <Pattern id={`${id}-stars`} width={576} height={672} patternUnits="userSpaceOnUse">
            {stars.map(([x, y, color, shape]) =>
              <Path key={x} d={shape} transform={`translate(${x} ${y})`} fill={sky[color]} />)}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}-grid)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}-stars)`} />
      </Svg>
    </View>
  );
}
