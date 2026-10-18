"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { THEMES, currentSeason } from "@/themes";
import { canTimelapse, startTimelapse, stopTimelapse } from "@/lib/timelapse";
import { addToSky } from "@/lib/sky";
import ZenScene from "./ZenScene";
import { wind } from "./wind";

// Zen mode (/zen): the words go, the seasons stay. Hides the header, footer and
// everything else (see [data-zen] in globals.css), lays a landscape under the
// season's particles, and lets a slow timelapse turn the year, a minute a
// season. On a regular theme it borrows this season's, without saving it.
// Esc, or the faint "leave" that appears when you move, goes back.
//
// Everything zen lives in this folder and only loads on /zen. It adds to the
// shared seasonal sky through plug-ins (src/lib/sky.ts): wind.ts is one.
// Game pieces (a watering can, trees…) belong here as more plug-ins, or as
// layers in ZenScene.tsx; the clean-up tools come from the sky itself.
// Whole games get their own page that wraps itself in <ZenMode> (fetch/ is
// one), so each loads only where it's played.

const SEASON_LENGTH = 60;
const HINT_MS = 2500;

export default function ZenMode({
  title = "Zen mode: the seasons, with nothing else on the page.",
  withWind = true,
  other,
  children,
}: {
  title?: string; // for screen readers
  withWind?: boolean; // the pointer's trail and gust; off for games that use the pointer
  other?: { href: string; label: string }; // the other zen page, offered beside "leave"
  children?: React.ReactNode; // a game, drawn over the landscape
}) {
  const router = useRouter();
  const [awake, setAwake] = useState(true);
  const timer = useRef(0);

  useEffect(() => {
    const r = document.documentElement;
    const before = r.dataset.palette;
    r.dataset.zen = "";
    const removeWind = withWind ? addToSky(wind()) : () => {};
    if (!canTimelapse()) r.dataset.palette = THEMES.find((t) => t.season === currentSeason())!.id;
    startTimelapse({ every: SEASON_LENGTH, loop: true });

    // The hint and the pointer fade when you're still, and come back when you move
    const stir = () => {
      setAwake(true);
      r.removeAttribute("data-zen-still");
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setAwake(false);
        r.setAttribute("data-zen-still", "");
      }, HINT_MS);
    };
    stir();
    const leave = () => (history.length > 1 ? router.back() : router.push("/"));
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" ? leave() : stir());
    addEventListener("pointermove", stir, { passive: true });
    addEventListener("pointerdown", stir, { passive: true });
    addEventListener("keydown", onKey);

    return () => {
      clearTimeout(timer.current);
      removeEventListener("pointermove", stir);
      removeEventListener("pointerdown", stir);
      removeEventListener("keydown", onKey);
      removeWind();
      stopTimelapse(false);
      delete r.dataset.zen;
      r.removeAttribute("data-zen-still");
      if (before && r.dataset.palette !== before) r.dataset.palette = before;
    };
  }, [router, withWind]);

  return (
    <div className="zen">
      <h1 className="sr-only">{title} Press Escape to leave.</h1>
      <ZenScene />
      {children}
      <div
        className={`fixed left-4 top-4 z-50 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-opacity duration-700 sm:left-6 sm:top-6 ${
          awake ? "opacity-70" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          onClick={() => (history.length > 1 ? router.back() : router.push("/"))}
          className="rounded-pill px-3 py-1.5 transition-colors hover:text-fg"
        >
          ← leave · esc
        </button>
        {other && (
          <Link href={other.href} replace className="rounded-pill px-3 py-1.5 transition-colors hover:text-fg">
            {other.label} →
          </Link>
        )}
      </div>
    </div>
  );
}
