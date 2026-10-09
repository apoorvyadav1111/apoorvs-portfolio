import { Github, Linkedin, Rss } from "lucide-react";
import ThemePicker from "./ThemePicker";
import { THEMES } from "@/themes";

interface FooterProps {
  personal: { name: string; github: string; linkedin: string };
}

export default function Footer({ personal }: FooterProps) {
  const links = [
    { href: personal.github, label: "GitHub", icon: Github },
    { href: personal.linkedin, label: "LinkedIn", icon: Linkedin },
    { href: "/rss.xml", label: "RSS", icon: Rss },
  ];

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {personal.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {links.map(({ href, label, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-fg"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
          <span className="hidden h-4 w-px bg-line sm:block" />
          <ThemePicker
            themes={THEMES.map((t) => ({
              id: t.id,
              name: t.name,
              swatch: [t.dark.bg, t.dark.accent],
            }))}
          />
        </div>
      </div>
    </footer>
  );
}
