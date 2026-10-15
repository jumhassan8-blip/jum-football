import { allLeagueIds, leagueById, getMatchesByLeague, getStandings, getTopScorers } from "@/lib/api";
import LeagueView from "@/components/LeagueView";
import AdBanner from "@/components/AdBanner";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return allLeagueIds().map((id) => ({ id }));
}

export default async function LeaguePage({ params }: { params: { id: string } }) {
  const standings = await getStandings(params.id);
  const matches = await getMatchesByLeague(params.id);
  const scorers = await getTopScorers(params.id);
  if (!leagueById(params.id)) notFound();
  return (
    <>
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>
      <LeagueView leagueId={params.id} standings={standings} matches={matches} scorers={scorers} />
    </>
  );
}
