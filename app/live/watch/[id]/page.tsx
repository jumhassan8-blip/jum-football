import { notFound } from "next/navigation";
import { liveMatchById, MOCK_LIVE_MATCHES } from "@/lib/leaguesData";
import LiveWatch from "@/components/LiveWatch";

export function generateStaticParams() {
  return MOCK_LIVE_MATCHES.map((m) => ({ id: String(m.id) }));
}

export default function WatchPage({ params }: { params: { id: string } }) {
  const match = liveMatchById(Number(params.id));
  if (!match) notFound();
  return <LiveWatch match={match} />;
}
