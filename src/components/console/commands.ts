import { DEFAULT_THEME, FONT_CHOICES, SEASONS, THEMES, availableThemes, currentSeason, realSeason } from "@/themes";
import type { Season } from "@/themes";
import {
  forSession,
  resetLook,
  setFont,
  setMode,
  setPalette,
  setSessionPalette,
  setWeather,
  shuffleLook,
  transition,
} from "../AppearanceMenu";
import type { Mode, Weather } from "../AppearanceMenu";
import { celebrate } from "../celebrate";
import { MIN_SEASON, startTimelapse, stopTimelapse, timelapseStatus } from "@/lib/timelapse";
import { FEATURES, featureOn, setFeature } from "@/lib/features";
import type { Feature } from "@/lib/features";
import { loadData, dataNow } from "./data";
import type { ConsoleData } from "./data";
import { buildTree, lookup, pretty, resolve } from "./fs";
import type { Node } from "./fs";

// apsh: the console's commands. To add one, add an entry to COMMANDS below
// (it shows up in `help` under its group, and Tab completes its name; give it
// `complete` to complete its arguments too).
//
// "root" is a playful unlock, not security: it lets a visitor wear any theme
// in any season, for the session. There's nothing secret behind it.

export type Tone = "muted" | "accent" | "err";

export interface Shell {
  args: string[];
  root: boolean; // root for this command (`sudo <cmd>` or a root session)
  cwd: string;
  history: string[];
  print: (text?: string, tone?: Tone) => void;
  cd: (path: string) => void;
  clear: () => void;
  close: () => void;
  setRoot: (on: boolean) => void;
  go: (href: string) => void; // navigates within the site, closing the console
  run: (line: string, asRoot?: boolean) => Promise<void>;
}

type Group = "Reading" | "Appearance" | "Features" | "Root" | "Shell" | "Fun";

interface Command {
  group: Group;
  usage: string;
  about: string;
  aliases?: string[];
  complete?: (args: string[], cwd: string) => string[];
  run: (sh: Shell) => void | Promise<void>;
}

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let tree: Node | null = null;
async function fs() {
  tree ??= buildTree(await loadData());
  return tree;
}
const fsNow = () => (tree ??= dataNow() && buildTree(dataNow()!));

// Two-column rows, lined up
const table = (rows: [string, string][], pad = 2) => {
  const w = Math.max(...rows.map(([a]) => a.length)) + pad;
  return rows.map(([a, b]) => `  ${a.padEnd(w)}${b}`).join("\n");
};

const SPEEDS: Weather[] = ["off", "slow", "normal", "fast"];
const MODES: Mode[] = ["light", "dark", "system"];
const ALL_FEATURES = [...(Object.keys(FEATURES) as Feature[]), "particles"] as const;
type AnyFeature = (typeof ALL_FEATURES)[number];

const root = () => document.documentElement;
const themeName = (id?: string) => THEMES.find((t) => t.id === id)?.name ?? id ?? DEFAULT_THEME;

function savedMode(): Mode {
  try {
    const m = localStorage.getItem("theme");
    if (m === "light" || m === "dark" || m === "system") return m;
  } catch {}
  return root().dataset.theme === "light" ? "light" : "dark";
}

// Wears a theme. Seasonal ones out of their real season are only kept for the
// tab (only root can pick those), so a visitor's saved choice is never one the
// init script would refuse.
function wear(id: string) {
  const t = THEMES.find((x) => x.id === id)!;
  transition(() => (t.season && t.season !== realSeason() ? setSessionPalette(id) : setPalette(id)));
}

// Previews a season site-wide for the tab and wears its theme
function showSeason(season: Season) {
  forSession("season", season === realSeason() ? null : season);
  wear(THEMES.find((x) => x.season === season)!.id);
}

// Back to the real season, taking off an out-of-season theme for the saved one
function backToCalendar() {
  const real = realSeason();
  forSession("season", null);
  const now = THEMES.find((t) => t.id === root().dataset.palette);
  if (now?.season && now.season !== real) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("palette");
    } catch {}
    const back = availableThemes(real).find((t) => t.id === saved)?.id ?? DEFAULT_THEME;
    transition(() => {
      root().dataset.palette = back;
      forSession("palette", null);
    });
  }
}

