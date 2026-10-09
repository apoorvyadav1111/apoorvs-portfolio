"use client";

import { useRef } from "react";
import { X } from "lucide-react";

// Who made what: words/photos, the site, and the typefaces and tools it uses.
// None of these require a visible credit; this is a courtesy, kept in a
// dialog rather than a page of its own.

const SECTIONS: { title: string; items: { name: string; by: string; href: string; note?: string }[] }[] = [
  {
    title: "Typefaces",
    items: [
      { name: "Bricolage Grotesque", by: "Mathieu Triay", href: "https://fonts.google.com/specimen/Bricolage+Grotesque" },
      { name: "Instrument Sans", by: "Instrument", href: "https://fonts.google.com/specimen/Instrument+Sans" },
      { name: "JetBrains Mono", by: "JetBrains", href: "https://www.jetbrains.com/lp/mono/" },
      { name: "Space Grotesk", by: "Florian Karsten", href: "https://fonts.google.com/specimen/Space+Grotesk" },
      { name: "DM Sans and Space Mono", by: "Colophon Foundry", href: "https://fonts.google.com/specimen/DM+Sans" },
      { name: "Archivo", by: "Omnibus-Type", href: "https://fonts.google.com/specimen/Archivo" },
      { name: "Inter", by: "Rasmus Andersson", href: "https://rsms.me/inter/" },
      { name: "IBM Plex Mono", by: "IBM", href: "https://www.ibm.com/plex/" },
      { name: "Fraunces", by: "Undercase Type", href: "https://fonts.google.com/specimen/Fraunces" },
      { name: "Source Serif 4", by: "Adobe", href: "https://fonts.google.com/specimen/Source+Serif+4" },
      { name: "Atkinson Hyperlegible", by: "Braille Institute", href: "https://www.brailleinstitute.org/freefont/" },
      { name: "Kode Mono", by: "Isa Ozler", href: "https://github.com/isaozler/kode-mono", note: "favicon" },
    ],
  },
  {
    title: "Globe",
    items: [
      { name: "Natural Earth", by: "public domain", href: "https://www.naturalearthdata.com/", note: "world map" },
      { name: "world-atlas", by: "Mike Bostock", href: "https://github.com/topojson/world-atlas", note: "map data" },
      { name: "topojson-client", by: "Mike Bostock", href: "https://github.com/topojson/topojson-client", note: "reads the map" },
      { name: "Solar calculations", by: "NOAA", href: "https://gml.noaa.gov/grad/solcalc/", note: "sun position" },
    ],
  },
  {
    title: "Tools & libraries",
    items: [
      { name: "Next.js", by: "Vercel", href: "https://nextjs.org" },
      { name: "React", by: "Meta", href: "https://react.dev" },
      { name: "Tailwind CSS", by: "Tailwind Labs", href: "https://tailwindcss.com" },
      { name: "Lucide", by: "Lucide contributors", href: "https://lucide.dev", note: "icons" },
      { name: "marked", by: "marked contributors", href: "https://marked.js.org", note: "posts" },
      { name: "sharp", by: "Lovell Fuller", href: "https://sharp.pixelplumbing.com", note: "photos" },
      { name: "exifr", by: "Mike Kovařík", href: "https://github.com/MikeKovarik/exifr", note: "camera details" },
      { name: "Vercel", by: "Vercel", href: "https://vercel.com", note: "hosting" },
    ],
  },
];

export default function CreditsDialog({ name }: { name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  const open = () => {
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <button onClick={open} className="underline underline-offset-4 transition-colors hover:text-fg">
        Credits
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="credits-title"
        onClose={() => (document.body.style.overflow = "")}
        // A click on the backdrop lands on the <dialog> itself, not its content
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto max-h-[min(80vh,42rem)] w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-theme border border-line bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex open:flex-col"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="credits-title" className="display text-2xl">
            Credits
          </h2>
          <button
            onClick={close}
            aria-label="Close credits"
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 text-sm">
          <div className="space-y-3 leading-relaxed">
            <p>
              <span className="font-medium">Photographs</span> by {name}.
            </p>
            <p>
              <span className="font-medium">The site</span> was designed and built together by {name} and{" "}
              <a
                href="https://claude.com/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4"
              >
                Claude Code
              </a>
              .
            </p>
            <p className="text-muted">
              Articles on the Reading page belong to their authors, credited and linked on each entry.
            </p>
          </div>

          {SECTIONS.map((section) => (
            <section key={section.title} className="mt-6">
              <h3 className="mb-1 border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                {section.title}
              </h3>
              <ul className="divide-y divide-line">
                {section.items.map((item) => (
                  <li key={item.name} className="flex items-baseline justify-between gap-4 py-2">
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-accent"
                    >
                      {item.name}
                    </a>
                    <span className="text-right text-xs text-muted">
                      {item.by}
                      {item.note && ` · ${item.note}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="mt-6 text-xs text-muted">
            Typefaces are used under the SIL Open Font License; Lucide icons are ISC; the libraries are MIT,
            Apache-2.0 or ISC licensed. Natural Earth map data is in the public domain.
          </p>
        </div>
      </dialog>
    </>
  );
}
