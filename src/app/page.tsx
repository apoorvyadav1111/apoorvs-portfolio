import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Github } from "lucide-react";
import personal from "@/data/personal.json";
import work from "@/data/work.json";
import education from "@/data/education.json";
import projects from "@/data/projects.json";
import { getAllPosts, formatDate } from "@/lib/posts";
import { getPhotos } from "@/lib/photos";
import HeroStatus from "@/components/HeroStatus";

function SectionHeading({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div data-reveal className="mb-10 flex items-end justify-between gap-4 border-b border-line pb-4">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-xs text-muted">{index}</span>
        <h2 className="display text-4xl sm:text-5xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

// Splits text into words that enter one after another (`from` is the first word's
// place in the page's entrance order). Words follow each other at half the
// theme's stagger, so a long headline doesn't drag.
const WORD_STEP = 0.5;

function Words({ text, from }: { text: string; from: number }) {
  return text
    .trim()
    .split(/\s+/)
    .map((word, i) => (
      <span key={i}>
        {i > 0 && " "}
        <span className="enter enter-word" style={{ "--i": from + i * WORD_STEP } as React.CSSProperties}>
          {word}
        </span>
      </span>
    ));
}

export default function Home() {
  const posts = getAllPosts().slice(0, 3);
  const photos = getPhotos();
  const cover = photos[0];
  const [lead, ...after] = personal.headline.split("—");
  const rest = after.join("—");
  const leadCount = lead.trim().split(/\s+/).length;
  const slow = `—${rest}`.match(/^(.*)\s(slow down\.?)$/i);
  const restCount = rest ? `—${rest}`.trim().split(/\s+/).length : 0;
  const afterHeadline = 1 + (leadCount + restCount) * WORD_STEP;

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Hero */}
      <section className="pt-20 pb-24 sm:pt-28 sm:pb-32">
        <HeroStatus
          text={`${personal.currently} · ${personal.location}`}
          className="enter mb-8 font-mono text-xs uppercase tracking-widest text-muted"
        />
        <h1 className="max-w-4xl display text-5xl leading-[var(--display-leading)] sm:text-7xl">
          <Words text={lead} from={1} />{" "}
          {rest && (
            <span className="em">
              {slow ? (
                <>
                  <Words text={slow[1]} from={1 + leadCount * WORD_STEP} />{" "}
                  {/* Easter egg: hovering "slow down" slows it down */}
                  <span className="slowdown">
                    <Words text={slow[2]} from={1 + (leadCount + slow[1].trim().split(/\s+/).length) * WORD_STEP} />
                  </span>
                </>
              ) : (
                <Words text={`—${rest}`} from={1 + leadCount * WORD_STEP} />
              )}
            </span>
          )}
        </h1>
        <p className="enter mt-8 max-w-2xl text-lg leading-relaxed text-muted" style={{ "--i": afterHeadline } as React.CSSProperties}>
          {personal.bio}
        </p>
        <div className="enter mt-10 flex flex-wrap gap-3" style={{ "--i": afterHeadline + 1 } as React.CSSProperties}>
          <Link
            href="/#work"
            className="inline-flex items-center gap-2 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-85"
          >
            See my work <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={personal.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-pill border border-line px-5 py-2.5 text-sm transition-colors hover:border-fg"
          >
            <Github className="h-4 w-4" /> GitHub
          </a>
        </div>
      </section>

      {/* Experience */}
      <section id="work" className="pb-28">
        <SectionHeading index="01" title="Experience" />
        <ol className="divide-y divide-line">
          {work.map((job) => (
            <li
              key={`${job.company}-${job.period}`}
              data-reveal
              className="grid gap-3 py-8 first:pt-0 sm:grid-cols-[180px_1fr] sm:gap-10"
            >
              <p className="font-mono text-xs uppercase tracking-wider text-muted sm:pt-1.5">
                {job.period}
              </p>
              <div>
                <h3 className="text-xl font-medium">
                  {job.title}{" "}
                  <span className="text-muted">at</span>{" "}
                  <span className="text-accent">{job.company}</span>
                </h3>
                <p className="mt-1 text-sm text-muted">{job.location}</p>
                <p className="mt-4 leading-relaxed">{job.summary}</p>
                <p className="mt-4 font-mono text-xs text-muted">
                  {job.tech.join("  /  ")}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-14 mb-2 border-b border-line pb-3 font-mono text-xs uppercase tracking-wider text-muted">
          Education
        </h3>
        <ul className="divide-y divide-line">
          {education.map((e) => (
            <li key={e.school} data-reveal className="grid gap-1 py-5 sm:grid-cols-[180px_1fr] sm:gap-10">
              <p className="font-mono text-xs uppercase tracking-wider text-muted sm:pt-1">{e.period}</p>
              <div>
                <p className="font-medium">
                  {e.degree} <span className="text-muted">at</span> {e.school}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {[e.location, e.note].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Projects */}
      <section id="projects" className="pb-28">
        <SectionHeading index="02" title="Projects" />
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => {
            const href = project.live ?? project.github;
            const Card = href ? "a" : "div";
            return (
              <Card
                key={project.name}
                {...(href && {
                  href,
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
                data-reveal
                data-tilt
                className="group flex flex-col rounded-theme border border-line bg-surface/40 p-6 transition-all hover:-translate-y-0.5 hover:border-fg/30 hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-medium">{project.name}</h3>
                  {href && (
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                  )}
                </div>
                <p className="mt-2 flex-1 leading-relaxed text-muted">
                  {project.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="rounded-pill border border-line px-2.5 py-0.5 font-mono text-[11px] text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Writing */}
      {posts.length > 0 && (
        <section className="pb-28">
          <SectionHeading
            index="03"
            title="Writing"
            action={
              <Link
                href="/blog"
                className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
              >
                All posts <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {posts.map((post) => (
              <li key={post.slug} data-reveal>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group grid gap-2 py-6 first:pt-0 sm:grid-cols-[180px_1fr] sm:gap-10"
                >
                  <p className="font-mono text-xs uppercase tracking-wider text-muted sm:pt-1.5">
                    {formatDate(post.date, "short")}
                  </p>
                  <div>
                    <h3 className="display text-2xl transition-colors group-hover:text-accent">
                      {post.title}
                      {post.draft && (
                        <span className="ml-3 align-middle font-sans text-[10px] font-medium uppercase tracking-widest text-accent">
                          Draft
                        </span>
                      )}
                    </h3>
                    <p className="mt-1.5 text-muted">{post.summary}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Photographs */}
      {cover && (
        <section className="pb-28">
          <SectionHeading index="04" title="Photographs" />
          <Link
            href="/photos"
            data-reveal
            className="group relative block aspect-[4/5] overflow-hidden rounded-theme bg-surface sm:aspect-[21/9]"
          >
            <Image
              src={cover.src}
              alt={cover.title}
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="photo object-cover transition-[transform,filter] duration-[1.2s] ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white sm:p-10">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
                  {photos.length} {photos.length === 1 ? "frame" : "frames"}
                </p>
                <p className="mt-2 display text-4xl sm:text-6xl">
                  Through the lens
                </p>
              </div>
              <span className="flex items-center gap-2 whitespace-nowrap text-sm text-white/80 transition-colors group-hover:text-white">
                View gallery <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </section>
      )}
    </main>
  );
}
