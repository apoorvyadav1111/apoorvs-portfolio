"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import type { Photo } from "@/lib/photos";
import { useViewerGestures } from "./useViewerGestures";
import { usePinchToResize, useGridZoom, zoomBy, ZOOM_LEVELS } from "./useGridZoom";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const plateNumber = (i: number) => ROMAN[i] ?? String(i + 1);
const pad = (n: number) => String(n).padStart(2, "0");

// Few photos read best as large captioned plates; many as a browsable grid.
const PLATE_LIMIT = 3;

export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      {photos.length <= PLATE_LIMIT ? (
        <Plates photos={photos} onOpen={setOpen} />
      ) : (
        <Masonry photos={photos} onOpen={setOpen} />
      )}
      {open !== null && (
        <Lightbox
          photos={photos}
          index={open}
          onChange={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function Plates({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (i: number) => void;
}) {
  return (
    <div className="space-y-28 sm:space-y-40">
      {photos.map((photo, i) => {
        const flip = i % 2 === 1;
        return (
          <figure
            key={photo.src}
            className={`grid items-end gap-8 lg:gap-14 ${
              flip ? "lg:grid-cols-[260px_1fr]" : "lg:grid-cols-[1fr_260px]"
            }`}
          >
            <button
              onClick={() => onOpen(i)}
              aria-label={`View ${photo.title} full screen`}
              // On wide screens the photo hugs its caption instead of centering
              className={`group relative mx-auto block w-full cursor-zoom-in overflow-hidden bg-surface ${
                flip ? "lg:order-2 lg:ml-0" : "lg:mr-0"
              }`}
              // Keep the whole frame within the viewport height
              style={{ maxWidth: `calc(82vh * ${photo.width / photo.height})` }}
            >
              <Image
                src={photo.src}
                alt={photo.title}
                width={photo.width}
                height={photo.height}
                sizes="(min-width: 1024px) 800px, 100vw"
                priority={i === 0}
                className="photo h-auto w-full transition-[transform,filter] duration-[1.4s] ease-out group-hover:scale-[1.02]"
              />
            </button>
            <figcaption className={flip ? "lg:order-1 lg:text-right" : ""}>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
                Plate {plateNumber(i)}
              </p>
              <h2 className="mt-3 display text-4xl leading-tight">
                {photo.title}
              </h2>
              {photo.location && (
                <p className="mt-1 text-muted">{photo.location}</p>
              )}
              {photo.caption && (
                <p className="mt-4 leading-relaxed text-muted">
                  {photo.caption}
                </p>
              )}
              <ExifBlock photo={photo} />
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function ExifBlock({ photo }: { photo: Photo }) {
  const rows = [
    ["Date", photo.taken],
    ["Camera", photo.camera],
    ["Settings", photo.settings],
  ].filter(([, v]) => v);
  if (rows.length === 0) return null;

  return (
    <dl className="mt-6 space-y-1.5 border-t border-line pt-5 font-mono text-[11px] tracking-wider">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="inline uppercase text-muted">{label} — </dt>
          <dd className="inline">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Deals photos, in order, onto whichever column is currently shortest. Unlike
// CSS columns (which fill top-to-bottom), rows then read left to right.
function balance(photos: Photo[], count: number) {
  const columns = Array.from({ length: count }, () => ({
    height: 0,
    items: [] as number[],
  }));
  photos.forEach((photo, i) => {
    const shortest = columns.reduce((a, b) => (b.height < a.height ? b : a));
    shortest.items.push(i);
    shortest.height += photo.height / photo.width;
  });
  return columns.map((c) => c.items);
}

// Phones and tablets get fixed layouts; desktop is resizable (see useGridZoom)
const SMALL_LAYOUTS = [
  { count: 1, className: "flex sm:hidden" },
  { count: 2, className: "hidden sm:flex lg:hidden" },
];

function Masonry({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (i: number) => void;
}) {
  const level = ZOOM_LEVELS[useGridZoom()];
  const desktop = useRef<HTMLDivElement>(null);
  usePinchToResize(desktop);

  // Every layout shares one `sizes`, so each image resolves to the same URL
  // whichever layout is visible and is only downloaded once.
  const sizes = `(min-width: 1024px) ${Math.ceil(1152 / level.columns)}px, (min-width: 640px) 50vw, 100vw`;

  return (
    <>
      {SMALL_LAYOUTS.map(({ count, className }) => (
        <div key={count} className={`${className} gap-4`}>
          {balance(photos, count).map((column, c) => (
            <div key={c} className="flex flex-1 flex-col gap-4">
              {column.map((i) => (
                <Tile key={photos[i].src} photo={photos[i]} sizes={sizes} onOpen={() => onOpen(i)} />
              ))}
            </div>
          ))}
        </div>
      ))}

      <div ref={desktop} className="hidden lg:block">
        <ZoomControls />
        {level.square ? (
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${level.columns}, minmax(0, 1fr))` }}
          >
            {photos.map((photo, i) => (
              <Tile key={photo.src} photo={photo} sizes={sizes} square transitionName={`photo-${i}`} onOpen={() => onOpen(i)} />
            ))}
          </div>
        ) : (
          <div className="flex gap-4">
            {balance(photos, level.columns).map((column, c) => (
              <div key={c} className="flex flex-1 flex-col gap-4">
                {column.map((i) => (
                  <Tile key={photos[i].src} photo={photos[i]} sizes={sizes} transitionName={`photo-${i}`} onOpen={() => onOpen(i)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ZoomControls() {
  const level = useGridZoom();
  const button =
    "grid h-8 w-9 place-items-center text-muted transition-colors hover:text-fg disabled:opacity-30 disabled:hover:text-muted";
  return (
    <div className="mb-6 flex items-center justify-end gap-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
        Pinch to resize
      </span>
      <div className="flex items-center rounded-pill border border-line">
        <button
          onClick={() => zoomBy(1)}
          disabled={level === ZOOM_LEVELS.length - 1}
          aria-label="Smaller photos"
          title="Smaller photos"
          className={button}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="h-4 w-px bg-line" />
        <button
          onClick={() => zoomBy(-1)}
          disabled={level === 0}
          aria-label="Larger photos"
          title="Larger photos"
          className={button}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Tile({
  photo,
  sizes,
  square = false,
  transitionName,
  onOpen,
}: {
  photo: Photo;
  sizes: string;
  square?: boolean;
  transitionName?: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      aria-label={`View ${photo.title} full screen`}
      title={square ? photo.title : undefined}
      className={`group relative block w-full cursor-zoom-in overflow-hidden bg-surface ${square ? "aspect-square" : ""}`}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      {square ? (
        <Image
          src={photo.src}
          alt={photo.title}
          fill
          sizes={sizes}
          className="photo object-cover transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <Image
          src={photo.src}
          alt={photo.title}
          width={photo.width}
          height={photo.height}
          sizes={sizes}
          className="photo h-auto w-full transition-[transform,filter] duration-[1.2s] ease-out group-hover:scale-[1.03]"
        />
      )}
      {/* Caption on hover; always shown on touch screens, which can't hover.
          Square thumbnails are too small for one, so they use a tooltip. */}
      {!square && (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-5 text-left text-white opacity-0 transition-opacity duration-500 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <div>
            <p className="display text-2xl">{photo.title}</p>
            {photo.location && (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-white/70">
                {photo.location}
              </p>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

function Lightbox({
  photos,
  index,
  onChange,
  onClose,
}: {
  photos: Photo[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const many = photos.length > 1;

  const step = useCallback(
    (dir: 1 | -1) =>
      onChange((index + dir + photos.length) % photos.length),
    [index, photos.length, onChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowRight") step(1);
      if (many && e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [many, step, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      className="rise fixed inset-0 z-[60]"
      style={{ animationDuration: "0.3s" }}
    >
      {/* Keyed by photo so zoom and drag state start fresh for each one */}
      <ViewerFrame
        key={photo.src}
        photo={photo}
        position={`${pad(index + 1)} / ${pad(photos.length)}`}
        onStep={many ? step : undefined}
        onClose={onClose}
      />
    </div>
  );
}

function ViewerFrame({
  photo,
  position,
  onStep,
  onClose,
}: {
  photo: Photo;
  position: string;
  onStep?: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const { ref, handlers, style, zoomed, dismissProgress } = useViewerGestures({
    canSwipe: Boolean(onStep),
    onSwipe: (dir) => onStep?.(dir),
    onDismiss: onClose,
  });
  // Chrome fades away while dismissing, and while zoomed in to see the photo
  const chrome = zoomed ? 0 : 1 - dismissProgress;

  return (
    <div
      className="absolute inset-0 flex select-none flex-col text-white"
      style={{ background: `rgba(0,0,0,${1 - dismissProgress * 0.7})` }}
    >
      <div
        className="z-10 flex items-center justify-between px-5 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 transition-opacity"
        style={{ opacity: chrome }}
      >
        <span>{position}</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={ref}
          {...handlers}
          className={`absolute inset-0 touch-none ${zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        >
          <div className="absolute inset-0" style={style}>
            <Image
              src={photo.src}
              alt={photo.title}
              fill
              sizes="100vw"
              draggable={false}
              className="rise object-contain px-4 sm:px-20"
              style={{ animationDuration: "0.4s" }}
            />
          </div>
        </div>
        {onStep && !zoomed && (
          <>
            <NavButton side="left" onClick={() => onStep(-1)} />
            <NavButton side="right" onClick={() => onStep(1)} />
          </>
        )}
      </div>

      <div
        className="z-10 flex flex-col gap-1 px-5 py-5 transition-opacity sm:flex-row sm:items-end sm:justify-between"
        style={{ opacity: chrome }}
      >
        <div>
          <p className="display text-2xl">{photo.title}</p>
          {photo.location && (
            <p className="text-sm text-white/60">{photo.location}</p>
          )}
        </div>
        <p className="font-mono text-[11px] tracking-wider text-white/50">
          {[photo.camera, photo.settings].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}

function NavButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:grid ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
}
