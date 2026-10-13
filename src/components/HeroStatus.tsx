"use client";

import { useSyncExternalStore } from "react";
import { Moon } from "lucide-react";

// The status line above the headline, with two touches that depend on the
// visitor's clock: after midnight it notices they're up late, and around
// sunrise the pulsing dot turns the color of the sun. Five quick taps on it
// set off the same celebration as the Konami code (see EasterEggs.tsx).

const subscribe = () => () => {};
const hour = () => new Date().getHours();

export default function HeroStatus({ text, className }: { text: string; className?: string }) {
  const h = useSyncExternalStore(subscribe, hour, () => -1); // -1 while server-rendering
  const lateNight = h >= 0 && h < 5;
  const sunrise = h >= 5 && h < 8;
  const dot = sunrise ? "bg-[var(--sun)]" : "bg-accent";

  return (
    <p data-egg="celebrate" className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className ?? ""}`}>
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {text}
      {lateNight && (
        <span className="flex items-center gap-1.5 text-accent">
          · <Moon className="h-3 w-3" /> burning the midnight oil
        </span>
      )}
    </p>
  );
}
