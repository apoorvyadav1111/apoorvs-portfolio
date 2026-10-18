import type { Metadata } from "next";
import ZenMode from "@/components/zen/ZenMode";
import FetchGame from "@/components/zen/fetch/FetchGame";

export const metadata: Metadata = {
  title: "Fetch",
  description: "A dog, a ball and a park. Throw it.",
};

export default function Fetch() {
  return (
    <ZenMode
      title="Fetch: a dog in a park waits for you to throw its ball. Drag the ball and let go, or tap where you want it to land."
      withWind={false}
      other={{ href: "/zen", label: "just zen" }}
    >
      <FetchGame />
    </ZenMode>
  );
}
