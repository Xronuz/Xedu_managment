import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * CURRENT design system — accessibility hook.
 *
 * `true` when the user has enabled "Reduce Motion" (iOS) /
 * "Remove animations" (Android). Every primitive must gate
 * continuous and celebratory motion behind this.
 *
 * Initial value is `false` to avoid a first-render flash; we
 * subscribe after mount and update. Most animations are mount-only
 * and read this synchronously anyway.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    const update = () => AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduce(v));
    update();
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
