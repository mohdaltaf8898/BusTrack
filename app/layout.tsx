import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "./tokens.css";
import "./globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AppProvider } from "@/state/app-provider";

/**
 * Inter (variable, latin subset, ~48 kB woff2) self-hosted from the
 * @fontsource-variable package: preloaded by next/font with size-adjusted
 * fallbacks, so there is no third-party font request and no layout shift.
 */
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
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
  themeColor: "#0a182c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
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
