"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppearanceMenu from "./AppearanceMenu";
import { featureOn } from "@/lib/features";

// `wide` links are hidden on phones to keep the bar on one line (Doodles is in the footer there)
const NAV = [
  { href: "/#work", label: "Work", match: null, wide: true },
  { href: "/#projects", label: "Projects", match: null, wide: true },
  { href: "/blog", label: "Writing", match: "/blog" },
  { href: "/reading", label: "Reading", match: "/reading" },
  { href: "/photos", label: "Photos", match: "/photos" },
  { href: "/doodles", label: "Doodles", match: "/doodles", wide: true },
];

export default function Header({ name }: { name: string }) {
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const [scramble, setScramble] = useState<string | null>(null);
  const clicks = useRef<number[]>([]);

  // Easter egg: five quick clicks on the name scramble its letters, which
  // tumble and resolve left to right. (A long press on it opens the console
  // on touch screens; see ConsoleTrigger.tsx.)
  const onLogoClick = (e: React.MouseEvent) => {
    clicks.current = [...clicks.current.filter((t) => e.timeStamp - t < 2000), e.timeStamp];
    if (clicks.current.length < 5 || scramble !== null) return;
    clicks.current = [];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !featureOn("eggs")) return;
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=?@";
    const steps = 18;
    let step = 0;
    const tick = setInterval(() => {
      step++;
      const done = Math.floor((step / steps) * name.length);
      setScramble(
        [...name].map((c, i) => (c === " " || i < done ? c : glyphs[Math.floor(Math.random() * glyphs.length)])).join(""),
      );
      if (step >= steps) {
        clearInterval(tick);
        setScramble(null);
      }
    }, 50);
  };
  const shown = scramble ?? name;

  // Phones: slide the bar away while scrolling down, bring it back on the way
  // up (the CSS only applies it on small screens with motion on)
  useEffect(() => {
    let last = scrollY;
    const onScroll = () => {
      const el = header.current;
      if (!el) return;
      const y = scrollY;
      const menuOpen = el.querySelector('[aria-expanded="true"]');
      if (y < 80 || y < last - 4 || menuOpen) el.removeAttribute("data-away");
      else if (y > last + 4) el.setAttribute("data-away", "");
      if (Math.abs(y - last) > 4) last = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <header ref={header} className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          onClick={onLogoClick}
          data-console-trigger
          className={`display text-xl leading-none hover:text-accent transition-colors ${scramble !== null ? "logo-scramble text-accent" : ""}`}
        >
          <span className="hidden sm:inline">{shown}</span>
          <span className="sm:hidden">
            {scramble !== null
              ? shown
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
              : initials}
          </span>
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
          <AppearanceMenu />
        </nav>
      </div>
    </header>
  );
}
