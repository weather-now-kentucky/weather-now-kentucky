"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCcw,
  Sun,
  Wind
} from "lucide-react";
import { ForecastCard } from "@/components/ForecastCard";
import { GeorgesForecastBox } from "@/components/GeorgesForecastBox";
import { HomeLivePreview } from "@/components/HomeLivePreview";
import { KentuckyFocusTiles } from "@/components/KentuckyFocusTiles";
import type { ForecastPeriod, PointForecast } from "@/lib/weather";

type GeoState = {
  lat: number;
  lon: number;
};

const kentuckyDefault: GeoState = {
  lat: 38.2527,
  lon: -85.7585
};

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

function buildDailyCards(periods: ForecastPeriod[]) {
  const cards: { high: number; low: number; period: ForecastPeriod }[] = [];

  for (let index = 0; index < periods.length && cards.length < 7; index += 2) {
    const period = periods[index];
    const pairedPeriod = periods[index + 1];
    const temperatures = [period?.temperature, pairedPeriod?.temperature].filter(
      (temperature): temperature is number => typeof temperature === "number"
    );

    if (period && temperatures.length) {
      cards.push({
        high: Math.max(...temperatures),
        low: Math.min(...temperatures),
        period
      });
    }
  }

  return cards;
}

function celsiusToFahrenheit(value: number) {
  return Math.round((value * 9) / 5 + 32);
}

function formatTemperatureValue(value?: number | null, unitCode?: string) {
  if (typeof value !== "number") {
    return "--";
  }

  if (unitCode?.toLowerCase().includes("degc")) {
    return `${celsiusToFahrenheit(value)}°`;
  }

  return `${Math.round(value)}°`;
}

function formatWindGust(value?: number | null, unitCode?: string) {
  if (typeof value !== "number") {
    return "--";
  }

  const converted = unitCode?.toLowerCase().includes("km_h") ? Math.round(value * 0.621371) : Math.round(value);
  return `${converted} mph`;
}

type HomeWeatherProps = {
  forecastOverride: string;
  georgeForecastUpdatedAt: string;
  isLive: boolean;
  liveVideoId?: string;
};

export function HomeWeather({ forecastOverride, georgeForecastUpdatedAt, isLive, liveVideoId }: HomeWeatherProps) {
  const [location, setLocation] = useState<GeoState>(kentuckyDefault);
  const [forecast, setForecast] = useState<PointForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Using Louisville as the default while location permission is checked.");

  const sevenDayCards = useMemo(() => buildDailyCards(forecast?.periods ?? []), [forecast]);
  const current = forecast?.periods[0];
  const CurrentIcon = getWeatherIcon(current?.shortForecast);
  const feelsLike = formatTemperatureValue(current?.apparentTemperature?.value, current?.apparentTemperature?.unitCode);
  const windGust = formatWindGust(current?.windGust?.value, current?.windGust?.unitCode);

  useEffect(() => {
    if (!navigator.geolocation) {
      setMessage("Location detection is unavailable in this browser. Showing Louisville, Kentucky.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setMessage("Showing forecast for your detected location.");
      },
      () => {
        setMessage("Location permission was not granted. Showing Louisville, Kentucky.");
      },
      { enableHighAccuracy: false, maximumAge: 600000, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadForecast() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/forecast?lat=${location.lat}&lon=${location.lon}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Forecast request failed.");
        }

        if (!ignore) {
          setForecast(data);
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error instanceof Error ? error.message : "Unable to load forecast.");
          setForecast(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadForecast();

    return () => {
      ignore = true;
    };
  }, [location]);

  return (
    <section className="home-weather">
      <section className="current-conditions">
        <div className="current-primary">
          <span className="eyebrow">Current Conditions</span>
          <div className="current-temp-row">
            <p className="current-temp">{current ? `${current.temperature}°` : "--"}</p>
            <CurrentIcon aria-hidden="true" className="current-icon" />
          </div>
          <h1>{current ? current.shortForecast : "Loading forecast"}</h1>
          <p className="current-location">
            <MapPin aria-hidden="true" size={17} />
            Louisville, KY
          </p>
        </div>
        <div className="current-details">
          <div className="current-metric">
            <Wind aria-hidden="true" size={22} />
            <span>Wind</span>
            <strong>{current ? `${current.windSpeed} ${current.windDirection}` : "Waiting"}</strong>
          </div>
          <div className="current-metric">
            <CloudSun aria-hidden="true" size={22} />
            <span>Feels Like</span>
            <strong>{feelsLike}</strong>
          </div>
          <div className="current-metric">
            <Droplets aria-hidden="true" size={22} />
            <span>Humidity</span>
            <strong>
              {typeof current?.relativeHumidity?.value === "number" ? `${current.relativeHumidity.value}%` : "--"}
            </strong>
          </div>
          <div className="current-metric">
            <Wind aria-hidden="true" size={22} />
            <span>Wind Gust</span>
            <strong>{windGust}</strong>
          </div>
          <p className="location-note">{message}</p>
          <button className="button refresh-button" onClick={() => setLocation({ ...location })} type="button">
            <RefreshCcw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
      </section>

      <HomeLivePreview isLive={isLive} videoId={liveVideoId} />
      <KentuckyFocusTiles />
      <GeorgesForecastBox forecastOverride={forecastOverride} updatedAt={georgeForecastUpdatedAt} />

      <section className="forecast-section">
        <div className="forecast-heading">
          <span className="eyebrow">Seven-Day Forecast</span>
          <h2>Next up across Kentucky</h2>
        </div>
        {isLoading ? <p className="status-line">Loading forecast from the National Weather Service...</p> : null}
        {!isLoading && sevenDayCards.length === 0 ? <p className="status-line">No forecast periods are available.</p> : null}
        <div className="forecast-grid">
          {sevenDayCards.map(({ period, high, low }) => (
            <ForecastCard high={high} key={period.number} low={low} period={period} />
          ))}
        </div>
      </section>
    </section>
  );
}
