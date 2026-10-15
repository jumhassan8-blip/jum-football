import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Jum Football",
  description:
    "The terms governing your use of Jum Football: informational content, fan analysis, no affiliation.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" subtitle="Effective October 14, 2026">
      <h2>1. Informational Content Only</h2>
      <p>
        Live scores, statistics, referee ratings, and all other content on Jum
        Football are provided for personal, informational, and entertainment
        purposes only. They are not official records and must not be relied upon
        for decisions of any kind.
      </p>

      <h2>2. No Affiliation</h2>
      <p>
        Jum Football is an independent fan platform. We are not affiliated with,
        endorsed by, or sponsored by the Premier League, the Turkish Super Lig,
        FIFA, UEFA, or any club, federation, or broadcaster. All team and league
        names belong to their respective owners.
      </p>

      <h2>3. Fan Analysis and Opinion</h2>
      <p>
        Match IQ momentum metrics, referee fairness ratings, attack pressure
        indexes, and similar features are crowd-sourced fan analysis and opinion.
        Referee ratings in particular are fan-vote illustrations — not official
        officiating records.
      </p>

      <h2>4. Service Provided As-Is</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
        without warranties of any kind. Live data may be delayed or inaccurate.
        We may modify or discontinue features at any time.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>
        You agree not to abuse, scrape, or reverse-engineer the service, not to
        post unlawful content in chat, and not to misrepresent fan-generated
        ratings as official statistics.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href="mailto:contact@jumfootball.com">contact@jumfootball.com</a>.
      </p>
    </LegalPage>
  );
}
