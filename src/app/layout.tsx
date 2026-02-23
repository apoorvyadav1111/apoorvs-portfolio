import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apoorv Yadav - Software Developer",
  description:
    "Full Stack Software Developer specializing in distributed systems and modern web technologies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-mono">{children}</body>
    </html>
  );
}
