/**
 * Mobile vibration / haptic feedback wrapper
 */

export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'medium') {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(20);
        break;
      case 'medium':
        navigator.vibrate(40);
        break;
      case 'success':
        navigator.vibrate([40, 60, 80]);
        break;
      case 'warning':
        navigator.vibrate([100, 50, 100]);
        break;
    }
  } catch {
    // Haptics not supported or permitted
  }
}
