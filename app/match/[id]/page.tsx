import { MOCK_MATCHES, MOCK_MATCH, mockMatchById } from "../../../lib/lifestyleData";
import { MATCHES } from "../../../lib/jumMock";
import MatchScreen from "../../../components/MatchScreen";

export function generateStaticParams() {
  const premiumIds = MOCK_MATCHES.map((m) => ({ id: String(m.id) }));
  const matchTabIds = MATCHES.map((m: { id: string }) => ({ id: m.id }));
  return [...premiumIds, ...matchTabIds];
}

export default function Page({ params }: { params: { id: string } }) {
  const match = mockMatchById(Number(params.id)) ?? MOCK_MATCH;
  return <MatchScreen match={match} />;
}
