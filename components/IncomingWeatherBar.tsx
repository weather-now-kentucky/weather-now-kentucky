import Link from "next/link";
import { CloudRain, CloudSnow, Zap } from "lucide-react";
import type { IncomingWeatherAlert } from "@/lib/incomingWeather";
import { SectionSponsorTag } from "@/components/SectionSponsorTag";

export function IncomingWeatherBar({ alert }: { alert: IncomingWeatherAlert }) {
  if (!alert.show) {
    return null;
  }

  const Icon = alert.type === "storm" ? Zap : alert.type === "snow" ? CloudSnow : CloudRain;

  return (
    <section className={`incoming-weather incoming-${alert.urgency}`}>
      <div className="incoming-copy">
        <Icon aria-hidden="true" size={24} />
        <div>
          <span>Heads Up</span>
          <strong>{alert.message}</strong>
        </div>
      </div>
      <SectionSponsorTag className="incoming-sponsor" sectionKey="home_incoming_weather_bar" />
      <Link className="button secondary" href="/radar">
        View Radar
      </Link>
    </section>
  );
}
