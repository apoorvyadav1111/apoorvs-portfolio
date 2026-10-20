import type { Metadata } from "next";
import FetchGame from "@/components/doodles/fetch/FetchGame";

export const metadata: Metadata = {
  title: "Fetch",
  description: "A dog, a garden and a toy to throw: ball, stick, frisbee or bone.",
};

export default function Fetch() {
  return <FetchGame />;
}
