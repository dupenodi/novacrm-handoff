"use client";

import { useRouter } from "next/navigation";
import { Button } from "@novacrm/ui";
import { ctaFor, type Client } from "@/lib/clients";

export function ClientCard({ client }: { client: Client }) {
  const router = useRouter();
  const cta = ctaFor(client.stage);
  return (
    <article className="client-card">
      <div>
        <div className="client-card__name">{client.name}</div>
        <p className="client-card__meta">
          {[client.aeName, client.contactName].filter(Boolean).join(" · ") || "No people yet"}
        </p>
      </div>
      {cta ? (
        <Button variant="secondary" onClick={() => router.push(`/clients/${client.id}/${cta.href}`)}>
          {cta.label}
        </Button>
      ) : null}
    </article>
  );
}
