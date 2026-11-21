import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Short reveal for expanding content: 8 pt slide + fade over 180 ms, eased, no overshoot.
 * Content shown on first load (`animate` false) and under Reduce Motion appears immediately.
 */
export function Reveal({ children, reducedMotion, animate = true, style }: { children: ReactNode; reducedMotion: boolean; animate?: boolean; style?: StyleProp<ViewStyle> }) {
  const still = reducedMotion || !animate;
  const [progress] = useState(() => new Animated.Value(still ? 1 : 0));
  useEffect(() => {
    if (still) { progress.setValue(1); return; }
    const animation = Animated.timing(progress, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [progress, still]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
