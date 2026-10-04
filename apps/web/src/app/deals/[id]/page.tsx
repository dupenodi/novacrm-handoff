import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DealScreen } from "@/components/deal/DealScreen";
import { getDealView } from "@/lib/server/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await getDealView((await params).id).catch(() => null);
  return { title: view?.deal.customerName ?? view?.email?.subject ?? "Onboarding" };
}

export default async function DealPage({ params }: Props) {
  const { id } = await params;
  const view = await getDealView(id);
  if (!view) notFound();
  // Keyed so switching deals starts fresh instead of carrying over the previous deal's state.
  return <DealScreen key={id} initial={view} />;
}
