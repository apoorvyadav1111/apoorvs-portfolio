import Link from "next/link";
import { ArrowRight } from "lucide-react";
import LostDots from "@/components/LostDots";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-16 pb-28 text-center sm:px-6 sm:pt-24">
      <LostDots />
      <h1 className="enter mt-6 display text-4xl sm:text-5xl">
        This page took the <span className="em">scenic route</span>
      </h1>
      <p className="enter mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted" style={{ "--i": 1 } as React.CSSProperties}>
        Whatever was here has wandered off. Push the dots around for a bit, or head somewhere that exists.
      </p>
      <div className="enter mt-10 flex flex-wrap justify-center gap-3" style={{ "--i": 2 } as React.CSSProperties}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-85"
        >
          Home <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/photos"
          className="inline-flex items-center gap-2 rounded-pill border border-line px-5 py-2.5 text-sm transition-colors hover:border-fg"
        >
          See the photos
        </Link>
      </div>
    </main>
  );
}
