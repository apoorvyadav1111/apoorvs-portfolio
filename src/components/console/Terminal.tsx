"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { complete, execute } from "./commands";
import type { Shell, Tone } from "./commands";
import { loadData } from "./data";
import { pretty } from "./fs";

// The console itself: a small shell in the current theme's colors and mono
// face. Loaded on demand by ConsoleTrigger.tsx; the commands are in commands.ts.
// Scrollback and the working directory survive closing and reopening (until the
// page reloads); history and root survive reloads, for the tab's session.

interface Line {
  id: number;
  text: string;
  tone?: Tone;
  prompt?: string; // a command as typed, after its prompt
  batch: number; // position within its command's output, for the type-in effect
}

let nextId = 0;

// Errors in the accent; highlights in bold, so the two stay apart
const TONES: Record<Tone | "plain", string> = { plain: "", muted: "text-muted", accent: "font-semibold", err: "text-accent" };
const scrollback: { lines: Line[]; cwd: string } = { lines: [], cwd: "/" };

const BANNER = [
  "apsh 1.0 — Apoorv's portfolio shell",
  "Type help to see what it can do. Tab completes, ↑ ↓ walk history, Esc closes.",
];

function readSession<T>(key: string, fallback: T): T {
  try {
    const v = sessionStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

function writeSession(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Keeps the panel inside what's visible above a phone's on-screen keyboard
function useVisibleViewport() {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => setBox({ top: vv.offsetTop, height: vv.height });
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);
  return box;
}

export default function Terminal({ initial, onClose }: { initial: string; onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fresh = useRef(nextId); // lines from before this opening don't type in again
  const [lines, setLines] = useState<Line[]>(() =>
    scrollback.lines.length ? scrollback.lines : BANNER.map((text, i) => ({ id: nextId++, text, tone: i ? "muted" : "accent", batch: i })),
  );
  const [cwd, setCwd] = useState(scrollback.cwd);
  const [value, setValue] = useState(initial);
  const [root, setRootState] = useState(() => readSession("sudo", false));
  const [history, setHistory] = useState<string[]>(() => readSession("console-history", []));
  const [cursor, setCursor] = useState<number | null>(null); // position while walking history
  const draft = useRef("");
  const busy = useRef(false);
  const viewport = useVisibleViewport();

  const user = root ? "root" : "guest";
  const prompt = `${user}@apoorv:${pretty(cwd)}${root ? "#" : "$"}`;

  // Remember the screen for next time it opens
  useEffect(() => {
    scrollback.lines = lines;
    scrollback.cwd = cwd;
  }, [lines, cwd]);

  // Focus the prompt on open, give focus back on close; start fetching content
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const el = input.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
    loadData().catch(() => {});
    return () => before?.focus?.();
  }, []);

  // Follow the output
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  const print = useCallback((text = "", tone?: Tone) => {
    setLines((ls) => {
      const start = ls.length && ls.at(-1)!.prompt === undefined ? ls.at(-1)!.batch + 1 : 0;
      const add = text.split("\n").map((t, i) => ({ id: nextId++, text: t, tone, batch: start + i }));
      return [...ls, ...add];
    });
  }, []);

  const setRoot = (on: boolean) => {
    setRootState(on);
    writeSession("sudo", on || null);
  };

  // What commands get to work with. `history` includes the line being run, as
  // in bash; `run` is for sudo, which runs another command as root.
  const shell = (hist: string[], asRoot = false): Omit<Shell, "args"> => ({
    root: root || asRoot,
    cwd,
    history: hist,
    print,
    cd: setCwd,
    clear: () => setLines([]),
    close: onClose,
    setRoot,
    go: (href) => {
      router.push(href);
      onClose();
    },
    run: (line, r) => execute(line, shell(hist, asRoot || !!r)),
  });

  const submit = async () => {
    if (busy.current) return;
    const line = value;
    setValue("");
    setCursor(null);
    setLines((ls) => [...ls, { id: nextId++, text: line, prompt, batch: 0 }]);
    if (!line.trim()) return;
    const next = [...history.filter((h) => h !== line), line].slice(-100);
    setHistory(next);
    writeSession("console-history", next);
    busy.current = true;
    try {
      await execute(line, shell(next));
    } finally {
      busy.current = false;
    }
  };

  const walk = (step: -1 | 1) => {
    if (!history.length) return;
    if (cursor === null && step === 1) return;
    if (cursor === null) draft.current = value;
    const at = (cursor ?? history.length) + step;
    if (at >= history.length) {
      setCursor(null);
      setValue(draft.current);
      return;
    }
    const clamped = Math.max(0, at);
    setCursor(clamped);
    setValue(history[clamped]);
  };

  const tab = () => {
    const { line, options } = complete(value, cwd);
    setValue(line);
    if (options) {
      setLines((ls) => [...ls, { id: nextId++, text: value, prompt, batch: 0 }]);
      print(options.join("  "), "muted");
    }
  };

  const interrupt = () => {
    setLines((ls) => [...ls, { id: nextId++, text: `${value}^C`, prompt, batch: 0 }]);
    setValue("");
    setCursor(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
    if (e.key === "Tab") {
      e.preventDefault(); // also keeps focus inside the dialog
      if (!e.shiftKey) tab();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      walk(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      walk(1);
    } else if (ctrl && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setLines([]);
    } else if (ctrl && e.key.toLowerCase() === "u") {
      e.preventDefault();
      setValue("");
    } else if (ctrl && e.key.toLowerCase() === "c") {
      // Leave copying a selection alone
      const el = e.currentTarget;
      if (el.selectionStart !== el.selectionEnd || getSelection()?.toString()) return;
      e.preventDefault();
      interrupt();
    }
  };

  // Clicking the output focuses the prompt, unless it's to select text
  const focusPrompt = () => {
    if (!getSelection()?.toString()) input.current?.focus({ preventScroll: true });
  };

  // On-screen keys for phones, which have no Tab or arrows. They act without
  // taking focus, so the keyboard stays up.
  const keys: [string, string, () => void][] = [
    ["tab", "Complete", tab],
    ["↑", "Previous command", () => walk(-1)],
    ["↓", "Next command", () => walk(1)],
    ["^C", "Cancel line", interrupt],
    ["clear", "Clear screen", () => setLines([])],
  ];

  return (
    <div
      className="fixed inset-x-0 top-0 z-[58] flex h-dvh items-start justify-center bg-black/30 p-0 sm:items-center sm:p-6"
      style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.stopPropagation();
          onClose();
        }}
        className="console flex h-full max-h-full w-full flex-col overflow-hidden border-line bg-bg font-mono text-fg shadow-2xl shadow-black/30 sm:h-[min(36rem,100%)] sm:max-w-3xl sm:rounded-theme sm:border"
      >
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2 text-xs text-muted">
          <span aria-hidden className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
          </span>
          <h2 id={titleId} className="flex-1 truncate text-center">
            {user}@apoorv: {pretty(cwd)} — apsh
          </h2>
          <button
            onClick={onClose}
            className="rounded-pill px-2 py-0.5 transition-colors hover:bg-bg hover:text-fg"
            aria-label="Close console"
            tabIndex={-1}
          >
            esc
          </button>
        </div>

        <div
          ref={scroller}
          onClick={focusPrompt}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 text-[13px] leading-relaxed sm:text-sm"
        >
          <div role="log" aria-live="polite" aria-label="Console output" className="whitespace-pre-wrap break-words">
            {lines.map((l) => (
              <div
                key={l.id}
                className={`${l.id >= fresh.current ? "console-line" : ""} ${TONES[l.tone ?? "plain"]}`}
                style={{ "--n": Math.min(l.batch, 40) } as React.CSSProperties}
              >
                {l.prompt !== undefined ? (
                  <>
                    <span className="text-accent">{l.prompt}</span> {l.text}
                  </>
                ) : (
                  l.text || " "
                )}
              </div>
            ))}
          </div>
          <form
            className="flex items-baseline gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor={`${titleId}-in`} className="shrink-0 text-accent">
              {prompt}
            </label>
            <input
              ref={input}
              id={`${titleId}-in`}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setCursor(null);
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-describedby={`${titleId}-hint`}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-fg caret-[var(--accent)] outline-none sm:text-sm"
            />
          </form>
          <p id={`${titleId}-hint`} className="sr-only">
            Type help and press Enter for a list of commands. Escape closes the console.
          </p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2 pointer-fine:hidden">
          {keys.map(([label, name, act]) => (
            <button
              key={label}
              type="button"
              aria-label={name}
              tabIndex={-1}
              onPointerDown={(e) => e.preventDefault()}
              onClick={act}
              className="shrink-0 rounded-pill border border-line px-3 py-1 text-xs text-muted active:bg-surface"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
