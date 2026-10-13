"use client";

import { useEffect } from "react";

// Page motion, styled per theme in globals.css (each theme's `motion` sets the feel).
//
//   data-reveal         enters the first time it scrolls into view. Elements
//                       arriving together are staggered.
//   data-reveal="<id>"  the same, but remembered: if React re-creates the element
//                       (e.g. the photo grid changing columns), it appears without
//                       playing again.
//   data-tilt           leans toward the mouse, with a spotlight that follows it.
//
// The init script in src/themes sets `data-motion` on <html> unless the visitor
// prefers reduced motion or switched motion off in the console; without it,
// none of this runs, and it starts or stops whenever the console adds or
// removes it. (An attribute, not a class: React owns <html>'s className and
// resets it.)

const MAX_STAGGER = 6;

export default function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    let stop: (() => void) | null = null;
    const sync = () => {
      const on = root.hasAttribute("data-motion");
      if (on && !stop) stop = start(root);
      else if (!on && stop) {
        stop();
        stop = null;
      }
    };
    sync();
    const watcher = new MutationObserver(sync);
    watcher.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      watcher.disconnect();
      stop?.();
    };
  }, []);

  return null;
}

// Sets everything going; returns a function that undoes it
function start(root: HTMLElement) {
  const seen = new Set<string>();

  // Nothing is hidden until this runs (see globals.css), so whatever is
  // already on screen stays put rather than vanishing to replay; only what's
  // further down waits to reveal. Keeps the first paint fast.
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (el.getBoundingClientRect().top >= innerHeight) return;
    el.setAttribute("data-shown", "instant");
    if (el.dataset.reveal) seen.add(el.dataset.reveal);
  });
  root.dataset.motionReady = "";

  const observer = new IntersectionObserver(
    (entries) => {
      const arriving = entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target as HTMLElement)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      arriving.forEach((el, i) => {
        el.style.setProperty("--d", String(Math.min(i, MAX_STAGGER)));
        el.setAttribute("data-shown", "");
        if (el.dataset.reveal) seen.add(el.dataset.reveal);
        observer.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -8% 0px" },
  );

  const track = (el: HTMLElement) => {
    if (el.hasAttribute("data-shown")) return;
    if (el.dataset.reveal && seen.has(el.dataset.reveal)) el.setAttribute("data-shown", "instant");
    else observer.observe(el);
  };
  const watch = (scope: Element | Document) => {
    if (scope instanceof HTMLElement && scope.hasAttribute("data-reveal")) track(scope);
    scope.querySelectorAll<HTMLElement>("[data-reveal]").forEach(track);
  };
  watch(document);

  // Pages and "load more" add elements after the first render.
  // Mutation callbacks run before the next paint, so nothing flashes.
  const mutations = new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach((n) => n instanceof Element && watch(n));
  });
  mutations.observe(document.body, { childList: true, subtree: true });

  // Tilt and spotlight, for mice and trackpads only
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  let current: HTMLElement | null = null;
  const reset = (el: HTMLElement) => {
    el.style.removeProperty("--rx");
    el.style.removeProperty("--ry");
  };
  const onMove = (e: PointerEvent) => {
    if (!fine.matches || e.pointerType !== "mouse") return;
    const el = (e.target as Element).closest<HTMLElement>("[data-tilt]");
    if (current && current !== el) reset(current);
    current = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty("--rx", (x * 2 - 1).toFixed(3));
    el.style.setProperty("--ry", (1 - y * 2).toFixed(3));
  };
  const onLeave = () => {
    if (current) reset(current);
    current = null;
  };
  document.addEventListener("pointermove", onMove, { passive: true });
  root.addEventListener("pointerleave", onLeave);

  return () => {
    observer.disconnect();
    mutations.disconnect();
    document.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerleave", onLeave);
    onLeave();
    delete root.dataset.motionReady;
  };
}
