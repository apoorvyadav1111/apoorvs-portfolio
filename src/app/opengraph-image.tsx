import { ogImage, ogSize } from "@/lib/og";
import personal from "@/data/personal.json";

export const size = ogSize;
export const contentType = "image/png";
export const alt = `${personal.name} — ${personal.headline}`;

export default function Image() {
  return ogImage({ eyebrow: personal.currently, title: personal.headline });
}
