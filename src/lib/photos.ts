import photoEntries from "@/data/photos.json";

// Entries are written by `npm run photos` (scripts/add-photos.mjs), which also
// records dimensions and camera details; title, location and caption are yours.
interface PhotoEntry {
  src: string;
  title: string;
  location?: string;
  caption?: string;
  width: number;
  height: number;
  camera?: string;
  settings?: string;
  taken?: string; // YYYY-MM-DD
}

// Same shape as an entry, with `taken` formatted for display ("February 2026")
export type Photo = PhotoEntry;

export function getPhotos(): Photo[] {
  return (photoEntries as PhotoEntry[]).map((p) => ({
    ...p,
    location: p.location || undefined,
    taken: p.taken
      ? new Date(`${p.taken}T00:00:00`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : undefined,
  }));
}
