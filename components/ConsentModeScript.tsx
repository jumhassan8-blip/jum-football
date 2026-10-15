"use client";

import Script from "next/script";

/**
 * AdSense / Google default-consent mode: every tag fires with DENIED
 * until the visitor accepts (CookieConsent then calls
 * gtag('consent','update',{ad_storage:'granted',…})). Required for
 * EEA/UK ad personalization. Loads once, beforeInteractive.
 */
export default function ConsentModeScript() {
  return (
    <Script id="jum-consent-mode" strategy="beforeInteractive">
      {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});
gtag('js', new Date());`}
    </Script>
  );
}
