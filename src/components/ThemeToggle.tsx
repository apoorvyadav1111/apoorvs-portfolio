"use client";

import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const current =
      root.dataset.theme ??
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle color theme"
      className="ml-1 grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg"
    >
      {/* Icon swap is pure CSS so it's correct before hydration */}
      <Sun className="h-4 w-4 hidden [[data-theme=dark]_&]:block" />
      <Moon className="h-4 w-4 [[data-theme=dark]_&]:hidden" />
    </button>
  );
}
