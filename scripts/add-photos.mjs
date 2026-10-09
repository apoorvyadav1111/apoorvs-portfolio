// Adds photos to the gallery.
//
//   1. Drop images into photos-inbox/ (JPEG, PNG, WebP, TIFF, or HEIC on macOS)
//   2. npm run photos
//   3. Fill in title/location in src/data/photos.json, then commit
//
// Each photo is rotated upright, resized to fit 2560px, saved as JPEG in
// public/photos/, and stripped of ALL metadata (including GPS location).
// Camera details are copied into photos.json before stripping so the gallery
// can still show them. Originals are moved to photos-inbox/added/.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import exifr from "exifr";

const INBOX = "photos-inbox";
const DONE = path.join(INBOX, "added");
const OUT_DIR = "public/photos";
const MANIFEST = "src/data/photos.json";
const MAX_EDGE = 2560;
const SUPPORTED = /\.(jpe?g|png|webp|tiff?|heic|heif)$/i;

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const titleFromSlug = (slug) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fingerprint = (file) =>
  crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");

// Never overwrite an archived original that happens to share a name
function archive(file) {
  const { name, ext } = path.parse(file);
  let target = path.join(DONE, file);
  for (let n = 2; fs.existsSync(target); n++) target = path.join(DONE, `${name}-${n}${ext}`);
  fs.renameSync(path.join(INBOX, file), target);
  return target;
}

const kb = (bytes) => `${Math.round(bytes / 1024).toLocaleString()} KB`;

function cameraDetails(exif) {
  if (!exif) return {};
  const focal = exif.FocalLengthIn35mmFormat ?? exif.FocalLength;
  const shutter = exif.ExposureTime;
  const settings = [
    focal && `${Math.round(focal)}mm`,
    exif.FNumber && `ƒ/${exif.FNumber.toFixed(1).replace(/\.0$/, "")}`,
    shutter && (shutter >= 1 ? `${shutter}s` : `1/${Math.round(1 / shutter)}s`),
    exif.ISO && `ISO ${exif.ISO}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    camera: exif.Model || undefined,
    settings: settings || undefined,
    // EXIF times have no timezone and are parsed as local time, so format
    // with local getters to keep the date the photo was actually taken
    taken:
      exif.DateTimeOriginal instanceof Date
        ? exif.DateTimeOriginal.toLocaleDateString("en-CA")
        : undefined,
  };
}

// sharp can't decode HEIC, but macOS ships `sips`, which can
function toReadable(file) {
  if (!/\.hei[cf]$/i.test(file)) return file;
  if (process.platform !== "darwin") {
    throw new Error("HEIC needs macOS; export the photo as JPEG instead");
  }
  const tmp = path.join(os.tmpdir(), `${path.parse(file).name}-${Date.now()}.jpg`);
  execFileSync("sips", ["-s", "format", "jpeg", file, "--out", tmp], {
    stdio: "ignore",
  });
  return tmp;
}

async function main() {
  fs.mkdirSync(INBOX, { recursive: true });
  fs.mkdirSync(DONE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const inGallery = new Set(manifest.map((p) => p.src));

  // Originals already processed, by content, so re-dropped copies are caught
  // whatever they're named (e.g. Finder's "IMG_1234 2.HEIC")
  const archived = new Map();
  const strays = [];
  for (const f of fs.readdirSync(DONE).filter((f) => SUPPORTED.test(f))) {
    archived.set(fingerprint(path.join(DONE, f)), f);
    if (!inGallery.has(`/photos/${slugify(path.parse(f).name)}.jpg`)) strays.push(f);
  }
  if (strays.length > 0) {
    console.log(
      `Note: ${DONE}/ has ${strays.length} photo(s) not in the gallery (${strays.slice(0, 3).join(", ")}${strays.length > 3 ? ", …" : ""}).\n` +
        `      That folder is only the archive. To add them, move them to ${INBOX}/ and run again.\n`,
    );
  }

  const files = fs
    .readdirSync(INBOX)
    .filter((f) => SUPPORTED.test(f))
    .sort();
  if (files.length === 0) {
    console.log(`No photos in ${INBOX}/ — drop some in and run again.`);
    return;
  }

  const added = [];

  for (const file of files) {
    const original = path.join(INBOX, file);
    const slug = slugify(path.parse(file).name);
    const src = `/photos/${slug}.jpg`;

    const id = fingerprint(original);
    if (archived.has(id)) {
      console.log(`• ${file}: skipped, same photo as ${archived.get(id)} which is already in the gallery`);
      continue;
    }
    if (inGallery.has(src)) {
      console.log(`• ${file}: skipped, ${src} is already in the gallery (rename the file to add it as a new photo)`);
      continue;
    }

    try {
      const readable = toReadable(original);
      const exif = await exifr
        .parse(readable, {
          pick: ["Model", "FNumber", "ExposureTime", "ISO", "FocalLengthIn35mmFormat", "FocalLength", "DateTimeOriginal"],
        })
        .catch(() => null);

      // No .withMetadata(): sharp drops EXIF/GPS/XMP from the output by default
      const out = path.join(OUT_DIR, `${slug}.jpg`);
      const info = await sharp(readable)
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(out);

      if (await exifr.gps(out).catch(() => null)) {
        fs.rmSync(out);
        throw new Error("location data survived processing; photo not added");
      }

      added.push({
        src,
        title: titleFromSlug(slug),
        location: "",
        width: info.width,
        height: info.height,
        ...cameraDetails(exif),
      });
      if (readable !== original) fs.rmSync(readable);
      const archivedAt = archive(file);
      archived.set(id, path.basename(archivedAt));
      inGallery.add(src);
      console.log(
        `✓ ${file} → ${src}  ${info.width}×${info.height}, ${kb(fs.statSync(archivedAt).size)} → ${kb(info.size)}, metadata stripped`,
      );
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }

  if (added.length > 0) {
    // New photos go first; reorder the entries in photos.json to change the gallery order
    fs.writeFileSync(MANIFEST, JSON.stringify([...added, ...manifest], null, 2) + "\n");
    console.log(`\nAdded ${added.length} photo(s). Next: set title/location in ${MANIFEST}, then commit.`);
  }
}

main();
