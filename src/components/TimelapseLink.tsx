"use client";

import { useEffect, useState } from "react";
import { canTimelapse, startTimelapse, stopTimelapse } from "@/lib/timelapse";
import type { TimelapseStatus } from "@/lib/timelapse";

// "Watch a year go by" in the footer: one round of the seasons at the default
// pace, ending where it began (root's shell can loop it at any pace). Only
// offered while a seasonal theme is on.
export default function TimelapseLink() {
  const [running, setRunning] = useState(false);
  const [seasonal, setSeasonal] = useState(false);

  useEffect(() => {
    const onChange = (e: Event) => setRunning((e as CustomEvent<TimelapseStatus>).detail.running);
    const onTheme = () => setSeasonal(canTimelapse());
    onTheme();
    const observer = new MutationObserver(onTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] });
    addEventListener("timelapse", onChange);
    return () => {
      observer.disconnect();
      removeEventListener("timelapse", onChange);
    };
  }, []);

  if (!seasonal && !running) return null;
  return (
    <>
      {" · "}
      <button
      onClick={() => (running ? stopTimelapse() : startTimelapse())}
      className="underline underline-offset-4 transition-colors hover:text-fg"
    >
        {running ? "Stop the year" : "Watch a year go by ↻"}
      </button>
    </>
  );
}
