"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

// `wide` links are home-page anchors, hidden on phones to keep the bar on one line
const NAV = [
  { href: "/#work", label: "Work", match: null, wide: true },
  { href: "/#projects", label: "Projects", match: null, wide: true },
  { href: "/blog", label: "Writing", match: "/blog" },
  { href: "/reading", label: "Reading", match: "/reading" },
  { href: "/photos", label: "Photos", match: "/photos" },
];

export default function Header({ name }: { name: string }) {
  const pathname = usePathname();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="display text-xl leading-none hover:text-accent transition-colors"
        >
          <span className="hidden sm:inline">{name}</span>
          <span className="sm:hidden">{initials}</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => {
            const active = item.match && pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-pill px-2.5 py-1.5 text-sm transition-colors sm:px-3 ${
                  item.wide ? "hidden md:block" : ""
                } ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-fg"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
