import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsProvider } from "@/lib/analytics";
import { MetaPixel } from "@/lib/meta-pixel";

export const metadata: Metadata = {
  title: "Motivation Companion",
  description: "Your AI coaching companion for clarity, goals, and action.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AnalyticsProvider>{children}</AnalyticsProvider>
        <MetaPixel />
      </body>
    </html>
  );
}
