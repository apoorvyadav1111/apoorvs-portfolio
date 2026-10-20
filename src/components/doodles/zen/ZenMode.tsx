"use client";

import { useEffect } from "react";
import { THEMES, currentSeason } from "@/themes";
import { canTimelapse, startTimelapse, stopTimelapse } from "@/lib/timelapse";
import { addToSky } from "@/lib/sky";
import Doodle from "../Doodle";
import ZenScene from "./ZenScene";
import { wind } from "./wind";

// Zen (/doodles/zen): the words go, the seasons stay. Lays a landscape under
// the season's particles and lets a slow timelapse turn the year, a minute a
// season; on a regular theme it borrows this season's, without saving it.
// The pointer leaves a soft trail that stirs things like wind.
//
// It adds to the shared seasonal sky through plug-ins (src/lib/sky.ts):
// wind.ts is one. More pieces (a watering can, trees…) belong here as further
// plug-ins, or as layers in ZenScene.tsx; the clean-up tools come from the sky.

const SEASON_LENGTH = 60;

export default function ZenMode() {
  useEffect(() => {
    const r = document.documentElement;
    const before = r.dataset.palette;
    const removeWind = addToSky(wind());
    if (!canTimelapse()) r.dataset.palette = THEMES.find((t) => t.season === currentSeason())!.id;
    startTimelapse({ every: SEASON_LENGTH, loop: true });
    return () => {
      removeWind();
      stopTimelapse(false);
      if (before && r.dataset.palette !== before) r.dataset.palette = before;
    };
  }, []);

  return (
    <Doodle title="Zen: the seasons going by, with nothing else on the page.">
      <ZenScene />
    </Doodle>
  );
}
