import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRefById, REFEREES } from "@/lib/fanintel";
import RefereeDetail from "./RefereeDetail";

export function generateStaticParams() {
  return REFEREES.map((r) => ({ id: r.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const ref = getRefById(params.id);
  const title = ref
    ? `${ref.name} Fairness Stats — Fan Ratings | Jum Football`
    : "Referee Fairness Tracker | Jum Football";
  return {
    title,
    openGraph: { title },
  };
}

export default function Page({ params }: { params: { id: string } }) {
  const ref = getRefById(params.id);
  if (!ref) notFound();
  return <RefereeDetail refData={ref} />;
}
