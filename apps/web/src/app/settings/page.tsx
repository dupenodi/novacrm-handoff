import { PageHeader } from "@novacrm/ui/domain";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import "@/components/settings/settings.css";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        sub="Connect the apps that new-customer onboarding runs on."
      />

      <div className="settings-sections">
        <section className="settings-section" id="integrations" aria-label="Integrations">
          <IntegrationsPanel />
        </section>
      </div>
    </>
  );
}
