import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Sun, Wind } from "lucide-react";
import type { HourlyForecastHour } from "@/lib/weather";
import { SectionSponsorTag } from "@/components/SectionSponsorTag";

type HourlyForecastProps = {
  hours: HourlyForecastHour[];
};

function getWeatherIcon(summary = "") {
  const lower = summary.toLowerCase();

  if (lower.includes("thunder") || lower.includes("storm")) {
    return CloudLightning;
  }

  if (lower.includes("snow") || lower.includes("sleet") || lower.includes("ice")) {
    return CloudSnow;
  }

  if (lower.includes("rain") || lower.includes("shower") || lower.includes("drizzle")) {
    return CloudRain;
  }

  if (lower.includes("fog") || lower.includes("haze")) {
    return CloudFog;
  }

  if (lower.includes("cloud") || lower.includes("overcast")) {
    return Cloud;
  }

  if (lower.includes("sun") || lower.includes("clear")) {
    return Sun;
  }

  return CloudSun;
}

function formatHour(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric"
  });
}

export function HourlyForecast({ hours }: HourlyForecastProps) {
  if (!hours.length) {
    return null;
  }

  return (
    <section className="hourly-section">
      <div className="forecast-heading">
        <div>
          <span className="eyebrow">Next 12 Hours</span>
          <h2>Hour-by-hour conditions</h2>
        </div>
        <SectionSponsorTag sectionKey="home_hourly_conditions" />
      </div>
      <div aria-label="Next 12 hours forecast" className="hourly-scroll">
        {hours.map((hour) => {
          const Icon = getWeatherIcon(hour.textDescription);
          const wind =
            typeof hour.windSpeed === "number"
              ? `${hour.windSpeed} mph${hour.windDirection ? ` ${hour.windDirection}` : ""}`
              : "--";

          return (
            <article className="hourly-card" key={hour.time}>
              <time dateTime={hour.time}>{formatHour(hour.time)}</time>
              <Icon aria-hidden="true" className="hourly-icon" />
              <strong>{typeof hour.temperature === "number" ? `${hour.temperature}°` : "--"}</strong>
              <span>{hour.textDescription ?? "Conditions"}</span>
              <div className="hourly-meta">
                <span>
                  <Droplets aria-hidden="true" size={14} />
                  {typeof hour.precipChance === "number" ? `${hour.precipChance}%` : "--"}
                </span>
                <span>
                  <Wind aria-hidden="true" size={14} />
                  {wind}
                </span>
                {typeof hour.windGust === "number" ? <span>Gust {hour.windGust} mph</span> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
