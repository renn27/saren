"use client";

/**
 * Lightweight haptic feedback utility for mobile devices (Point 29).
 * Safe for server components and devices without navigator.vibrate.
 */
export type HapticFeedbackType = "light" | "medium" | "heavy" | "success" | "warning" | "selection";

export function triggerHaptic(type: HapticFeedbackType = "light") {
  if (typeof window === "undefined" || !("navigator" in window) || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case "light":
      case "selection":
        navigator.vibrate(12);
        break;
      case "medium":
        navigator.vibrate(20);
        break;
      case "heavy":
        navigator.vibrate(35);
        break;
      case "success":
        navigator.vibrate([10, 30, 15]);
        break;
      case "warning":
        navigator.vibrate([25, 40, 25]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Graceful fallback if device permissions or battery restrictions prevent vibration
  }
}