function featureState(f: AnyFeature) {
  if (f === "particles") return root().dataset.weather !== "off";
  if (f === "motion") return root().hasAttribute("data-motion");
  return featureOn(f);
}

function toggle(sh: Shell, f: string, on: boolean) {
  if (!(ALL_FEATURES as readonly string[]).includes(f)) {
    sh.print(`${on ? "enable" : "disable"}: no such feature: ${f} (try features)`, "err");
    return;
  }
  if (f === "particles") setWeather(on ? "normal" : "off");
  else if (f === "motion" && on && reduceMotion()) {
    sh.print("motion: your device asks for reduced motion, so it stays off", "err");
    return;
  } else setFeature(f as Feature, on);
  sh.print(`${f} ${on ? "on" : "off"}`, "accent");
}

const pathArgs = (args: string[], cwd: string, dirsOnly = false) => {
  const word = args.at(-1) ?? "";
  const slash = word.lastIndexOf("/");
  const base = word.slice(0, slash + 1);
  const t = fsNow();
  const node = t && lookup(t, resolve(cwd, base || "."));
  return (node?.children ?? [])
    .filter((c) => !dirsOnly || c.dir)
    .map((c) => base + c.name + (c.dir ? "/" : ""));
};

const unknownPath = (cmd: string, arg: string) => `${cmd}: ${arg}: No such file or directory`;

