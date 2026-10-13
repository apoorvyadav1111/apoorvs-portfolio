import type { Metadata } from "next";
import ZenMode from "@/components/ZenMode";

export const metadata: Metadata = {
  title: "Zen",
  description: "Nothing to read. Just the seasons going by.",
};

export default function Zen() {
  return <ZenMode />;
}
