import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Sun, Wind } from "lucide-react";
import type { ForecastPeriod } from "@/lib/weather";

function getWeatherIcon(summary = "") {
  const lower = summary.toLowerCase();

  if (lower.includes("thunder") || lower.includes("storm")) {
    return CloudLightning;
  }

  if (lower.includes("snow") || lower.includes("sleet") || lower.includes("ice")) {
    return CloudSnow;
  }

  if (lower.includes("rain") || lower.includes("shower")) {
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

export function ForecastCard({ period, high, low }: { period: ForecastPeriod; high?: number; low?: number }) {
  const WeatherIcon = getWeatherIcon(period.shortForecast);

  return (
    <article className="forecast-card card">
      <div className="forecast-card-top">
        <h3>{period.name}</h3>
        <WeatherIcon aria-hidden="true" size={38} />
      </div>
      <p className="forecast-temp">High: {high ?? period.temperature}° / Low: {low ?? period.temperature}°</p>
      <p className="forecast-short">{period.shortForecast}</p>
      <div className="forecast-meta">
        <span>
          <Wind aria-hidden="true" size={16} />
          {period.windSpeed} {period.windDirection}
        </span>
        {typeof period.probabilityOfPrecipitation?.value === "number" ? (
          <span>
            <Droplets aria-hidden="true" size={16} />
            {period.probabilityOfPrecipitation.value}%
          </span>
        ) : null}
      </div>
    </article>
  );
}
