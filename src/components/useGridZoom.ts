"use client";

import { useCallback, useEffect, useSyncExternalStore, type RefObject } from "react";
import { flushSync } from "react-dom";

// Desktop gallery density, like zooming in the Photos app: fewer, larger
// photos in their own shapes, or many small square crops.
export const ZOOM_LEVELS = [
  { columns: 2, square: false },
  { columns: 3, square: false },
  { columns: 4, square: false },
  { columns: 6, square: true },
  { columns: 8, square: true },
];
const DEFAULT_LEVEL = 1;
const KEY = "gallery-zoom";
const EVENT = "gallery-zoom-change";

// The level lives outside React so it survives navigation and is shared with
// localStorage; `current` also covers browsers where storage is unavailable.
let current: number | null = null;

function fromStorage() {
  try {
    const v = Number(localStorage.getItem(KEY) ?? NaN);
    if (Number.isInteger(v) && v >= 0 && v < ZOOM_LEVELS.length) return v;
  } catch {}
  return DEFAULT_LEVEL;
}

const read = () => (current ??= fromStorage());

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = fromStorage();
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function zoomBy(delta: number) {
  const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, read() + delta));
  if (next === read()) return;

  const commit = () =>
    flushSync(() => {
      current = next;
      try {
        localStorage.setItem(KEY, String(next));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    });

  // Let the browser animate every photo from its old box to its new one.
  // Hidden tabs can't animate, and a newer zoom aborts an unfinished one;
  // either way the layout still updates, so the rejection is expected.
  const animate =
    "startViewTransition" in document && // missing in older browsers
    document.visibilityState === "visible" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (animate) {
    const transition = document.startViewTransition(commit);
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  } else {
    commit();
  }
}

export function useGridZoom() {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_LEVEL);
}

const pinch = { total: 0, lockedUntil: 0 };

// Trackpad pinches arrive as ctrl+wheel events with small deltas; collect them
// into whole steps, pausing briefly after each so one pinch moves one level.
export function usePinchToResize(ref: RefObject<HTMLElement | null>) {
  const onWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault(); // otherwise the whole page zooms
    const now = performance.now();
    if (now < pinch.lockedUntil) return;
    pinch.total += e.deltaY;
    if (Math.abs(pinch.total) >= 40) {
      zoomBy(Math.sign(pinch.total)); // pinching in (negative) = larger photos
      pinch.total = 0;
      pinch.lockedUntil = now + 400;
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, onWheel]);
}

