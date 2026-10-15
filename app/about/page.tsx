import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "About — Jum Football",
  description:
    "Jum Football is a fan-intelligence platform: Match IQ momentum, referee fairness, attack pressure, and H2H history for the Premier League and Super Lig.",
};

export default function AboutPage() {
  return (
    <LegalPage title="About Jum Football">
      <p>
        Jum Football is a fan-intelligence platform for football supporters. We
        build Match IQ momentum models, a crowd-sourced referee fairness tracker,
        live attack pressure gauges, and head-to-head history — turning raw match
        data into signals fans actually care about.
      </p>
      <p>
        We are not a betting site. Nothing on Jum Football is financial advice,
        and none of our metrics are intended for wagering purposes.
      </p>
      <p>
        Founded in 2025, we cover the Premier League and the Turkish Super Lig,
        with AFCON and other competitions in view. Everything we publish is fan
        analysis and opinion built on public data.
      </p>
      <p>
        Contact: <a href="mailto:contact@jumfootball.com">contact@jumfootball.com</a>
      </p>
    </LegalPage>
  );
}
