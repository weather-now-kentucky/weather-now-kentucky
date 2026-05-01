import type { Metadata } from "next";
import Link from "next/link";
import { LiveNowBanner } from "@/components/LiveNowBanner";
import { SevereModeLabel } from "@/components/SevereModeLabel";
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

const navItems = [
  { href: "/", label: "Home" },
  { href: "/radar", label: "Radar" },
  { href: "/alerts", label: "Alerts" },
  { href: "/live", label: "Live" },
  { href: "/blog", label: "Blog" },
  { href: "/sponsors", label: "Sponsors" },
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
      <body>
        <div className={severeMode ? "site-shell severe-mode" : "site-shell"}>
          <LiveNowBanner isLive={settings.isLive} />
          <SevereModeLabel active={severeMode} />
          <header className="top-bar">
            <div className="top-bar-inner">
              <div className="brand-row">
                <Link className="brand" href="/">
                  <strong>Weather Now Kentucky</strong>
                  <span>Forecasts, alerts, live coverage</span>
                </Link>
              </div>
              <nav aria-label="Main navigation" className="nav">
                {navItems.map((item) => (
                  <Link href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <div className="footer-inner">
              Weather Now Kentucky uses National Weather Service data for public weather information.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
