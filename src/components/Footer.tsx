import { Github, Linkedin } from "lucide-react";
import CreditsDialog from "./CreditsDialog";

interface FooterProps {
  personal: { name: string; github: string; linkedin: string };
}

// Pages are pre-rendered at deploy time, so this is the date of the last deploy
const lastUpdated = new Date().toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Los_Angeles",
});

export default function Footer({ personal }: FooterProps) {
  const links = [
    { href: personal.github, label: "GitHub", icon: Github },
    { href: personal.linkedin, label: "LinkedIn", icon: Linkedin },
  ];

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <div>
            Built by {personal.name} and{" "}
            <a
              href="https://claude.com/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-fg"
            >
              Claude Code
            </a>{" "}
            ·{" "}
            <CreditsDialog name={personal.name} />
          </div>
          <p className="text-xs">Last updated {lastUpdated}</p>
        </div>
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
        </div>
      </div>
    </footer>
  );
}
