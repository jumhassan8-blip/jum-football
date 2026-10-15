import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Jum Football",
  description:
    "How Jum Football collects, uses, and protects your data, including Google AdSense cookies.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" subtitle="Effective October 14, 2026">
      <h2>1. Information We Collect</h2>
      <p>
        Jum Football is designed to work with minimal personal data. Your favorite
        teams, browsing preferences, and app settings are stored locally on your
        device. We collect your name and email address only if you create a JUM PRO
        subscription or contact us through the contact form.
      </p>

      <h2>2. Cookies &amp; Google AdSense</h2>
      <p>
        We use Google AdSense to display advertisements. Google uses cookies
        (including the DoubleClick cookie) to serve ads based on your prior visits
        to this website or other websites. You may opt out of personalized
        advertising by visiting{" "}
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer">
          google.com/settings/ads
        </a>
        . If you are in the EEA or UK, we ask for your consent before enabling
        ad cookies, and you can withdraw it at any time from the cookie banner.
      </p>

      <h2>3. Google&rsquo;s Advertising Cookies</h2>
      <p>
        Third-party vendors, including Google, use cookies to serve ads based on
        your prior visits to this website or other websites. Google&rsquo;s use of
        advertising cookies enables it and its partners to serve ads to you based
        on your visit to this site and/or other sites on the Internet. Details:
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer">
          policies.google.com/technologies/ads
        </a>
        .
      </p>

      <h2>4. Log Data</h2>
      <p>
        Like most websites, we collect log data for analytics and security: IP
        address, browser type, pages visited, and timestamps. This data is used in
        aggregate to improve the service and is not sold to third parties.
      </p>

      <h2>5. Third Parties</h2>
      <p>
        We use API-Football (api-sports.io) for live scores, Google Analytics for
        anonymous usage statistics, and Firebase (Google) for authentication,
        chat, and cloud storage. Each provider processes data under its own
        privacy policy.
      </p>

      <h2>6. Children&rsquo;s Privacy</h2>
      <p>
        Jum Football is a general-audience service and is not directed at children
        under 13. We do not knowingly collect personal information from children
        under 13. If you believe a child has provided us personal data, contact us
        and we will delete it.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about this policy:{" "}
        <a href="mailto:contact@jumfootball.com">contact@jumfootball.com</a>.
      </p>
    </LegalPage>
  );
}
