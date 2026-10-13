"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";

// The hidden shell's doorbell. Only this listener ships with every page; the
// console itself (src/components/console) and the content it reads are loaded
// the first time it opens. Ways in:
//   ` or ~                       anywhere outside a text field
//   typing "sudo"                likewise, and it's waiting at the prompt
//   long-press the header name   touch screens, ~0.7s ([data-console-trigger])
//   the Appearance menu          its "Open shell" button calls openConsole()

type TerminalProps = { initial: string; onClose: () => void };

// A plain dynamic import rather than next/dynamic, which would add its own
// loader to every page
let Terminal: ComponentType<TerminalProps> | null = null;
const load = () => import("./console/Terminal").then((m) => (Terminal = m.default));

const LONG_PRESS_MS = 700;

// For buttons elsewhere (the Appearance menu) that open the console
export const openConsole = () => dispatchEvent(new Event("open-console"));

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export default function ConsoleTrigger() {
  const [open, setOpen] = useState<null | { initial: string }>(null);

  useEffect(() => {
    const show = (initial: string) => {
      if (Terminal) setOpen({ initial });
      else load().then(() => setOpen({ initial }), () => {});
    };
    let word = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector('[aria-modal="true"]')) return;
      if (e.key === "`" || e.key === "~") {
        e.preventDefault();
        show("");
        return;
      }
      word = (word + e.key.toLowerCase()).slice(-4);
      if (word === "sudo") {
        e.preventDefault(); // or the "o" lands in the prompt, once it's loaded
        word = "";
        show("sudo ");
      }
    };

    // Long press, without the click that follows it opening the home page or
    // counting toward the logo scramble
    let timer = 0;
    let fired = false;
    let from = { x: 0, y: 0 };
    const cancel = () => clearTimeout(timer);
    // A finger always wobbles a little; only a real drag cancels
    const onMove = (e: PointerEvent) => Math.hypot(e.clientX - from.x, e.clientY - from.y) > 10 && cancel();
    const onDown = (e: PointerEvent) => {
      fired = false;
      if (e.pointerType === "mouse" || !(e.target as Element).closest?.("[data-console-trigger]")) return;
      from = { x: e.clientX, y: e.clientY };
      timer = window.setTimeout(() => {
        fired = true;
        if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10);
        show("");
      }, LONG_PRESS_MS);
    };
    const swallow = (e: Event) => {
      if (!fired) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click") fired = false;
    };

    const onRequest = () => show("");
    addEventListener("open-console", onRequest);
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", onDown, { passive: true });
    addEventListener("pointermove", onMove, { passive: true });
    ["pointerup", "pointercancel"].forEach((ev) => addEventListener(ev, cancel, { passive: true }));
    addEventListener("click", swallow, true);
    addEventListener("contextmenu", swallow, true);
    return () => {
      removeEventListener("open-console", onRequest);
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      ["pointerup", "pointercancel"].forEach((ev) => removeEventListener(ev, cancel));
      removeEventListener("click", swallow, true);
      removeEventListener("contextmenu", swallow, true);
      clearTimeout(timer);
    };
  }, []);

  return open && Terminal ? <Terminal initial={open.initial} onClose={() => setOpen(null)} /> : null;
}
