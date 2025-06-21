import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { OnlineStatusProvider } from "@/components/OnlineStatusProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PWAAssets } from "@/components/PWAAssets";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeDash",
  description: "Your personal dashboard.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <PWAAssets />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <OnlineStatusProvider>
            <div className="relative flex min-h-screen flex-col">
              <OfflineBanner />
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
          </OnlineStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
