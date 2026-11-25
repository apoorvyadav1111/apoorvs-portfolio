"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Flower2, Leaf, Snowflake, Sparkles, Sun, X } from "lucide-react";
import { DEFAULT_THEME, THEMES, currentSeason } from "@/themes";
import type { Season } from "@/themes";
import { forSession, setPalette, setSessionPalette, transition } from "./AppearanceMenu";

// A sneak peek at the showier themes: Signal (the particle cloud) and this
// season's theme (its weather), less whichever one is already on.
// Trying one only lasts the session (like the console's out-of-season
// themes), with "Keep it" to make it stick or "Back" to undo. First-time
// visitors get it until they act on it; anyone who has picked a theme sees
// it only for a few seconds (longer while the pointer's on it). Closing it,
// or keeping a theme, hides it for good.

const SEASON_ICONS: Record<Season, typeof Sun> = { spring: Flower2, summer: Sun, autumn: Leaf, winter: Snowflake };

const DONE = "peek"; // localStorage: "done" once kept or closed
const PEEKING = "peek"; // sessionStorage: the theme being tried
const BRIEF_MS = 8000; // how long it stays for someone who's picked a theme

function read(store: "local" | "session", key: string) {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export default function ThemePeek() {
  const pathname = usePathname();
  // null until mounted (the server can't know), then "offer", a theme id
  // while it's being tried, or "hidden"
  const [state, setState] = useState<string | null>(null);
  // The visitor's own theme, if they've picked one: "Back" returns to it,
  // and the offer only stays briefly
  const [home, setHome] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Mid-peek (after a reload or a new page): straight back to Keep/Back.
    // Otherwise offer it, once the page has landed, unless it was closed
    // before (or the console has put on a theme for the session).
    // `?peek` in the URL shows it regardless.
    const peeking = read("session", PEEKING);
    const resume = peeking && document.documentElement.dataset.palette === peeking;
    const forced = new URLSearchParams(location.search).has("peek");
    if (!resume && !forced && (read("session", "palette") || read("local", DONE) === "done")) return;
    const id = setTimeout(() => {
      setHome(read("local", "palette"));
      setState(resume ? peeking : "offer");
    }, resume ? 0 : 2500);
    return () => clearTimeout(id);
  }, []);

  // Someone with a theme of their own only gets a brief look at the offer
  const brief = state === "offer" && !!home;
  const fadeLater = (ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("hidden"), ms);
  };
  useEffect(() => {
    if (!brief) return;
    fadeLater(BRIEF_MS);
    return () => clearTimeout(timer.current);
  }, [brief]);

  if (!state || state === "hidden" || pathname.startsWith("/doodles")) return null;

  const seasonal = THEMES.find((t) => t.season === currentSeason());
  const SeasonIcon = seasonal?.season ? SEASON_ICONS[seasonal.season] : Sun;
  const all = [
    { id: "signal", label: "Signal", hint: "particles", Icon: Sparkles },
    ...(seasonal ? [{ id: seasonal.id, label: seasonal.name, hint: "weather", Icon: SeasonIcon }] : []),
  ];
  // Nothing to peek at that isn't already on
  const options = state === "offer" ? all.filter((o) => o.id !== (home ?? DEFAULT_THEME)) : all;
  if (!options.length) return null;

  const at = (e: React.MouseEvent) => (e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : undefined);

  const tryOn = (id: string, e: React.MouseEvent) => {
    transition(() => setSessionPalette(id), at(e));
    forSession(PEEKING, id);
    setState(id);
  };
  const back = (e: React.MouseEvent) => {
    transition(() => {
      document.documentElement.setAttribute("data-palette", home ?? DEFAULT_THEME);
      forSession("palette", null);
    }, at(e));
    forSession(PEEKING, null);
    setState("offer");
  };
  const keep = () => {
    setPalette(state);
    forSession(PEEKING, null);
    save(DONE, "done");
    setState("hidden");
  };
  const close = () => {
    save(DONE, "done");
    setState("hidden");
  };

  const trying = options.find((o) => o.id === state);
  const pill = "rounded-pill px-3 py-1.5 transition-colors";

  return (
    <div
      role="region"
      aria-label="Try another theme"
      className="theme-peek rise fixed bottom-5 left-5 z-40 flex max-w-[calc(100vw-2.5rem)] items-center gap-1 rounded-pill border border-line bg-bg/85 p-1 pl-3 font-mono text-[11px] uppercase tracking-[0.15em] text-muted shadow-lg backdrop-blur"
      style={{ animationDuration: "0.4s" }}
      // A brief offer waits while the visitor is on it
      onPointerEnter={() => brief && clearTimeout(timer.current)}
      onPointerLeave={() => brief && fadeLater(3000)}
      onFocus={() => brief && clearTimeout(timer.current)}
    >
      {trying ? (
        <>
          <span className="mr-1 whitespace-nowrap">
            Trying <span className="text-fg">{trying.label}</span>
          </span>
          <button onClick={keep} className={`${pill} bg-accent text-accent-fg hover:opacity-90`}>
            Keep it
          </button>
          <button onClick={back} className={`${pill} hover:text-fg`}>
            Back
          </button>
        </>
      ) : (
        <>
          <span className="mr-1 hidden whitespace-nowrap sm:inline">Sneak peek</span>
          {options.map(({ id, label, hint, Icon }) => (
            <button
              key={id}
              onClick={(e) => tryOn(id, e)}
              title={`Try the ${label} theme (${hint})`}
              className={`${pill} flex items-center gap-1.5 whitespace-nowrap border border-line text-fg hover:border-accent hover:text-accent`}
            >
              <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
              {label}
            </button>
          ))}
          <button onClick={close} aria-label="No thanks" title="No thanks" className="rounded-full p-1.5 hover:text-fg">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
