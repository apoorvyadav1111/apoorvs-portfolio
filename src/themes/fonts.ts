// Every font any theme can use. next/font needs literal options, so each font
// is declared here by hand. Fonts are only downloaded when a theme uses them;
// `preload: true` is reserved for the default theme's fonts.
import {
  Archivo,
  Bricolage_Grotesque,
  DM_Sans,
  IBM_Plex_Mono,
  Inter,
  Instrument_Sans,
  JetBrains_Mono,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  preload: false,
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  preload: false,
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  preload: false,
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  preload: false,
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  preload: false,
});

export const fontVariables = [
  bricolage,
  instrumentSans,
  jetbrains,
  spaceGrotesk,
  dmSans,
  spaceMono,
  archivo,
  inter,
  plexMono,
]
  .map((f) => f.variable)
  .join(" ");
