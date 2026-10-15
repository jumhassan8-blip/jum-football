import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/store";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import AdSenseRuntime from "@/components/AdSenseRuntime";
import ConsentModeScript from "@/components/ConsentModeScript";
import CookieConsent from "@/components/CookieConsent";
import Footer from "@/components/Footer";
import { ConfettiLayer, StreakToast } from "@/components/Chrome";

export const metadata: Metadata = {
  title: "JUM Football",
  description: "Live scores, JUM Pulse crowd reactions, every league in the world.",
};

export const viewport: Viewport = {
  themeColor: "#0B0E13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-white antialiased">
        <ConsentModeScript />
        <I18nProvider>
          <AuthProvider>
            <ToastProvider>
              <AdSenseRuntime />
              {children}
              <Footer />
              <CookieConsent />
              <StreakToast />
              <ConfettiLayer />
              {/* page-level sticky ad: placed by the page itself so its
                  reserved height matches the content (no layout shift on
                  placeholder→real swap). BottomNav stays on top at z-50. */}
            </ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
