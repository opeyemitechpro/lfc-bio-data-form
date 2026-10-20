import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Membership Bio-Data Registration | LFC Laderin-Hilltop",
    template: "%s | LFC Laderin-Hilltop",
  },
  description:
    "Register your membership bio-data and passport photograph with Living Faith Church International, Laderin-Hilltop.",
  applicationName: "LFC Laderin-Hilltop Membership",
  icons: {
    icon: [{ url: "/brand/lfc-logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/lfc-logo.svg" }],
  },
  openGraph: {
    title: "Living Faith Church International — Laderin-Hilltop",
    description: "Membership Bio-Data Registration",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#123a8f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ duration: 6000 }}
        />
      </body>
    </html>
  );
}
