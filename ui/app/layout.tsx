import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Geist } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ReviewsProvider } from "@/lib/store/reviews-store";
import { PlannerProvider } from "@/lib/store/planner-store";
import { PrefsProvider } from "@/lib/store/prefs-store";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OMSCS Hub — A Registry of Courses, Reviews & Plans",
  description:
    "A combined catalog, review archive, and degree planner for the Georgia Tech Online Master of Science in Computer Science program.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        display.variable,
        sans.variable,
        mono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-svh bg-paper text-ink">
        <ThemeProvider>
          <ReviewsProvider>
            <PlannerProvider>
              <PrefsProvider>
                <SiteNav />
                <main className="grain relative">{children}</main>
                <SiteFooter />
              </PrefsProvider>
            </PlannerProvider>
          </ReviewsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
