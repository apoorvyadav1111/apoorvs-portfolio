"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Monitor, Moon, RotateCcw, Shuffle, Sun } from "lucide-react";
import { DEFAULT_THEME, FONT_CHOICES, THEMES } from "@/themes";

// Visitor-facing appearance controls: theme, font and light/dark mode.
// Choices live as attributes on <html> (read by the CSS from themeCss()) and
// in localStorage (restored before first paint by themeInitScript).

type Mode = "light" | "dark" | "system";

interface Appearance {
  palette: string;
  font: string;
  mode: Mode;
  resolved: "light" | "dark";
}

const SERVER_KEY = `${DEFAULT_THEME}|theme|system|light`;

function readKey() {
  const d = document.documentElement;
  let mode: Mode = "system";
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") mode = stored;
  } catch {}
  return `${d.dataset.palette ?? DEFAULT_THEME}|${d.dataset.font ?? "theme"}|${mode}|${d.dataset.theme ?? "light"}`;
}

function subscribe(onChange: () => void) {
  // Any change to <html>'s attributes, from this menu or another tab
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true });
  window.addEventListener("storage", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onChange);
  };
}

function useAppearance(): Appearance {
  const [palette, font, mode, resolved] = useSyncExternalStore(subscribe, readKey, () => SERVER_KEY).split("|");
  return { palette, font, mode: mode as Mode, resolved: resolved as Appearance["resolved"] };
}

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

// Applies a change, revealing the new look as a circle growing out of the
// point the visitor clicked. Falls back to an instant switch.
function transition(update: () => void, origin?: { x: number; y: number }) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("startViewTransition" in document) || reduceMotion || document.visibilityState !== "visible") {
    update();
    return;
  }
  const t = document.startViewTransition(update);
  t.finished.catch(() => {});
  t.ready
    .then(() => {
      const x = origin?.x ?? innerWidth / 2;
      const y = origin?.y ?? 0;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}

function setPalette(id: string) {
  document.documentElement.setAttribute("data-palette", id);
  save("palette", id);
}

function setFont(id: string) {
  if (id === "theme") document.documentElement.removeAttribute("data-font");
  else document.documentElement.setAttribute("data-font", id);
  save("font", id === "theme" ? null : id);
}

function setMode(mode: Mode) {
  save("theme", mode === "system" ? null : mode);
  const resolved = mode === "system" ? (systemDark() ? "dark" : "light") : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

const pointFrom = (e: React.MouseEvent) =>
  e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : undefined;

const MODES: { id: Mode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Monitor },
  { id: "dark", label: "Dark", icon: Moon },
];

export default function AppearanceMenu() {
  const appearance = useAppearance();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Follow the device's light/dark setting live while on "System"
  useEffect(() => {
    if (appearance.mode !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setMode("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance.mode]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shuffle = (e: React.MouseEvent) => {
    const others = (list: string[], current: string) => list.filter((id) => id !== current);
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
    const palette = pick(others(THEMES.map((t) => t.id), appearance.palette));
    const font = pick(others(FONT_CHOICES.map((f) => f.id), appearance.font));
    transition(() => {
      setPalette(palette);
      setFont(font);
    }, pointFrom(e));
  };

  const reset = (e: React.MouseEvent) =>
    transition(() => {
      setPalette(DEFAULT_THEME);
      setFont("theme");
      setMode("system");
      save("palette", null);
    }, pointFrom(e));

  const isDefault =
    appearance.palette === DEFAULT_THEME && appearance.font === "theme" && appearance.mode === "system";

  return (
    <div className="relative ml-1">
      <button
        ref={button}
        onClick={() => setOpen((o) => !o)}
        aria-label="Appearance: theme, font and light or dark mode"
        aria-expanded={open}
        aria-controls={panelId}
        title="Appearance"
        className="flex h-8 items-center gap-1 rounded-pill border border-line px-2 transition-colors hover:border-fg/40 aria-expanded:border-accent"
      >
        {/* The current palette, as three dots: background, text, accent */}
        <span className="h-3 w-3 rounded-full border border-fg/30 bg-bg" />
        <span className="h-3 w-3 rounded-full bg-fg" />
        <span className="h-3 w-3 rounded-full bg-accent" />
      </button>

      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label="Appearance"
          className="rise absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-theme border border-line bg-bg p-5 shadow-2xl shadow-black/20"
          style={{ animationDuration: "0.2s" }}
        >
          <div className="flex items-center justify-between">
            <p className="display text-xl">Appearance</p>
            <button
              onClick={shuffle}
              className="flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <Shuffle className="h-3.5 w-3.5" /> Shuffle
            </button>
          </div>

          <Section label="Theme">
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Theme">
              {THEMES.map((t) => {
                const p = t[appearance.resolved];
                const active = appearance.palette === t.id;
                return (
                  <button
                    key={t.id}
                    role="radio"
                    aria-checked={active}
                    onClick={(e) => transition(() => setPalette(t.id), pointFrom(e))}
                    className="group text-left"
                  >
                    <span
                      className={`flex h-16 flex-col justify-between overflow-hidden border p-2 transition-all group-hover:-translate-y-0.5 ${
                        active ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""
                      }`}
                      style={{
                        background: p.bg,
                        borderColor: p.line,
                        color: p.fg,
                        borderRadius: t.radius,
                      }}
                    >
                      <span
                        className="text-xl leading-none"
                        style={{ fontFamily: t.fonts.display, fontWeight: t.display.weight, letterSpacing: t.display.tracking }}
                      >
                        Aa
                      </span>
                      <span className="h-1.5 w-8" style={{ background: p.accent, borderRadius: t.pill }} />
                    </span>
                    <span className={`mt-1.5 block text-xs ${active ? "text-fg" : "text-muted"}`}>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Font">
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Font">
              {FONT_CHOICES.map((f) => {
                const active = appearance.font === f.id;
                const theme = THEMES.find((t) => t.id === appearance.palette) ?? THEMES[0];
                return (
                  <button
                    key={f.id}
                    role="radio"
                    aria-checked={active}
                    onClick={(e) => transition(() => setFont(f.id), pointFrom(e))}
                    className={`flex items-baseline gap-2 rounded-theme border px-2.5 py-2 text-left transition-colors ${
                      active ? "border-accent bg-accent-soft" : "border-line hover:border-fg/40"
                    } ${f.id === "theme" ? "col-span-2" : ""}`}
                  >
                    <span
                      className="text-lg leading-none"
                      style={{
                        fontFamily: f.display ?? theme.fonts.display,
                        fontWeight: f.weight ?? theme.display.weight,
                      }}
                    >
                      Aa
                    </span>
                    <span className={`text-xs ${active ? "text-fg" : "text-muted"}`}>
                      {f.id === "theme" ? `Theme default · ${theme.name}` : f.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Mode">
            <div className="grid grid-cols-3 rounded-pill border border-line p-0.5" role="radiogroup" aria-label="Color mode">
              {MODES.map(({ id, label, icon: Icon }) => {
                const active = appearance.mode === id;
                return (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={active}
                    onClick={(e) => transition(() => setMode(id), pointFrom(e))}
                    className={`flex items-center justify-center gap-1.5 rounded-pill py-1.5 text-xs transition-colors ${
                      active ? "bg-fg text-bg" : "text-muted hover:text-fg"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                );
              })}
            </div>
          </Section>

          {!isDefault && (
            <button
              onClick={reset}
              className="mt-4 flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
            >
              <RotateCcw className="h-3 w-3" /> Reset to default
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</p>
      {children}
    </div>
  );
}