export const COMMANDS: Record<string, Command> = {
  // ---- Reading ----
  whoami: {
    group: "Reading",
    usage: "whoami",
    about: "who you are, and whose site this is",
    run: async (sh) => {
      sh.print(sh.root ? "root" : "guest", "accent");
      if (sh.root) sh.print("(root here is a playful unlock for themes and seasons, not real privileges)", "muted");
      const { personal: p } = await loadData();
      sh.print(`\nYou're visiting ${p.name}'s site: ${p.title}, ${p.location}.\n${p.bio}`);
    },
  },
  about: {
    group: "Reading",
    usage: "about",
    about: "the short version, with links",
    run: async (sh) => sh.print(lookup(await fs(), "/about.txt")!.read!()),
  },
  ls: {
    group: "Reading",
    usage: "ls [-l] [dir]",
    about: "list files (try: ls posts)",
    complete: (a, cwd) => pathArgs(a, cwd),
    run: async (sh) => {
      const long = sh.args.some((a) => a.startsWith("-") && a.includes("l"));
      const targets = sh.args.filter((a) => !a.startsWith("-"));
      const t = await fs();
      for (const arg of targets.length ? targets : ["."]) {
        const node = lookup(t, resolve(sh.cwd, arg));
        if (!node) {
          sh.print(unknownPath("ls", arg), "err");
          continue;
        }
        if (targets.length > 1) sh.print(`${arg}:`, "muted");
        const items = node.dir ? node.children! : [node];
        if (long) items.forEach((c) => sh.print(`${(c.dir ? c.name + "/" : c.name).padEnd(28)} ${c.dir ? `${c.children!.length} items` : (c.note ?? "")}`, c.dir ? "accent" : undefined));
        else {
          const dirs = items.filter((c) => c.dir).map((c) => c.name + "/");
          const files = items.filter((c) => !c.dir).map((c) => c.name);
          if (dirs.length) sh.print(dirs.join("  "), "accent");
          // Long names (posts, reading) go one per line rather than wrapping mid-name
          if (files.length) sh.print(files.join(files.some((f) => f.length > 24) ? "\n" : "  "));
          if (!items.length) sh.print("(empty)", "muted");
        }
      }
    },
  },
  cd: {
    group: "Reading",
    usage: "cd [dir]",
    about: "change directory (cd .. goes up, cd alone goes home)",
    complete: (a, cwd) => pathArgs(a, cwd, true),
    run: async (sh) => {
      const arg = sh.args[0] ?? "~";
      const path = resolve(sh.cwd, arg);
      const node = lookup(await fs(), path);
      if (!node) sh.print(unknownPath("cd", arg), "err");
      else if (!node.dir) sh.print(`cd: not a directory: ${arg}`, "err");
      else sh.cd(path);
    },
  },
  pwd: {
    group: "Reading",
    usage: "pwd",
    about: "where you are",
    run: (sh) => sh.print(sh.cwd),
  },
  cat: {
    group: "Reading",
    usage: "cat <file>…",
    about: "read a post, a reading note, a project or a role",
    aliases: ["less", "more"],
    complete: (a, cwd) => pathArgs(a, cwd),
    run: async (sh) => {
      if (!sh.args.length) return sh.print("usage: cat <file>  (try: ls posts, then cat posts/<name>.md)", "err");
      const t = await fs();
      for (const arg of sh.args) {
        const node = lookup(t, resolve(sh.cwd, arg));
        if (!node) sh.print(unknownPath("cat", arg), "err");
        else if (node.dir) sh.print(`cat: ${arg}: Is a directory`, "err");
        else {
          sh.print(node.read!());
          if (node.href) sh.print(`\n→ open ${arg}`, "muted");
        }
      }
    },
  },
  open: {
    group: "Reading",
    usage: "open <path|url>",
    about: "go there: pages here, links in a new tab",
    complete: (a, cwd) => pathArgs(a, cwd),
    run: async (sh) => {
      const arg = sh.args[0] ?? ".";
      const node = /^https?:\/\//.test(arg) ? null : lookup(await fs(), resolve(sh.cwd, arg));
      // Anything else starting with one slash is taken as a page on this site
      const href = node?.href ?? (/^https?:\/\//.test(arg) ? arg : /^\/(?!\/)/.test(arg) && !node ? arg : null);
      if (!href) return sh.print(node ? `open: nothing to open for ${arg}` : unknownPath("open", arg), "err");
      if (/^https?:\/\//.test(href)) {
        window.open(href, "_blank", "noopener,noreferrer");
        sh.print(`opened ${href} in a new tab`, "muted");
      } else sh.go(href);
    },
  },
  tree: {
    group: "Reading",
    usage: "tree [dir]",
    about: "everything at once",
    complete: (a, cwd) => pathArgs(a, cwd, true),
    run: async (sh) => {
      const arg = sh.args[0] ?? ".";
      const node = lookup(await fs(), resolve(sh.cwd, arg));
      if (!node?.dir) return sh.print(node ? `tree: ${arg}: not a directory` : unknownPath("tree", arg), "err");
      let dirs = 0;
      let files = 0;
      const walk = (n: Node, indent: string) =>
        n.children!.forEach((c, i) => {
          const last = i === n.children!.length - 1;
          sh.print(`${indent}${last ? "└── " : "├── "}${c.name}${c.dir ? "/" : ""}`, c.dir ? "accent" : undefined);
          if (c.dir) {
            dirs++;
            walk(c, indent + (last ? "    " : "│   "));
          } else files++;
        });
      sh.print(arg === "." ? pretty(sh.cwd) : arg, "accent");
      walk(node, "");
      sh.print(`\n${dirs} directories, ${files} files`, "muted");
    },
  },

  // ---- Appearance ----
  theme: {
    group: "Appearance",
    usage: "theme [list|<id>]",
    about: "show or change the theme",
    complete: () => ["list", ...THEMES.map((t) => t.id)],
    run: (sh) => {
      const arg = sh.args[0];
      const season = currentSeason();
      const offered = availableThemes(season);
      if (!arg || arg === "list") {
        const current = root().dataset.palette;
        sh.print(
          THEMES.map((t) => {
            const mark = t.id === current ? "*" : " ";
            const note = !t.season
              ? ""
              : offered.includes(t)
                ? `${t.season} · in season`
                : `${t.season} only${sh.root ? "" : " · sudo to wear it"}`;
            return `${mark} ${t.id.padEnd(10)}${t.name.padEnd(10)}${note}`;
          }).join("\n"),
        );
        return;
      }
      const t = THEMES.find((x) => x.id === arg.toLowerCase());
      if (!t) return sh.print(`theme: no such theme: ${arg} (try theme list)`, "err");
      if (!sh.root && !offered.includes(t))
        return sh.print(`theme: permission denied: ${t.name} is a ${t.season} theme, and it's ${season}. (sudo theme ${t.id})`, "err");
      wear(t.id);
      sh.print(
        `${t.name} on${t.season && t.season !== realSeason() ? " for this tab (out of season)" : ""}`,
        "accent",
      );
    },
  },
  font: {
    group: "Appearance",
    usage: "font [list|<id>]",
    about: "show or change the typeface",
    complete: () => ["list", ...FONT_CHOICES.map((f) => f.id)],
    run: (sh) => {
      const arg = sh.args[0];
      const current = root().dataset.font ?? "theme";
      if (!arg || arg === "list")
        return sh.print(FONT_CHOICES.map((f) => `${f.id === current ? "*" : " "} ${f.id.padEnd(11)}${f.name}`).join("\n"));
      if (!FONT_CHOICES.some((f) => f.id === arg)) return sh.print(`font: no such font: ${arg} (try font list)`, "err");
      transition(() => setFont(arg));
      sh.print(`font: ${arg}`, "accent");
    },
  },
  mode: {
    group: "Appearance",
    usage: "mode [light|dark|system]",
    about: "light or dark",
    complete: () => MODES,
    run: (sh) => {
      const arg = sh.args[0] as Mode | undefined;
      if (!arg) return sh.print(`mode: ${savedMode()} (showing ${root().dataset.theme})`);
      if (!MODES.includes(arg)) return sh.print("usage: mode [light|dark|system]", "err");
      transition(() => setMode(arg));
      sh.print(`mode: ${arg}`, "accent");
    },
  },
  shuffle: {
    group: "Appearance",
    usage: "shuffle",
    about: "a random theme and font",
    run: (sh) => {
      shuffleLook();
      // The new look lands a frame later
      requestAnimationFrame(() =>
        sh.print(`${themeName(root().dataset.palette)} · ${root().dataset.font ?? "theme"} font`, "accent"),
      );
    },
  },
  particles: {
    group: "Appearance",
    usage: "particles [off|slow|normal|fast]",
    about: "seasonal leaves, snow, petals, fireflies",
    complete: () => SPEEDS,
    run: (sh) => {
      const arg = sh.args[0] as Weather | undefined;
      const theme = THEMES.find((t) => t.id === root().dataset.palette);
      const none = !theme?.particles && `(${theme?.name ?? "this theme"} has none; seasonal themes do — try theme list)`;
      if (!arg) {
        sh.print(`particles: ${root().dataset.weather ?? "normal"}`);
        if (none) sh.print(none, "muted");
        return;
      }
      if (!SPEEDS.includes(arg)) return sh.print("usage: particles [off|slow|normal|fast]", "err");
      setWeather(arg);
      sh.print(`particles: ${arg}`, "accent");
      if (none && arg !== "off") sh.print(none, "muted");
    },
  },
  reset: {
    group: "Appearance",
    usage: "reset",
    about: "back to the default look",
    run: (sh) => {
      transition(resetLook);
      sh.print(`reset: ${themeName(DEFAULT_THEME)}, theme font, default mode`, "accent");
    },
  },

  // ---- Features ----
  features: {
    group: "Features",
    usage: "features [<name> on|off]",
    about: "what's on and off",
    complete: (a) => (a.length > 1 ? ["on", "off"] : [...ALL_FEATURES]),
    run: (sh) => {
      const [f, state] = sh.args;
      if (f && (state === "on" || state === "off")) return toggle(sh, f, state === "on");
      if (f) return sh.print("usage: features [<name> on|off]", "err");
      const about: Record<AnyFeature, string> = { ...FEATURES, particles: "seasonal particles (speed: particles)" };
      sh.print(
        table(
          ALL_FEATURES.map((name) => {
            const on = featureState(name);
            const why = name === "motion" && !on && reduceMotion() ? " (reduced motion)" : "";
            return [name, `${on ? "on " : "off"}  ${about[name]}${why}`];
          }),
        ),
      );
      sh.print("\nenable <name> · disable <name> · enable all", "muted");
    },
  },
  enable: {
    group: "Features",
    usage: "enable <feature|all>",
    about: "switch a feature on",
    complete: () => ["all", ...ALL_FEATURES],
    run: (sh) => {
      if (!sh.args[0]) return sh.print("usage: enable <feature|all>", "err");
      const names = sh.args[0] === "all" ? ALL_FEATURES.filter((f) => !featureState(f)) : [sh.args[0]];
      if (!names.length) sh.print("everything's already on", "muted");
      names.forEach((f) => toggle(sh, f, true));
    },
  },
  disable: {
    group: "Features",
    usage: "disable <feature>",
    about: "switch one off (remembered on this device)",
    complete: () => [...ALL_FEATURES],
    run: (sh) => (sh.args[0] ? toggle(sh, sh.args[0], false) : sh.print("usage: disable <feature>", "err")),
  },

  // ---- Root ----
  sudo: {
    group: "Root",
    usage: "sudo su | sudo <cmd>",
    about: "become root (any theme, any season, this tab), or run one command as root",
    complete: () => Object.keys(COMMANDS).filter((c) => c !== "sudo"),
    run: async (sh) => {
      const [first] = sh.args;
      if (!first) return sh.print("usage: sudo su | sudo -i | sudo <command>", "err");
      if (first === "su" || first === "-i" || first === "-s") {
        if (sh.root) return sh.print("you're already root", "muted");
        sh.setRoot(true);
        sh.print("We trust you have received the usual lecture: with great power comes great theming.", "muted");
        sh.print("root: every theme in any season, and `season` to preview one, for this tab.");
        sh.print("(A playful unlock, not real privileges: there's nothing secret here. `exit` to go back.)", "muted");
        return;
      }
      // `sudo !!`: the last command again, as root
      const line = first === "!!" ? (sh.history.at(-2) ?? "") : sh.args.join(" ");
      if (first === "!!") sh.print(line, "muted");
      await sh.run(line, true);
    },
  },
  season: {
    group: "Root",
    usage: "season [<season>|auto]",
    about: "preview spring, summer, autumn or winter site-wide, this tab (root)",
    complete: () => [...SEASONS, "auto"],
    run: (sh) => {
      const arg = sh.args[0];
      const real = realSeason();
      if (!arg) return sh.print(`season: ${currentSeason()}${currentSeason() !== real ? ` (previewing; really ${real})` : ""}`);
      if (!sh.root) return sh.print(`season: permission denied (sudo season ${arg})`, "err");
      if (arg === "auto") {
        stopTimelapse();
        backToCalendar();
        return sh.print(`season: ${real}, by the calendar`, "accent");
      }
      if (!SEASONS.includes(arg as Season)) return sh.print("usage: season [spring|summer|autumn|winter|auto]", "err");
      stopTimelapse();
      showSeason(arg as Season);
      const t = THEMES.find((x) => x.season === arg)!;
      sh.print(`season: ${arg}. ${t.name} is on, and it's the seasonal theme on offer until this tab closes (season auto to stop).`, "accent");
    },
  },
  zen: {
    group: "Fun",
    usage: "zen",
    about: "nothing to read, just the seasons going by (Esc to come back)",
    run: (sh) => sh.go("/doodles/zen"),
  },
  doodles: {
    group: "Fun",
    usage: "doodles",
    about: "little things made for fun: zen, fetch…",
    run: (sh) => sh.go("/doodles"),
  },
  fetch: {
    group: "Fun",
    usage: "fetch",
    about: "a dog, a ball and a park (Esc to come back)",
    run: (sh) => sh.go("/doodles/fetch"),
  },
  timelapse: {
    group: "Root",
    usage: "timelapse [on [seconds]|off]",
    about: "turn the seasons over and over from a seasonal theme, 15–120s each (root; the footer has a once-round version)",
    complete: () => ["on", "off"],
    run: (sh) => {
      const [arg, secs] = sh.args;
      const now = timelapseStatus();
      if (!arg) return sh.print(now.running ? `timelapse: on (${now.loop ? "looping" : "once round"}), ${now.season ?? "starting"}` : "timelapse: off");
      if (!sh.root) return sh.print(`timelapse: permission denied (sudo timelapse ${sh.args.join(" ")})`, "err");
      if (arg === "off") {
        if (!now.running) return sh.print("timelapse: already off", "muted");
        stopTimelapse();
        return sh.print("timelapse: off, back to your own theme.", "accent");
      }
      if (arg !== "on") return sh.print("usage: timelapse [on [seconds]|off]", "err");
      const every = Math.min(120, Math.max(MIN_SEASON, Number(secs) || MIN_SEASON));
      if (!startTimelapse({ every, loop: true }))
        return sh.print("timelapse: needs a seasonal theme to start from (sudo theme harvest, frost, bloom or solstice)", "err");
      sh.print(`timelapse: on. A new season every ${every}s, looping; \`timelapse off\` to stop. Close the console to watch.`, "accent");
    },
  },
  exit: {
    group: "Root",
    usage: "exit",
    about: "leave root, or close the console",
    aliases: ["logout", "quit", ":q", ":wq"],
    run: (sh) => {
      if (!sh.root) return sh.close();
      sh.setRoot(false);
      sh.print("logout (any theme or season you picked stays for this tab)", "muted");
    },
  },
  su: {
    group: "Root",
    usage: "su",
    about: "(try sudo su)",
    run: (sh) => (sh.root ? sh.print("you're already root", "muted") : sh.print("su: Authentication failure (no passwords here; try sudo su)", "err")),
  },

  // ---- Shell ----
  help: {
    group: "Shell",
    usage: "help [command]",
    about: "this list, or more on one command",
    complete: () => Object.keys(COMMANDS),
    run: (sh) => {
      const name = sh.args[0];
      if (name) {
        const c = find(name);
        if (!c) return sh.print(`help: no such command: ${name}`, "err");
        sh.print(c.usage, "accent");
        sh.print(`  ${c.about}${c.aliases ? `\n  also: ${c.aliases.join(", ")}` : ""}`);
        return;
      }
      sh.print("apsh — Apoorv's portfolio shell. Tab completes, ↑ ↓ walk history, Esc closes.", "muted");
      const groups: Group[] = ["Reading", "Appearance", "Features", "Root", "Shell", "Fun"];
      for (const g of groups) {
        sh.print(`\n${g}`, "accent");
        sh.print(
          table(
            Object.values(COMMANDS)
              .filter((c) => c.group === g)
              .map((c) => [c.usage, c.about]),
          ),
        );
      }
      sh.print("\nShortcuts: Ctrl+L clears, Ctrl+C cancels the line, Ctrl+U erases it.", "muted");
    },
  },
  clear: {
    group: "Shell",
    usage: "clear",
    about: "clear the screen (Ctrl+L)",
    aliases: ["cls"],
    run: (sh) => sh.clear(),
  },
  history: {
    group: "Shell",
    usage: "history",
    about: "what you've typed (this tab)",
    run: (sh) => sh.print(sh.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n") || "(empty)"),
  },
  echo: {
    group: "Shell",
    usage: "echo <text>",
    about: "say it back ($USER, $HOME, $PWD, $SHELL work)",
    run: (sh) =>
      sh.print(
        sh.args
          .join(" ")
          .replace(/\$USER\b/g, sh.root ? "root" : "guest")
          .replace(/\$HOME\b/g, "/")
          .replace(/\$PWD\b/g, sh.cwd)
          .replace(/\$SHELL\b/g, "/bin/apsh"),
      ),
  },
  date: {
    group: "Shell",
    usage: "date",
    about: "the time, where you are",
    run: (sh) => sh.print(new Date().toString()),
  },
  uptime: {
    group: "Shell",
    usage: "uptime",
    about: "how long you've been here",
    run: (sh) => {
      const min = Math.floor(performance.now() / 60000);
      const years = new Date().getFullYear() - 2019;
      sh.print(
        `up ${min ? `${min} min` : "less than a minute"} this visit · writing code for a living since 2019 (${years} years) · load average: 0.42 0.37 0.31 (mostly coffee)`,
      );
    },
  },
  neofetch: {
    group: "Shell",
    usage: "neofetch",
    about: "the site, at a glance",
    aliases: ["fastfetch"],
    run: async (sh) => {
      const d: ConsoleData = await loadData();
      // The initials, unless the screen's too narrow to fit them beside the facts
      const art = innerWidth < 480 ? [] : ["    _  __   __", "   /_\\ \\ \\ / /", "  / _ \\ \\ V / ", " /_/ \\_\\ |_|  "];
      const user = `${sh.root ? "root" : "guest"}@apoorv`;
      const theme = THEMES.find((t) => t.id === root().dataset.palette);
      const font = root().dataset.font ?? "theme";
      const info = [
        user,
        "-".repeat(user.length),
        `OS       Next.js 16 · static pages`,
        `Shell    apsh 1.0`,
        `Theme    ${theme?.name ?? "?"} (${root().dataset.theme})`,
        `Font     ${FONT_CHOICES.find((f) => f.id === font)?.name ?? font}`,
        `Season   ${currentSeason()}`,
        `Posts    ${d.posts.length}`,
        `Reading  ${d.reading.length}`,
        `Photos   ${d.photos.length}`,
        `Projects ${d.projects.length}`,
        `Uptime   ${Math.max(1, Math.floor(performance.now() / 60000))} min`,
      ];
      const rows = Math.max(art.length, info.length);
      const out: string[] = [];
      for (let i = 0; i < rows; i++) out.push(`${art.length ? (art[i] ?? "").padEnd(16) : ""}${info[i] ?? ""}`);
      sh.print(out.join("\n"));
    },
  },

  // ---- Fun ----
  konami: {
    group: "Fun",
    usage: "konami",
    about: "the celebration, without the arrow keys",
    aliases: ["party"],
    run: (sh) => {
      if (reduceMotion()) return sh.print("(skipped: your device asks for reduced motion)", "muted");
      celebrate();
      sh.print("↑ ↑ ↓ ↓ ← → ← → B A", "accent");
    },
  },
  make: {
    group: "Fun",
    usage: "make me a sandwich",
    about: "an old classic (xkcd 149)",
    run: (sh) => {
      if (sh.args.join(" ") !== "me a sandwich") return sh.print(`make: *** No rule to make target '${sh.args[0] ?? ""}'.  Stop.`, "err");
      sh.print(sh.root ? "Okay." : "What? Make it yourself.", sh.root ? "accent" : "err");
    },
  },
  rm: {
    group: "Fun",
    usage: "rm …",
    about: "go on, try it",
    run: (sh) =>
      sh.print(
        sh.root
          ? "rm: nice try, root. This site is static files; there's nothing here to delete."
          : `rm: cannot remove '${sh.args.at(-1) ?? ""}': Read-only file system`,
        "err",
      ),
  },
  vim: {
    group: "Fun",
    usage: "vim",
    about: "the only editor here is this prompt",
    aliases: ["vi", "nano", "emacs"],
    run: (sh) => sh.print("You're already in the only editor here. (And :q works.)", "muted"),
  },
};

function find(name: string): Command | undefined {
  return COMMANDS[name] ?? Object.values(COMMANDS).find((c) => c.aliases?.includes(name));
}

const NAMES = () => Object.entries(COMMANDS).flatMap(([n, c]) => [n, ...(c.aliases ?? [])]);

// The closest command to a typo, if any is close
function suggest(word: string) {
  const dist = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  const best = NAMES()
    .map((n) => [n, dist(word, n)] as const)
    .sort((a, b) => a[1] - b[1])[0];
  return best && best[1] <= 2 ? best[0] : null;
}

export async function execute(line: string, sh: Omit<Shell, "args">) {
  const [name, ...args] = line.trim().split(/\s+/);
  if (!name) return;
  const command = find(name);
  if (!command) {
    const near = suggest(name);
    sh.print(`apsh: command not found: ${name}${near ? ` (did you mean ${near}?)` : ""}`, "err");
    return;
  }
  try {
    await command.run({ ...sh, args });
  } catch (e) {
    sh.print(`${name}: ${e instanceof Error ? e.message : "something went wrong"}`, "err");
  }
}

// Tab: the completed line, plus the choices when there's more than one
export function complete(line: string, cwd: string): { line: string; options?: string[] } {
  const words = line.replace(/^\s+/, "").split(/\s+/);
  const prefix = line.slice(0, line.length - words.at(-1)!.length);
  // `sudo <cmd> …` completes like `<cmd> …`
  const skip = words[0] === "sudo" && words.length > 2 ? 1 : 0;
  const [name, ...args] = words.slice(skip);
  const candidates = words.length === 1 ? NAMES() : (find(name)?.complete?.(args, cwd) ?? []);
  const word = words.at(-1)!;
  const matches = [...new Set(candidates.filter((c) => c.startsWith(word)))].sort();
  if (!matches.length) return { line };
  if (matches.length === 1) return { line: prefix + matches[0] + (matches[0].endsWith("/") ? "" : " ") };
  let common = matches[0];
  for (const m of matches) while (!m.startsWith(common)) common = common.slice(0, -1);
  // Choices are shown by name, without the directory they're in, as in bash
  const names = matches.map((m) => m.replace(/^.*\/(?=[^/]+\/?$)/, ""));
  return common.length > word.length ? { line: prefix + common } : { line, options: names };
}
