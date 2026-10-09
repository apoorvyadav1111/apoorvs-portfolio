import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import personal from "@/data/personal.json";
import { fontVariables } from "@/themes/fonts";
import { DEFAULT_MODE, DEFAULT_THEME, themeCss, themeInitScript } from "@/themes";
import "./globals.css";

export const metadata: Metadata = {
  // Makes link-preview image URLs absolute, as LinkedIn and others require
  metadataBase: new URL(personal.url),
  title: {
    default: `${personal.name} — Software Engineer`,
    template: `%s — ${personal.name}`,
  },
  description: personal.bio,
  openGraph: {
    type: "website",
    siteName: personal.name,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-palette={DEFAULT_THEME}
      data-theme={DEFAULT_MODE === "light" ? "light" : "dark"}
      className={fontVariables}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <Header name={personal.name} />
        <div className="flex-1">{children}</div>
        <Footer personal={personal} />
      </body>
    </html>
  );
}
