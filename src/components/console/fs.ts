import type { ConsoleData } from "./data";

// A pretend filesystem over the site's content. "~" is "/", the home of every
// visitor. Each node can be read with `cat` and visited with `open`.
//
//   ~/about.txt  ~/education.txt
//   ~/posts/<slug>.md      ~/reading/<slug>.txt   ~/projects/<slug>.txt
//   ~/work/<company>.txt   ~/photos/<file>.jpg

export interface Node {
  name: string;
  dir: boolean;
  children?: Node[];
  read?: () => string;
  href?: string; // where `open` goes; http(s) links open in a new tab
  note?: string; // shown by `ls -l`
}

const file = (name: string, read: () => string, href?: string, note?: string): Node => ({ name, dir: false, read, href, note });
const dir = (name: string, children: Node[], href?: string): Node => ({ name, dir: true, children, href });

const lines = (...parts: (string | false | undefined)[]) => parts.filter((p) => p !== false && p !== undefined).join("\n");

export function buildTree(d: ConsoleData): Node {
  const p = d.personal;
  return dir(
    "",
    [
      file(
        "about.txt",
        () =>
          lines(
            `${p.name} — ${p.title}, ${p.location}`,
            "",
            p.headline,
            "",
            p.bio,
            "",
            `github    ${p.github}`,
            `linkedin  ${p.linkedin}`,
            `web       ${p.url}`,
          ),
        "/",
      ),
      file("education.txt", () =>
        d.education.map((e) => lines(`${e.degree}`, `  ${e.school}, ${e.location} · ${e.period}`, e.note && `  ${e.note}`)).join("\n\n"),
      ),
      dir(
        "photos",
        d.photos.map((ph) =>
          file(
            ph.file,
            () =>
              lines(
                ph.title,
                ph.location && `  ${ph.location}`,
                ph.taken && `  taken     ${ph.taken}`,
                ph.camera && `  camera    ${ph.camera}`,
                ph.settings && `  settings  ${ph.settings}`,
                ph.caption && `\n${ph.caption}`,
                "\n(it's a photo — `open` it to see it in the gallery)",
              ),
            "/photos",
            ph.title,
          ),
        ),
        "/photos",
      ),
      dir(
        "posts",
        d.posts.map((post) =>
          file(
            `${post.slug}.md`,
            () =>
              lines(
                `# ${post.title}`,
                `${post.date} · ${post.minutes} min read${post.tags.length ? ` · ${post.tags.join(", ")}` : ""}`,
                "",
                post.markdown,
              ),
            `/blog/${post.slug}`,
            `${post.date}  ${post.title}`,
          ),
        ),
        "/blog",
      ),
      dir(
        "projects",
        d.projects.map((pr) =>
          file(
            `${pr.slug}.txt`,
            () =>
              lines(
                pr.name,
                "",
                pr.description,
                "",
                `tech  ${pr.tech.join(", ")}`,
                pr.github && `code  ${pr.github}`,
                pr.live && `live  ${pr.live}`,
              ),
            pr.live ?? pr.github ?? "/#projects",
            pr.name,
          ),
        ),
        "/#projects",
      ),
      dir(
        "reading",
        d.reading.map((r) =>
          file(
            `${r.slug}.txt`,
            () =>
              lines(
                r.title,
                `${r.author ? `${r.author} · ` : ""}${r.source} · read ${r.date}`,
                "",
                r.summary,
                r.takeaway && `\nWhy it stuck: ${r.takeaway}`,
                "",
                r.url,
              ),
            r.url,
            `${r.date}  ${r.title}`,
          ),
        ),
        "/reading",
      ),
      dir(
        "work",
        d.work.map((w) =>
          file(
            `${w.slug}.txt`,
            () => lines(`${w.title} — ${w.company}`, `${w.location} · ${w.period}`, "", w.summary, "", `tech  ${w.tech.join(", ")}`),
            "/#work",
            `${w.period}  ${w.title}`,
          ),
        ),
        "/#work",
      ),
    ],
    "/",
  );
}

// The absolute path `arg` names, seen from `cwd`
export function resolve(cwd: string, arg = ""): string {
  const parts = arg === "~" || arg.startsWith("~/") || arg.startsWith("/") ? [] : cwd.split("/").filter(Boolean);
  for (const part of arg.replace(/^~/, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return "/" + parts.join("/");
}

export function lookup(root: Node, path: string): Node | undefined {
  let node: Node | undefined = root;
  for (const part of path.split("/").filter(Boolean)) node = node?.children?.find((c) => c.name === part);
  return node;
}

// "/posts" → "~/posts", as the prompt shows it
export const pretty = (path: string) => (path === "/" ? "~" : `~${path}`);
