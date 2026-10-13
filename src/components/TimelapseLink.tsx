"use client";

import { useEffect, useState } from "react";
import { startTimelapse, stopTimelapse } from "@/lib/timelapse";
import type { TimelapseStatus } from "@/lib/timelapse";

// "Watch a year go by" in the footer: one round of the seasons at the default
// pace, ending where it began (root's shell can loop it at any pace)
export default function TimelapseLink() {
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const onChange = (e: Event) => setRunning((e as CustomEvent<TimelapseStatus>).detail.running);
    addEventListener("timelapse", onChange);
    return () => removeEventListener("timelapse", onChange);
  }, []);

  return (
    <button
      onClick={() => (running ? stopTimelapse() : startTimelapse())}
      className="underline underline-offset-4 transition-colors hover:text-fg"
    >
      {running ? "Stop the year" : "Watch a year go by ↻"}
    </button>
  );
}
