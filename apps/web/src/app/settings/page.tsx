import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { MailSetup } from "@/components/settings/MailSetup";
import "@/components/settings/settings.css";
import "@/components/desk/desk.css";

export default function SettingsPage() {
  return (
    <div className="desk">
      <div className="desk__head">
        <div>
          <h1>Settings</h1>
          <p>Gmail, Salesforce, Rocketlane, Slack, Sarvam.</p>
        </div>
        <MailSetup />
      </div>
      <IntegrationsPanel />
    </div>
  );
}
