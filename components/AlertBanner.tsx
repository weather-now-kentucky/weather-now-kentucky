import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle } from "lucide-react";
import type { WeatherAlert } from "@/lib/weather";

export function AlertBanner({ alert }: { alert: WeatherAlert }) {
  const expiration = alert.expires ? new Date(alert.expires) : null;

  return (
    <article className="alert-banner">
      <div className="alert-icon">
        <AlertTriangle aria-hidden="true" size={24} />
      </div>
      <div className="alert-body">
        <h3>{alert.event}</h3>
        <p>{alert.areaDesc}</p>
        <span>
          {expiration ? `Expires ${formatDistanceToNowStrict(expiration, { addSuffix: true })}` : "Expiration unavailable"}
        </span>
      </div>
    </article>
  );
}
