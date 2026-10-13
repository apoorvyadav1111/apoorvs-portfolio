"use client";

import { useEffect, useRef, useState } from "react";
import { Flower2, Leaf, Snowflake, Sun, X } from "lucide-react";
import { SEASONS } from "@/themes";
import type { Season } from "@/themes";
import { stopTimelapse, timelapseStatus } from "@/lib/timelapse";
import type { TimelapseStatus } from "@/lib/timelapse";

// While a year goes by (src/lib/timelapse.ts): which season it is, how far
// through it, and a way to stop.

const ICONS: Record<Season, typeof Sun> = { spring: Flower2, summer: Sun, autumn: Leaf, winter: Snowflake };

export default function TimelapseBadge() {
  const [status, setStatus] = useState<TimelapseStatus | null>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onChange = (e: Event) => setStatus((e as CustomEvent<TimelapseStatus>).detail);
    addEventListener("timelapse", onChange);
    return () => removeEventListener("timelapse", onChange);
  }, []);

  // The progress bar follows the clock, not React
  useEffect(() => {
    if (!status?.running) return;
    let frame = 0;
    const tick = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${timelapseStatus().progress()})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status?.running]);

  if (!status?.running) return null;
  const season = status.season;
  const Icon = season ? ICONS[season] : Sun;

  return (
    <div
      role="status"
      className="rise fixed top-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-pill border border-line bg-bg/90 py-1.5 pl-3 pr-1.5 text-xs shadow-lg backdrop-blur"
      style={{ animationDuration: "0.3s" }}
    >
      <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
      <span className="min-w-14 font-medium" aria-live="polite">
        {season ? season[0].toUpperCase() + season.slice(1) : "Here we go"}
      </span>
      {/* The year: one dot per season, the current one lit */}
      <span className="flex gap-1" aria-hidden>
        {SEASONS.map((s) => (
          <span key={s} className={`h-1.5 w-1.5 rounded-full ${s === season ? "bg-accent" : "bg-line"}`} />
        ))}
      </span>
      <span className="relative h-1 w-14 overflow-hidden rounded-full bg-line" aria-hidden>
        <span ref={bar} className="absolute inset-0 origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{status.loop ? "looping" : "a year"}</span>
      <button
        onClick={() => stopTimelapse()}
        aria-label="Stop the timelapse"
        className="grid h-6 w-6 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
