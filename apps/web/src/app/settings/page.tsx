import type { Metadata } from "next";
import { InboxWatchSettings } from "@/components/settings/InboxWatchSettings";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { Page, PageHeader, Section } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Page>
      <PageHeader title="Settings" description="How the CS inbox is watched, and the services the agents work with." />
      <Section title="Inbox watching">
        <InboxWatchSettings />
      </Section>
      <Section title="Integrations">
        <IntegrationsPanel />
      </Section>
    </Page>
  );
}
