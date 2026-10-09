import type { Metadata } from "next";
import PhotoGallery from "@/components/PhotoGallery";
import { getPhotos } from "@/lib/photos";

export const metadata: Metadata = {
  title: "Photographs",
  description: "Frames from trails, cities, and everything in between.",
};

export default function PhotosPage() {
  const photos = getPhotos();
  const cameras = [...new Set(photos.map((p) => p.camera).filter(Boolean))];

  return (
    <main className="mx-auto max-w-6xl px-4 pt-20 pb-28 sm:px-6 sm:pt-28">
      <header className="rise mb-20 grid gap-8 border-b border-line pb-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            Photographs
          </p>
          <h1 className="mt-5 display text-6xl leading-[var(--display-leading)] sm:text-8xl">
            Through
            <br />
            <span className="em">the lens</span>
          </h1>
          <p className="mt-8 max-w-md leading-relaxed text-muted">
            Frames from trails, cities, and everything in between — the places
            I go when I step away from the keyboard.
          </p>
        </div>
        <dl className="grid w-fit grid-cols-[auto_auto] gap-x-10 gap-y-1 font-mono text-[11px] uppercase tracking-wider md:text-right">
          <dt className="text-muted">Frames</dt>
          <dd>{String(photos.length).padStart(2, "0")}</dd>
          {cameras.length > 0 && (
            <>
              <dt className="text-muted">Shot on</dt>
              <dd>{cameras.join(", ")}</dd>
            </>
          )}
        </dl>
      </header>

      {photos.length === 0 ? (
        <p className="text-muted">The gallery is being developed. Soon.</p>
      ) : (
        <PhotoGallery photos={photos} />
      )}
    </main>
  );
}
