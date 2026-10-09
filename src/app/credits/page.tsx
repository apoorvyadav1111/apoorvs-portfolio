import type { Metadata } from "next";
import personal from "@/data/personal.json";

export const metadata: Metadata = {
  title: "Credits",
  description: "Who made what on this site: words, photos, design, typefaces and tools.",
};

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
      { name: "Atkinson Hyperlegible", by: "Braille Institute", href: "https://www.brailleinstitute.org/freefont/", note: "designed for low-vision readers" },
      { name: "Kode Mono", by: "Isa Ozler", href: "https://github.com/isaozler/kode-mono", note: "used for the favicon" },
    ],
  },
  {
    title: "Tools & libraries",
    items: [
      { name: "Next.js", by: "Vercel", href: "https://nextjs.org" },
      { name: "React", by: "Meta", href: "https://react.dev" },
      { name: "Tailwind CSS", by: "Tailwind Labs", href: "https://tailwindcss.com" },
      { name: "Lucide", by: "Lucide contributors", href: "https://lucide.dev", note: "icons" },
      { name: "marked", by: "the marked contributors", href: "https://marked.js.org", note: "renders the posts" },
      { name: "sharp", by: "Lovell Fuller", href: "https://sharp.pixelplumbing.com", note: "prepares the photos" },
      { name: "exifr", by: "Mike Kovařík", href: "https://github.com/MikeKovarik/exifr", note: "reads camera details" },
      { name: "Vercel", by: "Vercel", href: "https://vercel.com", note: "hosting" },
    ],
  },
];

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 sm:px-6 sm:pt-28">
      <header className="rise mb-14">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Credits</p>
        <h1 className="mt-4 display text-5xl leading-[var(--display-leading)] sm:text-6xl">
          Who made <span className="em">what</span>
        </h1>
      </header>

      <section className="mb-14 space-y-4 text-lg leading-relaxed">
        <p>
          <span className="font-medium">Words and photographs</span> by {personal.name}. The
          posts are mirrored from LinkedIn, and every photo was taken on an iPhone 14 Pro.
        </p>
        <p>
          <span className="font-medium">The site itself</span> was designed and built together by{" "}
          {personal.name} and{" "}
          <a
            href="https://claude.com/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4"
          >
            Claude Code
          </a>
          , Anthropic&apos;s AI coding assistant.
        </p>
        <p className="text-base text-muted">
          Articles on the Reading page belong to their authors, who are credited and linked on
          each entry.
        </p>
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mb-12">
          <h2 className="mb-2 border-b border-line pb-3 font-mono text-xs uppercase tracking-wider text-muted">
            {section.title}
          </h2>
          <ul className="divide-y divide-line">
            {section.items.map((item) => (
              <li key={item.name} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium transition-colors hover:text-accent"
                >
                  {item.name}
                </a>
                <span className="text-sm text-muted">
                  {item.by}
                  {item.note && ` · ${item.note}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-sm text-muted">
        All typefaces are used under the SIL Open Font License. Lucide icons are ISC-licensed; the
        libraries above are MIT, Apache-2.0 or ISC licensed.
      </p>
    </main>
  );
}
