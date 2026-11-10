import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "./tokens.css";
import "./globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AppProvider } from "@/state/app-provider";

/**
 * Overpass (variable, latin subset, ~39 kB woff2), self-hosted from the
 * @fontsource-variable package and preloaded by next/font with a size-adjusted
 * fallback, so there is no third-party font request and no layout shift.
 * Overpass descends from Highway Gothic, the US road-sign face, which keeps the
 * interface in the vocabulary of transit signage rather than generic SaaS.
 */
// app/fonts/ holds the Fontsource build of Overpass 4.000 with its GDEF mark
// class corrected (see scripts/fonts/patch-overpass.py); the unpatched file
// renders the middle dot with zero width in Chrome and Firefox.
const overpass = localFont({
  src: "./fonts/overpass-latin-wght-normal.woff2",
  variable: "--font-overpass",
  display: "swap",
  weight: "100 900",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  title: {
    default: "BusTrack · Know before you go",
    template: "%s · BusTrack",
  },
  description:
    "BusTrack helps Lords Institute of Engineering and Technology students in Hyderabad find their college bus route and see an estimated arrival time. Sign in to open the dashboard.",
  applicationName: "BusTrack",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BusTrack",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={overpass.variable}>
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-card"
        >
          Skip to content
        </a>
        {/* The signed-in workspace shell is applied only inside app/(app)/layout.tsx,
            so the public homepage and auth screens keep their own chrome. */}
        <MotionProvider>
          <AppProvider>{children}</AppProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
