"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type RadarCenter = {
  lat: number;
  lon: number;
  label: string;
  zoom: number;
};

const defaultRadarCenter: RadarCenter = {
  lat: 38.017,
  lon: -85.887,
  label: "Kentucky",
  zoom: 6.93
};

const selectedLocationZoom = 8.5;

function buildWeatherWiseUrl(center: RadarCenter) {
  return `https://web.weatherwise.app/#map=${center.zoom}/${center.lat.toFixed(4)}/${center.lon.toFixed(4)}&m=COMPOSITE&autoplay=1&ui=0`;
}

export function RadarTabs() {
  const [activeTab, setActiveTab] = useState<"live" | "future">("live");
  const [center, setCenter] = useState<RadarCenter>(defaultRadarCenter);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationStatus, setLocationStatus] = useState("Radar is centered on Kentucky.");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const liveRadarUrl = useMemo(() => buildWeatherWiseUrl(center), [center]);

  function updateRadarCenter(lat: number, lon: number, label: string) {
    setCenter({ lat, lon, label, zoom: selectedLocationZoom });
    setLocationStatus(`Radar centered on ${label}.`);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser. Search by city or ZIP instead.");
      return;
    }

    setIsLocating(true);
    setLocationStatus("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateRadarCenter(position.coords.latitude, position.coords.longitude, "your location");
        setIsLocating(false);
      },
      () => {
        setLocationStatus("Location access denied. Search by city or ZIP instead.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 10000
      }
    );
  }

  async function handleLocationSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = locationQuery.trim();

    if (!query) {
      setLocationStatus("Enter a city or ZIP code to center the radar.");
      return;
    }

    setIsSearching(true);
    setLocationStatus(`Searching for ${query}...`);

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as { error?: string; label?: string; lat?: number; lon?: number };

      if (!response.ok || typeof data.lat !== "number" || typeof data.lon !== "number") {
        throw new Error(data.error ?? "Unable to find that location.");
      }

      updateRadarCenter(data.lat, data.lon, data.label ?? query);
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : "Unable to center radar on that location.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="radar-panel">
      <div className="radar-location-tools">
        <div>
          <span className="eyebrow">Radar Location</span>
          <p>{locationStatus}</p>
        </div>
        <form className="radar-location-form" onSubmit={handleLocationSearch}>
          <label htmlFor="radarLocationSearch">City or ZIP code</label>
          <div className="radar-location-row">
            <input
              id="radarLocationSearch"
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="Elizabethtown, KY or 42701"
              type="search"
              value={locationQuery}
            />
            <button disabled={isSearching} type="submit">
              {isSearching ? "Searching..." : "Center Radar"}
            </button>
          </div>
        </form>
        <button className="radar-location-button" disabled={isLocating} onClick={handleUseMyLocation} type="button">
          {isLocating ? "Locating..." : "Use My Location"}
        </button>
      </div>

      <div className="radar-tabs" role="tablist" aria-label="Radar views">
        <button
          aria-selected={activeTab === "live"}
          className="radar-tab"
          onClick={() => setActiveTab("live")}
          role="tab"
          type="button"
        >
          Live Radar
        </button>
        <button
          aria-selected={activeTab === "future"}
          className="radar-tab"
          onClick={() => setActiveTab("future")}
          role="tab"
          type="button"
        >
          Future Radar
        </button>
      </div>

      <div className="radar-frame-wrap" role="tabpanel">
        {activeTab === "live" ? (
          <>
            <iframe
              allowFullScreen
              className="radar-frame"
              key={liveRadarUrl}
              referrerPolicy="strict-origin-when-cross-origin"
              src={liveRadarUrl}
              title="WeatherWise live radar for Kentucky"
            />
            <p className="radar-fallback">
              If the live radar does not load,{" "}
              <a href={liveRadarUrl} rel="noopener noreferrer" target="_blank">
                open WeatherWise radar in a new tab
              </a>
              .
            </p>
          </>
        ) : (
          <div className="radar-placeholder">
            <span className="eyebrow">Future Radar</span>
            <h2>Future radar coming soon.</h2>
            <p>
              WeatherWise HRRR future radar will be added here when the embed URL is available. It will use the same
              selected center near {center.label}.
            </p>
          </div>
        )}
      </div>

      <div className="weatherwise-attribution">
        <p>Radar powered by WeatherWise.</p>
        <a className="weatherwise-logo-link" href="https://weatherwise.app" rel="noopener noreferrer" target="_blank">
          <img alt="WeatherWise logo" src="https://web.weatherwise.app/favicon.ico" />
          <span>More Radar &amp; Model Tools from WeatherWise</span>
        </a>
      </div>
    </section>
  );
}
