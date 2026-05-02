"use client";

import { useEffect, useMemo, useState } from "react";
import { ForecastCard } from "@/components/ForecastCard";
import { KentuckyFocusTiles } from "@/components/KentuckyFocusTiles";
import { SectionSponsorTag } from "@/components/SectionSponsorTag";
import { readWeatherLocation } from "@/lib/weatherLocation";
import type { ForecastPeriod, PointForecast } from "@/lib/weather";

const fallbackLocation = {
  latitude: 38.2527,
  longitude: -85.7585,
  displayName: "Louisville, KY"
};

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

export function OutlookWeather() {
  const [forecast, setForecast] = useState<PointForecast | null>(null);
  const [locationLabel, setLocationLabel] = useState(fallbackLocation.displayName);
  const [message, setMessage] = useState("Loading National Weather Service forecast...");
  const cards = useMemo(() => buildDailyCards(forecast?.periods ?? []), [forecast]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const location = readWeatherLocation() ?? fallbackLocation;
    setLocationLabel(location.displayName);

    async function loadForecast() {
      try {
        const response = await fetch(`/api/forecast?lat=${location.latitude}&lon=${location.longitude}`, { signal: controller.signal });
        const data: PointForecast & { error?: string } = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Forecast request failed.");
        }

        if (active) {
          setForecast(data);
          setLocationLabel(data.locationLabel ?? location.displayName);
          setMessage("Forecast from the National Weather Service.");
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setMessage(error instanceof Error ? error.message : "Unable to load forecast.");
        }
      }
    }

    loadForecast();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <section className="home-weather">
      <section className="forecast-section">
        <div className="forecast-heading">
          <div>
            <span className="eyebrow">Seven-Day Forecast</span>
            <h2>Next up across Kentucky</h2>
          </div>
          <SectionSponsorTag sectionKey="outlook_seven_day" />
        </div>
        <p className="status-line">
          {locationLabel} - {message}
        </p>
        {cards.length === 0 ? <p className="status-line">No forecast periods are available yet.</p> : null}
        <div className="forecast-grid">
          {cards.map(({ period, high, low }) => (
            <ForecastCard high={high} key={period.number} low={low} period={period} />
          ))}
        </div>
      </section>
      <KentuckyFocusTiles sponsorKey="outlook_regional_breakdown" />
    </section>
  );
}
