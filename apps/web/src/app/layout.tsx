import type { Metadata } from "next";
import { ThemeProvider, themeFontVariables } from "@novacrm/ui";
import { AppShell } from "@/components/chrome/AppShell";
import "@novacrm/ui/shell.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NovaCRM Handoff",
  description: "Agent-run customer onboarding for NovaCRM",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={themeFontVariables}>
      <body>
        <ThemeProvider theme="signal" className="app-root">
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
