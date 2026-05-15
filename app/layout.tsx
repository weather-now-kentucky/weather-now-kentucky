import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveNowBanner } from "@/components/LiveNowBanner";
import { SevereModeLabel } from "@/components/SevereModeLabel";
import { SiteNavigation, type SiteNavItem } from "@/components/SiteNavigation";
import { isSevereWeatherMode } from "@/lib/alertPriority";
import { getSiteSettings } from "@/lib/content";
import { getKentuckyAlerts, type WeatherAlert } from "@/lib/weather";
import "./globals.css";
import "@/components/components.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weather Now Kentucky",
  description: "Kentucky forecast, radar, alerts, live weather coverage, and local updates."
};

const navItems: SiteNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/outlook", label: "7 Day" },
  { href: "/radar", label: "Radar" },
  { href: "/live", label: "LIVE" },
  { href: "/alerts", label: "Alerts" },
  { href: "/blog", label: "Blog" },
  { href: "/wolf-country", label: "Wolf" },
  { href: "/team", label: "Team" },
  { href: "/admin", label: "Admin" }
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  let alerts: WeatherAlert[] = [];

  try {
    alerts = await getKentuckyAlerts();
  } catch {
    alerts = [];
  }

  const severeMode = isSevereWeatherMode(alerts);

  return (
    <html lang="en">
      <head>
        <link href="/manifest.json" rel="manifest" />
        <meta content="#07111f" name="theme-color" />
        <link href="/icons/icon-192.png" rel="apple-touch-icon" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="WNK Weather" name="apple-mobile-web-app-title" />
        <meta content="black-translucent" name="apple-mobile-web-app-status-bar-style" />
      </head>
      <body>
        <div className={severeMode ? "site-shell severe-mode" : "site-shell"}>
          <LiveNowBanner isLive={settings.isLive} />
          <SevereModeLabel active={severeMode} />
          <header className="top-bar">
            <div className="top-bar-inner">
              <div className="brand-row">
                <Link className="brand" href="/">
                  <img alt="Weather Now Kentucky logo" className="brand-logo" src="/images/wnk-logo.png" />
                  <span className="brand-text">
                  <strong>Weather Now Kentucky</strong>
                  <span>Forecasts, alerts, live coverage</span>
                  </span>
                </Link>
              </div>
              <SiteNavigation items={navItems} />
            </div>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <div className="footer-inner">
              Weather Now Kentucky uses National Weather Service data for public weather information.
            </div>
          </footer>
         </div>
        <Analytics />
       <SpeedInsights />
      </body>
    </html>
  );
}
