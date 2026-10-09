import { ImageResponse } from "next/og";
import personal from "@/data/personal.json";
import { THEMES, DEFAULT_THEME } from "@/themes";

// Link-preview cards (LinkedIn, Slack, X…) drawn in the default theme's dark palette
export const ogSize = { width: 1200, height: 630 };

// Bricolage Grotesque (the Trail theme's heading font) as TTF, which the
// image renderer needs. If it can't be fetched, the built-in font is used.
async function headingFont(text: string) {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&text=${encodeURIComponent(text)}`,
      )
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function ogImage({ eyebrow, title }: { eyebrow: string; title: string }) {
  const theme = THEMES.find((t) => t.id === DEFAULT_THEME) ?? THEMES[0];
  const c = theme.dark;
  const host = new URL(personal.url).host;
  // The font is fetched as a subset, so it must cover every character drawn
  const font = await headingFont(eyebrow.toUpperCase() + title + personal.name + host);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 80px",
          fontFamily: font ? "Heading" : undefined,
          background: c.bg,
          color: c.fg,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: c.accent }}>
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontWeight: 700,
            fontSize: title.length > 70 ? 58 : 70,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: c.muted }}>
          <span style={{ color: c.fg }}>{personal.name}</span>
          <span>{host}</span>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: font ? [{ name: "Heading", data: font, weight: 700, style: "normal" }] : undefined,
    },
  );
}
