import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { Clock } from '@/shared/types';

/**
 * Current time that refreshes while the screen is focused, so time-based
 * grouping (live → ended, upcoming → live) updates with the Feed open.
 * The ticker stops when the screen loses focus.
 */
export function useFocusedNow(clock: Clock = Date.now, intervalMs = 15_000) {
  const [now, setNow] = useState(clock);
  useFocusEffect(useCallback(() => {
    setNow(clock());
    const timer = setInterval(() => setNow(clock()), intervalMs);
    return () => clearInterval(timer);
  }, [clock, intervalMs]));
  return now;
}

/** System "Reduce Motion" setting, kept live while mounted. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function useScreenReader() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled().then(value => { if (active) setEnabled(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => { active = false; subscription.remove(); };
  }, []);
  return enabled;
}
