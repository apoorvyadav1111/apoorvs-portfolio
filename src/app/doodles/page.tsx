import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Doodles",
  description: "Little things made for fun: nothing to read, just play.",
};

// Each doodle is its own page under /doodles, full screen, with its own
// bundle. Add one here when you make it.
const DOODLES = [
  {
    href: "/doodles/zen",
    name: "Zen",
    about: "The words go and the seasons stay. Watch a slow year turn, stir the leaves with your pointer, rake the snow.",
    art: <ZenArt />,
  },
  {
    href: "/doodles/fetch",
    name: "Fetch",
    about: "A dog in a garden, waiting. Throw a ball, a stick, a frisbee or a bone, and it'll bring it right back.",
    art: <FetchArt />,
  },
];

export default function Doodles() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-20 pb-28 sm:px-6 sm:pt-28">
      <header className="enter mb-14">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Doodles</p>
        <h1 className="mt-4 display text-5xl sm:text-6xl">
          Little things, <span className="em">made for fun</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Nothing to read here. Each one opens full screen; press Esc to come back.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {DOODLES.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            data-reveal
            data-tilt
            className="group flex flex-col overflow-hidden rounded-theme border border-line bg-surface/40 transition-colors hover:border-fg/30 hover:bg-surface"
          >
            <div className="aspect-[16/9] overflow-hidden border-b border-line">{d.art}</div>
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="display text-2xl">{d.name}</h2>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
              </div>
              <p className="mt-2 leading-relaxed text-muted">{d.about}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

// Little pictures of each, in the theme's colours
function ZenArt() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <rect width="320" height="180" fill="var(--bg)" />
      <circle cx="240" cy="48" r="16" fill="var(--sun)" opacity="0.9" />
      <circle cx="248" cy="44" r="14" fill="var(--bg)" />
      {[[40, 30], [90, 60], [150, 25], [200, 70], [280, 90], [120, 90]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="var(--fg)" opacity="0.5" />
      ))}
      <path d="M0 132 Q 80 112 160 126 T 320 122 V180 H0Z" fill="var(--line)" />
      <path d="M0 148 Q 100 132 200 146 T 320 142 V180 H0Z" fill="var(--surface)" />
      {[[70, 70, -0.6], [130, 98, 0.4], [210, 84, -0.2], [180, 120, 0.9]].map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="6" ry="3" fill="var(--accent)" opacity="0.8" transform={`rotate(${(r as number) * 57} ${x} ${y})`} />
      ))}
    </svg>
  );
}

function FetchArt() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <rect width="320" height="180" fill="#8fc46e" />
      {[0, 80, 160, 240].map((x) => (
        <rect key={x} x={x} y="0" width="40" height="180" fill="#9ccd7c" />
      ))}
      <ellipse cx="262" cy="118" rx="42" ry="26" fill="#6fa9c9" />
      <circle cx="30" cy="22" r="34" fill="#6fae58" />
      <path d="M150 92 q 30 -40 70 -36" stroke="#2a1d14" strokeOpacity="0.35" strokeDasharray="3 5" fill="none" strokeWidth="1.5" />
      {/* The dog, from above, heading for the ball */}
      <g transform="translate(130 104) rotate(-40)">
        <path d="M-22 0 q -8 3 -15 10" stroke="#c8913f" strokeWidth="5" strokeLinecap="round" fill="none" />
        <ellipse cx="-2" cy="0" rx="21" ry="11" fill="#c8913f" />
        <circle cx="19" cy="0" r="10" fill="#c8913f" />
        <ellipse cx="27" cy="0" rx="7" ry="5" fill="#c8913f" />
        <circle cx="33" cy="0" r="2.6" fill="#2a1d14" />
        <ellipse cx="14" cy="-10" rx="6" ry="3.5" fill="#9a6a2a" />
        <ellipse cx="14" cy="10" rx="6" ry="3.5" fill="#9a6a2a" />
      </g>
      <circle cx="226" cy="54" r="7" fill="#d8e34a" />
      <ellipse cx="232" cy="66" rx="7" ry="4" fill="#000" opacity="0.15" />
    </svg>
  );
}
