import { AlertBanner } from "@/components/AlertBanner";
import { SectionSponsorTag } from "@/components/SectionSponsorTag";
import { getKentuckyAlerts, type WeatherAlert } from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  let alerts: WeatherAlert[] = [];
  let error = "";

  try {
    alerts = await getKentuckyAlerts();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unable to fetch active alerts.";
  }

  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Active Alerts</span>
        <h1>Kentucky watches, warnings, and advisories.</h1>
        <p className="lede">Active Weather.gov alerts filtered to Kentucky, including event type, expiration, and affected areas.</p>
        <SectionSponsorTag sectionKey="alerts_main" />
      </section>
      <section className="grid">
        {error ? <p className="panel">{error}</p> : null}
        {!error && alerts.length === 0 ? <p className="panel">No active Kentucky alerts are currently listed.</p> : null}
        {alerts.map((alert) => (
          <AlertBanner alert={alert} key={alert.id} />
        ))}
      </section>
    </>
  );
}
