import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import personal from "@/data/personal.json";
import { fontVariables } from "@/themes/fonts";
import { DEFAULT_THEME, themeCss, themeInitScript } from "@/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${personal.name} — Software Engineer`,
    template: `%s — ${personal.name}`,
  },
  description: personal.bio,
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
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
