"use client";

import { useEffect, useRef, useState } from "react";

// Touch, mouse and trackpad gestures for the full-screen photo viewer:
//   swipe left/right → previous/next     swipe down → close
//   pinch or ctrl+wheel → zoom           double-tap → zoom in/out
//   drag while zoomed → pan
// Built on pointer events, so one code path covers fingers, mice and pens.

interface View {
  x: number;
  y: number;
  scale: number;
}

interface Point {
  x: number;
  y: number;
}

type Gesture =
  | { kind: "pending" | "swipe-x" | "swipe-y" | "pan"; start: Point; view: View; t0: number }
  | { kind: "pinch"; dist: number; mid: Point; view: View }
  | null;

const IDENTITY: View = { x: 0, y: 0, scale: 1 };
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SLOP = 10; // px of movement before a press counts as a drag

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

interface Options {
  canSwipe: boolean;
  onSwipe: (dir: 1 | -1) => void;
  onDismiss: () => void;
}

export function useViewerGestures({ canSwipe, onSwipe, onDismiss }: Options) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(IDENTITY);
  const [dragging, setDragging] = useState(false);

  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture>(null);
  const lastTap = useRef<{ t: number; p: Point } | null>(null);

  const apply = (next: View) => {
    viewRef.current = next;
    setView(next);
  };

  // Points relative to the stage centre, which is the transform origin
  const local = (clientX: number, clientY: number): Point => {
    const r = ref.current!.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  };

  // Keep a zoomed image from being dragged entirely off screen
  const bounded = (v: View): View => {
    if (v.scale <= 1) return IDENTITY;
    const r = ref.current!.getBoundingClientRect();
    const mx = ((v.scale - 1) * r.width) / 2;
    const my = ((v.scale - 1) * r.height) / 2;
    return { scale: v.scale, x: clamp(v.x, -mx, mx), y: clamp(v.y, -my, my) };
  };

  // Scale to `scale` while keeping the content under `focus` in place
  const zoomAround = (from: View, scale: number, focus: Point, focusBefore = focus): View => {
    const s = clamp(scale, 1, MAX_SCALE);
    const qx = (focusBefore.x - from.x) / from.scale;
    const qy = (focusBefore.y - from.y) / from.scale;
    return { scale: s, x: focus.x - s * qx, y: focus.y - s * qy };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    try {
      // Keep receiving moves even if the finger leaves the element
      ref.current!.setPointerCapture(e.pointerId);
    } catch {
      // The pointer can already be gone (e.g. a very fast tap); harmless
    }
    pointers.current.set(e.pointerId, local(e.clientX, e.clientY));
    setDragging(true);

    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      gesture.current = { kind: "pinch", dist: distance(pts[0], pts[1]), mid: midpoint(pts[0], pts[1]), view: viewRef.current };
    } else if (pts.length === 1) {
      const kind = viewRef.current.scale > 1 ? "pan" : "pending";
      gesture.current = { kind, start: pts[0], view: viewRef.current, t0: e.timeStamp };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;

    if (g.kind === "pinch") {
      const pts = [...pointers.current.values()];
      if (pts.length < 2) return;
      const mid = midpoint(pts[0], pts[1]);
      const scale = (g.view.scale * distance(pts[0], pts[1])) / g.dist;
      apply(zoomAround(g.view, scale, mid, g.mid));
      return;
    }

    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;

    if (g.kind === "pending" && Math.hypot(dx, dy) > SLOP) {
      // Lock to one axis so a slightly diagonal swipe doesn't do both
      if (Math.abs(dx) > Math.abs(dy)) g.kind = canSwipe ? "swipe-x" : "pending";
      else if (dy > 0) g.kind = "swipe-y";
    }

    if (g.kind === "swipe-x") apply({ ...IDENTITY, x: dx });
    else if (g.kind === "swipe-y") apply({ ...IDENTITY, y: dy, scale: 1 - Math.min(dy / 2000, 0.15) });
    else if (g.kind === "pan") apply({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;

    if (g?.kind === "pinch") {
      // Lifting one finger of a pinch continues as a pan with the other
      const rest = [...pointers.current.values()];
      const settled = bounded(viewRef.current.scale < 1.05 ? IDENTITY : viewRef.current);
      gesture.current = rest.length ? { kind: "pan", start: rest[0], view: settled, t0: e.timeStamp } : null;
      if (!rest.length) {
        setDragging(false);
        apply(settled);
      }
      return;
    }

    gesture.current = null;
    setDragging(false);
    if (!g) return;

    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;
    const dt = Math.max(e.timeStamp - g.t0, 1);
    const width = ref.current!.getBoundingClientRect().width;

    if (g.kind === "swipe-x") {
      // Far enough, or a quick flick
      if (Math.abs(dx) > width * 0.18 || Math.abs(dx / dt) > 0.5) {
        const dir = dx < 0 ? 1 : -1;
        apply({ ...IDENTITY, x: -dir * width });
        setTimeout(() => onSwipe(dir), 180);
      } else apply(IDENTITY);
    } else if (g.kind === "swipe-y") {
      if (dy > 120 || dy / dt > 0.6) onDismiss();
      else apply(IDENTITY);
    } else if (Math.hypot(dx, dy) < SLOP && dt < 300) {
      // A tap; two in quick succession toggle zoom at that spot
      const prev = lastTap.current;
      if (prev && e.timeStamp - prev.t < 300 && distance(prev.p, p) < 30) {
        lastTap.current = null;
        apply(viewRef.current.scale > 1 ? IDENTITY : bounded(zoomAround(IDENTITY, DOUBLE_TAP_SCALE, p)));
      } else {
        lastTap.current = { t: e.timeStamp, p };
      }
    } else if (g.kind === "pan") {
      apply(bounded(viewRef.current));
    }
  };

  // Trackpad pinch arrives as ctrl+wheel. React's onWheel is passive and can't
  // stop the browser zooming the whole page, so listen natively instead.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const v = viewRef.current;
      if (e.ctrlKey) {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        const focus = { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
        const next = zoomAround(v, v.scale * Math.exp(-e.deltaY * 0.01), focus);
        const settled = next.scale < 1.02 ? IDENTITY : next;
        viewRef.current = settled;
        setView(settled);
      } else if (v.scale > 1) {
        e.preventDefault();
        const mx = ((v.scale - 1) * el.clientWidth) / 2;
        const my = ((v.scale - 1) * el.clientHeight) / 2;
        const next = { scale: v.scale, x: clamp(v.x - e.deltaX, -mx, mx), y: clamp(v.y - e.deltaY, -my, my) };
        viewRef.current = next;
        setView(next);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // How far a swipe-down has gone, 0–1, for fading the backdrop
  const dismissProgress = view.scale <= 1 && view.y > 0 ? Math.min(view.y / 300, 1) : 0;

  return {
    ref,
    zoomed: view.scale > 1,
    dismissProgress,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    style: {
      transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
      transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1)",
    },
  };
}
