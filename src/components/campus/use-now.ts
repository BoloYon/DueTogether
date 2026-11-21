import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Current time that refreshes while the screen is focused, so time-based
 * labels (live, ended, time left) stay correct. Pass `clock` in harnesses.
 */
export function useNow(intervalMs = 15_000, clock: () => number = Date.now) {
  const [now, setNow] = useState(clock);
  useFocusEffect(useCallback(() => {
    setNow(clock());
    const timer = setInterval(() => setNow(clock()), intervalMs);
    return () => clearInterval(timer);
  }, [clock, intervalMs]));
  return now;
}
