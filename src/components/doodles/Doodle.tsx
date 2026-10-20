"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// The full-screen shell every doodle (/doodles/*) plays in: the site's header,
// footer and text step aside (see [data-doodle] in globals.css), a faint way
// back to the doodles appears when you move and fades when you're still (the
// pointer too), and Esc goes there too.
// Each doodle is its own page that wraps itself in this, so its code only
// loads where it's played.

const HINT_MS = 2500;

export default function Doodle({
  title,
  children,
}: {
  title: string; // for screen readers: what this is and how to play
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [awake, setAwake] = useState(true);
  const timer = useRef(0);

  useEffect(() => {
    const r = document.documentElement;
    r.dataset.doodle = "";
    const stir = () => {
      setAwake(true);
      r.removeAttribute("data-doodle-still");
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setAwake(false);
        r.setAttribute("data-doodle-still", "");
      }, HINT_MS);
    };
    stir();
    const leave = () => router.push("/doodles");
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" ? leave() : stir());
    addEventListener("pointermove", stir, { passive: true });
    addEventListener("pointerdown", stir, { passive: true });
    addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer.current);
      removeEventListener("pointermove", stir);
      removeEventListener("pointerdown", stir);
      removeEventListener("keydown", onKey);
      delete r.dataset.doodle;
      r.removeAttribute("data-doodle-still");
    };
  }, [router]);

  return (
    <div className="doodle">
      <h1 className="sr-only">{title} Press Escape to leave.</h1>
      {children}
      <div
        className={`fixed left-4 top-4 z-50 flex items-center gap-1 rounded-pill bg-bg/60 p-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted backdrop-blur transition-opacity duration-700 sm:left-6 sm:top-6 ${
          awake ? "opacity-90" : "pointer-events-none opacity-0"
        }`}
      >
        <Link href="/doodles" className="rounded-pill px-3 py-1.5 transition-colors hover:text-fg">
          ← doodles · esc
        </Link>
      </div>
    </div>
  );
}
