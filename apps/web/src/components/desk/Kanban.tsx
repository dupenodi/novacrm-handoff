import { STAGES, type Client } from "@/lib/clients";
import { ClientCard } from "./ClientCard";

function KanbanColumn({ label, clients }: { label: string; clients: Client[] }) {
  return (
    <section className="kanban__col">
      <h2>
        {label}
        <span className="kanban__count">{clients.length}</span>
      </h2>
      {clients.length === 0 ? <p className="kanban__empty">None</p> : null}
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} />
      ))}
    </section>
  );
}

export function Kanban({ clients }: { clients: Client[] }) {
  return (
    <div className="kanban">
      {STAGES.map((stage) => (
        <KanbanColumn
          key={stage.id}
          label={stage.label}
          clients={clients.filter((client) => client.stage === stage.id)}
        />
      ))}
    </div>
  );
}
