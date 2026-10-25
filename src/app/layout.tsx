import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

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
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{ duration: 6000 }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
