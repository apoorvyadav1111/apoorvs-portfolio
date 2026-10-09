"use client";

import { useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

// "Make one for yourself": a ready-to-paste prompt for building a site like
// this one with an AI coding assistant. The text lives in
// src/content/make-your-own-prompt.md.

export default function MakeYourOwnDialog({ prompt }: { prompt: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const text = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState<"no" | "yes" | "selected">("no");

  const open = () => {
    setCopied("no");
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
  };
  const close = () => dialog.current?.close();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied("yes");
      setTimeout(() => setCopied("no"), 2000);
    } catch {
      // Clipboard access can be blocked: select the text so ⌘C / Ctrl+C works
      const range = document.createRange();
      if (text.current) range.selectNodeContents(text.current);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setCopied("selected");
    }
  };
  const copyKey = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘C" : "Ctrl+C";

  return (
    <>
      <button onClick={open} className="underline underline-offset-4 transition-colors hover:text-fg">
        Make one for yourself →
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="make-your-own-title"
        onClose={() => (document.body.style.overflow = "")}
        // A click on the backdrop lands on the <dialog> itself, not its content
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto max-h-[min(85vh,46rem)] w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-theme border border-line bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex open:flex-col"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id="make-your-own-title" className="display text-2xl">
              Make one for yourself
            </h2>
            <p className="mt-1 text-sm text-muted">
              Open{" "}
              <a
                href="https://claude.com/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4"
              >
                Claude Code
              </a>{" "}
              (or any AI coding assistant) in an empty folder and paste this in.
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <pre
          ref={text}
          className="flex-1 overflow-y-auto whitespace-pre-wrap px-6 py-5 font-mono text-[13px] leading-relaxed text-fg select-text"
        >
          {prompt}
        </pre>

        <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-3">
          <p className="text-xs text-muted">Change the sections and style to fit you.</p>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-85"
          >
            {copied === "yes" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "yes" ? "Copied" : copied === "selected" ? `Selected: press ${copyKey}` : "Copy prompt"}
          </button>
        </div>
      </dialog>
    </>
  );
}
