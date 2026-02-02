import { ToastProvider } from "@/components/ui/toaster";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/lib/stack";
import "./globals.css";
import { Inter } from "next/font/google"; // Using Inter for clean premium look
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL("https://beybracket.com"),
  title: {
    default: "Beybracket",
    template: "%s | Beybracket",
  },
  description: "The Ultimate Beyblade X Tournament Manager. Create, manage, and share your tournaments with ease.",
  keywords: ["Beyblade", "Beyblade X", "Tournament", "Bracket", "Swiss", "Competition", "Manager"],
  authors: [{ name: "BeyBracket Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://beybracket.com",
    siteName: "BeyBracket",
    title: "BeyBracket - Beyblade X Tournament Manager",
    description: "Create and manage Beyblade X tournaments with Swiss rounds and elimination brackets.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BeyBracket - Tournament Manager",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BeyBracket - Beyblade X Tournament Manager",
    description: "Create and manage Beyblade X tournaments with Swiss rounds and elimination brackets.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { Suspense } from "react";
import Link from "next/link"; // Not used but keeps imports valid
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import LiveMatchTicker from "@/components/features/live-match-ticker";

export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/auth/auth-guard";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "min-h-screen bg-background text-foreground antialiased")}>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <ToastProvider>
              <Suspense fallback={null}>
                <AuthGuard />
              </Suspense>
              <div className="relative flex min-h-screen flex-col">
                <LiveMatchTicker />
                <Suspense fallback={<div className="h-14 border-b bg-background/95" />}>
                  <SiteHeader />
                </Suspense>
                <main className="flex-1">{children}</main>
                <SiteFooter />
              </div>
            </ToastProvider>
          </StackTheme>
        </StackProvider>
      </body >
    </html >
  );
}
