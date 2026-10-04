import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppShell } from "@/components/shell/AppShell";
import { DeskProvider } from "@/components/shell/DeskProvider";
import { Toaster } from "@/components/ui/Toaster";
import { listDealSummaries } from "@/lib/server/store";
import type { DealSummary } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NovaCRM Onboarding", template: "%s · NovaCRM Onboarding" },
  description: "Deal handoffs from the CS inbox, onboarded by agents.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#171716" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The sidebar renders with real data on first paint; if the database is unreachable it loads client-side instead.
  const deals: DealSummary[] | null = await listDealSummaries().catch(() => null);

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Toaster>
          <DeskProvider initialDeals={deals}>
            <AppShell>{children}</AppShell>
          </DeskProvider>
        </Toaster>
      </body>
    </html>
  );
}
