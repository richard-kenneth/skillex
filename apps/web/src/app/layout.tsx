import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_BASE_URL!),
  title: "SkillEx | Learn, Teach, Grow",
  description:
    "Master new skills by teaching what you know. 1-on-1 live video skill swaps with learners worldwide.",
  keywords: [
    "skill exchange",
    "learn skills",
    "teach skills",
    "skill swap",
    "peer learning",
    "video sessions",
    "online learning",
    "knowledge exchange",
  ],
  authors: [{ name: "SkillEx" }],
  creator: "SkillEx",
  publisher: "SkillEx",
  openGraph: {
    type: "website",
    siteName: "SkillEx",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "SkillEx — Master new skills by trading what you know",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SkillEx",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <head>
        <noscript>
          <style>{`
            [style*="opacity: 0"], [style*="opacity:0"], [style*="opacity: 0%"], [style*="opacity:0%"] {
              opacity: 1 !important;
              transform: none !important;
            }
          `}</style>
        </noscript>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background flex flex-col font-sans`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
