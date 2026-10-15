import { notFound } from "next/navigation";
import { allPlayerIds, playerById } from "@/lib/api";
import PlayerView from "@/components/PlayerView";

export function generateStaticParams() {
  return allPlayerIds().map((id) => ({ id }));
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const player = playerById(params.id);
  if (!player) notFound();
  return <PlayerView player={player} />;
}
