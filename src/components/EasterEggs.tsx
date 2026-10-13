"use client";

import { useEffect } from "react";
import { celebrate } from "./celebrate";
import { shuffleLook } from "./AppearanceMenu";

// Little surprises, none of them announced:
//   ↑ ↑ ↓ ↓ ← → ← → B A           a celebration in the current theme's style
//   tap [data-egg="celebrate"] 5×  the same, for touch screens
//   shake the phone                 shuffles the theme and font
//   a minute without input          the page dozes off until you're back
//   the browser console             says hello
// Motion-heavy ones are skipped for visitors who prefer reduced motion.

const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
const IDLE_MS = 60_000;
const SHAKE = 25; // m/s², roughly a firm shake

export default function EasterEggs({ repo }: { repo: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const party = () => !reduce() && celebrate();

    console.log(
      "%c  A Y  %c\n\nHi! Looking under the hood?\nThis site is open source: " + repo + "\n(And try the Konami code.)",
      "font: 700 28px/1.4 ui-monospace, monospace; background: #111; color: #f3e3a8; padding: 4px 12px; border-radius: 4px",
      "font: 13px/1.5 ui-sans-serif, system-ui, sans-serif",
    );

    // Konami code
    let typed = 0;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      typed = key === KONAMI[typed] ? typed + 1 : key === KONAMI[0] ? 1 : 0;
      if (typed === KONAMI.length) {
        typed = 0;
        party();
      }
    };

    // Five quick taps on a marked element
    let taps: number[] = [];
    const onClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('[data-egg="celebrate"]')) return;
      const now = e.timeStamp;
      taps = [...taps.filter((t) => now - t < 2000), now];
      if (taps.length >= 5) {
        taps = [];
        party();
      }
    };

    // Shake to shuffle (Android; iPhones only share motion after a permission prompt)
    let lastShake = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      if (!a || reduce()) return;
      const force = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (force > SHAKE && e.timeStamp - lastShake > 1500) {
        lastShake = e.timeStamp;
        shuffleLook();
      }
    };

    // Dozing off when idle (not while a photo is open full screen)
    let idle = 0;
    const wake = () => {
      if (root.hasAttribute("data-dozing")) root.removeAttribute("data-dozing");
      clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (reduce() || document.querySelector('[aria-modal="true"]')) return wake();
        root.setAttribute("data-dozing", "");
      }, IDLE_MS);
    };
    const activity = ["pointermove", "pointerdown", "keydown", "scroll", "wheel", "touchstart"] as const;

    addEventListener("keydown", onKey);
    addEventListener("click", onClick);
    addEventListener("devicemotion", onMotion);
    activity.forEach((ev) => addEventListener(ev, wake, { passive: true }));
    wake();

    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("click", onClick);
      removeEventListener("devicemotion", onMotion);
      activity.forEach((ev) => removeEventListener(ev, wake));
      clearTimeout(idle);
      root.removeAttribute("data-dozing");
    };
  }, [repo]);

  return (
    // Shown while dozing (see globals.css)
    <div aria-hidden className="doze">
      <span>z</span>
      <span>z</span>
      <span>z</span>
    </div>
  );
}
