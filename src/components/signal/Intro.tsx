import personal from "@/data/personal.json";
import projects from "@/data/projects.json";
import { getPhotos } from "@/lib/photos";

// The Signal theme's intro, at the top of the home page. The screen stays
// put while you scroll, and the scroll drives the cloud from one shape to
// the next (../Signal.tsx reads `data-steps` and does the driving); scroll
// back up and it plays backwards. A line of text under the cloud fades in
// for each shape. Past the last one, the site scrolls in underneath.
//
// Everything comes from the data files, so it keeps up by itself. The words
// the cloud spells out are also here as text, for screen readers.
// It only shows while Signal is on and motion is allowed (globals.css).

// How much scrolling each step takes, in screen heights
export const STEP_SCREENS = 2;

interface Step {
  shape: string; // a shape from shapes.ts; "text" spells out `lines`
  lines?: string[];
  caption: string;
}

export default function Intro() {
  const [lead, ...after] = personal.headline.split("—");
  const rest = after.join("—").trim();
  const photos = getPhotos().length;
  // Names only, without asides like "(Legacy)"
  const shown = projects.slice(0, 3).map((p) => p.name.replace(/\s*\(.*\)$/, ""));

  const steps: Step[] = [
    { shape: "entity", caption: "Scroll" },
    { shape: "text", lines: [personal.name, personal.title], caption: personal.location },
    { shape: "text", lines: [lead.trim()], caption: personal.currently },
    { shape: "network", caption: "Real-time and distributed backend systems" },
    { shape: "text", lines: ["Building", shown.join(" · ")], caption: `${projects.length} projects and counting` },
    { shape: "globe", caption: `${rest.charAt(0).toUpperCase()}${rest.slice(1)}` },
    { shape: "monogram", caption: `${photos} frames, a few posts, and the rest below` },
  ];
  const shapes = steps.map((s) => (s.lines ? `text:${s.lines.join("|")}` : s.shape));

  return (
    <section
      className="signal-intro relative"
      aria-label="Introduction"
      data-steps={JSON.stringify(shapes)}
      style={{ height: `${100 + (steps.length - 1) * STEP_SCREENS * 100}svh` }}
    >
      <div className="sticky top-0 h-[100svh]">
        {steps.map((s, i) => (
          <div
            key={i}
            data-caption={i}
            className="absolute inset-x-0 bottom-[13svh] flex flex-col items-center gap-3 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-muted transition-opacity duration-300"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            {s.lines && <p className="sr-only">{s.lines.join(". ")}</p>}
            <p className="max-w-md px-4 leading-relaxed">{s.caption}</p>
            {i === 0 && <span aria-hidden className="signal-scroll-cue mt-1 h-8 w-px bg-accent" />}
          </div>
        ))}
      </div>
      <a
        href="#start"
        className="signal-skip fixed bottom-6 right-6 z-40 rounded-pill border border-line bg-bg/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted backdrop-blur transition-colors hover:border-accent hover:text-accent"
      >
        Skip intro ↓
      </a>
    </section>
  );
}
