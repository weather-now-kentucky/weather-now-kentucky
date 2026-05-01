import Link from "next/link";
import { getPrimaryAlert } from "@/lib/alertPriority";
import type { WeatherAlert } from "@/lib/weather";

function formatExpiration(expires: string | null) {
  if (!expires) {
    return "further notice";
  }

  return new Date(expires).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatAffectedAreas(areaDesc: string) {
  const areas = areaDesc
    .split(";")
    .flatMap((area) => area.split(","))
    .map((area) => area.trim())
    .filter(Boolean);
  const uniqueAreas = Array.from(new Set(areas));
  const visibleAreas = uniqueAreas.slice(0, 4);
  const hiddenCount = Math.max(uniqueAreas.length - visibleAreas.length, 0);

  if (!visibleAreas.length) {
    return "Kentucky";
  }

  return `${visibleAreas.join(", ")}${hiddenCount > 0 ? ` + ${hiddenCount} more` : ""}`;
}

export function WeatherAlertBanner({ alerts }: { alerts: WeatherAlert[] }) {
  const primaryAlert = getPrimaryAlert(alerts);

  if (!primaryAlert) {
    return null;
  }

  const moreCount = alerts.length - 1;
  const { alert, tone } = primaryAlert;

  return (
    <section className={`home-alert home-alert-${tone}`}>
      <div className="home-alert-copy">
        <span className="home-alert-label">Weather Alert</span>
        <strong className="home-alert-event">{alert.event}</strong>
        <span className="home-alert-separator">&mdash;</span>
        <span className="home-alert-areas">{formatAffectedAreas(alert.areaDesc)}</span>
        <span className="home-alert-until">
          Until <strong>{formatExpiration(alert.expires)}</strong>
        </span>
      </div>
      {moreCount > 0 ? (
        <Link className="home-alert-more" href="/alerts">
          + {moreCount} more active alerts
        </Link>
      ) : null}
    </section>
  );
}
