// Features a visitor can switch off from the console (`disable eggs`).
// Switched-off ones are listed in `data-off` on <html> (e.g. data-off="eggs tilt")
// and in localStorage "off"; the init script in src/themes restores them before
// first paint. Components check featureOn() when they're about to do something,
// and globals.css hides the purely visual ones.
//
// Seasonal particles aren't here: they already have their own setting,
// `data-weather="off"` (see SeasonSky.tsx).

export const FEATURES = {
  motion: "page entrances and scroll reveals",
  tilt: "cards lean toward the cursor, with a spotlight",
  eggs: "konami code, shake to shuffle, logo scramble, 5-tap party",
  doze: "the page dozes off after a minute idle",
  grain: "paper-grain texture over everything",
} as const;

export type Feature = keyof typeof FEATURES;

function off() {
  return (document.documentElement.dataset.off ?? "").split(" ").filter(Boolean);
}

export function featureOn(feature: Feature) {
  return !off().includes(feature);
}

export function setFeature(feature: Feature, on: boolean) {
  const root = document.documentElement;
  const list = off().filter((f) => f !== feature);
  if (!on) list.push(feature);
  if (list.length) root.dataset.off = list.join(" ");
  else delete root.dataset.off;
  try {
    if (list.length) localStorage.setItem("off", list.join(" "));
    else localStorage.removeItem("off");
  } catch {}
  // Motion.tsx starts and stops itself as this attribute comes and goes
  if (feature === "motion") {
    if (on) root.dataset.motion = "";
    else delete root.dataset.motion;
  }
}
