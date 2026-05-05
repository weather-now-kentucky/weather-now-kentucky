"use client";

import { Maximize2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { buildWeatherLocation, readWeatherLocation, saveWeatherLocation } from "@/lib/weatherLocation";

type RadarCenter = {
  lat: number;
  lon: number;
  label: string;
  zoom: number;
};

type TimeZoneId = "America/New_York" | "America/Chicago";

const defaultRadarCenter: RadarCenter = {
  lat: 38.017,
  lon: -85.887,
  label: "Kentucky",
  zoom: 6.93
};

const selectedLocationZoom = 8.5;
const mainHrrrCycles = [0, 6, 12, 18];
const hrrrCycleBufferMinutes = 90;

function buildWeatherWiseUrl(center: RadarCenter, isPlaying: boolean) {
  return `https://web.weatherwise.app/#map=${center.zoom}/${center.lat.toFixed(4)}/${center.lon.toFixed(4)}&m=COMPOSITE&autoplay=${isPlaying ? "1" : "0"}&ui=0`;
}

function formatHrrrRun(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");

  return `${year}_${month}_${day}_${hour}_00_00`;
}

function formatHrrrRunLabel(date: Date) {
  return `${String(date.getUTCHours()).padStart(2, "0")}z`;
}

function getLatestMainHrrrRun(now = new Date()) {
  const bufferedNow = new Date(now.getTime() - hrrrCycleBufferMinutes * 60 * 1000);
  const cycleHour = [...mainHrrrCycles].reverse().find((hour) => hour <= bufferedNow.getUTCHours()) ?? 18;
  const run = new Date(
    Date.UTC(bufferedNow.getUTCFullYear(), bufferedNow.getUTCMonth(), bufferedNow.getUTCDate(), cycleHour, 0, 0)
  );

  if (cycleHour === 18 && bufferedNow.getUTCHours() < 18) {
    run.setUTCDate(run.getUTCDate() - 1);
  }

  return run;
}

function buildWeatherWiseFutureUrl(center: RadarCenter, selectedRun: string) {
  // TODO: Ask WeatherWise whether embeds support playback speed, default animation speed, frame/time callbacks, or forecast-hour range caps.
  return `https://web.weatherwise.app/#map=${center.zoom}/${center.lat.toFixed(4)}/${center.lon.toFixed(4)}&m=MODEL&mid=HRRR&mr=CONUS&mn=${selectedRun}&mp=REFC_0_atmosphere_instant`;
}

function normalizeTimeZone(timezone?: string, longitude?: number): TimeZoneId {
  if (timezone === "America/Chicago" || timezone === "US/Central") {
    return "America/Chicago";
  }

  if (timezone === "America/New_York" || timezone === "US/Eastern") {
    return "America/New_York";
  }

  return typeof longitude === "number" && longitude <= -86.75 ? "America/Chicago" : "America/New_York";
}

function formatTimeZoneLabel(timeZone: TimeZoneId) {
  return timeZone === "America/Chicago" ? "Central Time" : "Eastern Time";
}

function formatLocalRunTime(date: Date, timeZone: TimeZoneId) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short"
  }).format(date);
}

function formatCurrentLocalTime(timeZone: TimeZoneId) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short"
  }).format(new Date());
}

export function RadarTabs() {
  const [activeTab, setActiveTab] = useState<"live" | "future">("live");
  const [center, setCenter] = useState<RadarCenter>(defaultRadarCenter);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationStatus, setLocationStatus] = useState("Radar is centered on Kentucky.");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLivePlaying, setIsLivePlaying] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZoneId>("America/New_York");
  const [latestMainHrrrRun, setLatestMainHrrrRun] = useState(() => getLatestMainHrrrRun());
  const [futureRadarReloadKey, setFutureRadarReloadKey] = useState(0);
  const liveRadarUrl = useMemo(() => buildWeatherWiseUrl(center, isLivePlaying), [center, isLivePlaying]);
  const latestMainHrrrRunId = useMemo(() => formatHrrrRun(latestMainHrrrRun), [latestMainHrrrRun]);
  const latestMainHrrrRunLabel = useMemo(() => formatHrrrRunLabel(latestMainHrrrRun), [latestMainHrrrRun]);
  const latestMainHrrrRunLocalTime = useMemo(
    () => formatLocalRunTime(latestMainHrrrRun, selectedTimeZone),
    [latestMainHrrrRun, selectedTimeZone]
  );
  const currentLocalTime = formatCurrentLocalTime(selectedTimeZone);
  const futureRadarUrl = useMemo(() => buildWeatherWiseFutureUrl(center, latestMainHrrrRunId), [center, latestMainHrrrRunId]);
  const selectedRadarUrl = activeTab === "live" ? liveRadarUrl : futureRadarUrl;
  const selectedRadarTitle = activeTab === "live" ? "WeatherWise live radar for Kentucky" : "WeatherWise HRRR future radar for Kentucky";

  useEffect(() => {
    const saved = readWeatherLocation();

    if (!saved) {
      return;
    }

    setCenter({
      lat: saved.latitude,
      lon: saved.longitude,
      label: saved.displayName,
      zoom: selectedLocationZoom
    });
    setLocationQuery(saved.query ?? "");
    setLocationStatus(`Using saved location: ${saved.displayName}.`);
    setSelectedTimeZone(normalizeTimeZone(saved.timezone, saved.longitude));
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    }

    document.body.classList.add("radar-fullscreen-active");
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove("radar-fullscreen-active");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isExpanded]);

  function updateRadarCenter(lat: number, lon: number, label: string, source: "detected" | "searched", query?: string) {
    const timeZone = normalizeTimeZone(undefined, lon);
    setCenter({ lat, lon, label, zoom: selectedLocationZoom });
    setSelectedTimeZone(timeZone);
    setLocationStatus(`Radar centered on ${label}.`);
    saveWeatherLocation(
      buildWeatherLocation({
        displayName: label,
        latitude: lat,
        longitude: lon,
        timezone: timeZone,
        source,
        query
      })
    );
  }

  function refreshModelRun() {
    setLatestMainHrrrRun(getLatestMainHrrrRun());
    setFutureRadarReloadKey((value) => value + 1);
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
        updateRadarCenter(position.coords.latitude, position.coords.longitude, "Detected Location", "detected");
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

      updateRadarCenter(data.lat, data.lon, data.label ?? query, "searched", query);
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
        <div className="radar-tab-group">
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
        <div className="radar-control-group">
          {activeTab === "live" ? (
            <button className="radar-control-button" onClick={() => setIsLivePlaying((value) => !value)} type="button">
              {isLivePlaying ? "Pause Radar" : "Play Radar"}
            </button>
          ) : null}
          <button className="radar-control-button" onClick={() => setIsExpanded(true)} type="button">
            <Maximize2 aria-hidden="true" size={16} />
            Full Screen
          </button>
        </div>
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
          <>
            <div className="future-radar-heading">
              <span className="eyebrow">Future Radar</span>
              <h2>HRRR Future Radar</h2>
              <div className="future-radar-runbar">
                <div>
                  <small>Using latest main HRRR run: {latestMainHrrrRunLabel}</small>
                  <p>
                    Model run: {latestMainHrrrRunLabel} / {latestMainHrrrRunLocalTime} {formatTimeZoneLabel(selectedTimeZone)}
                  </p>
                  <p>Your local time: {currentLocalTime}</p>
                </div>
                <button className="radar-control-button" onClick={refreshModelRun} type="button">
                  Refresh Model Run
                </button>
              </div>
              <div className="future-radar-helper">
                <p>Future radar updates automatically using the latest main HRRR run. No model run selection needed.</p>
                <p>Future radar starts from the selected HRRR run and advances forward in time.</p>
                <p>Use the play button inside the radar to animate.</p>
                <p>Tip: Use the WeatherWise playback controls to slow the animation if it moves too fast.</p>
                <small>Future radar guidance: now through roughly 30 hours.</small>
              </div>
              <div className="future-radar-recommendations">
                <strong>Recommendations</strong>
                <ul>
                  <li>Open the Model Drawer (bottom-left)</li>
                  <li>Set Reflectivity Gate Filter to +8 dBZ</li>
                  <li>Use Composite Reflectivity (for future radar)</li>
                  <li>Press Play to animate</li>
                </ul>
                <p>Model guidance - not real-time radar</p>
              </div>
            </div>
            <iframe
              allowFullScreen
              className="radar-frame"
              key={`${futureRadarUrl}-${futureRadarReloadKey}`}
              referrerPolicy="strict-origin-when-cross-origin"
              src={futureRadarUrl}
              title="WeatherWise HRRR future radar for Kentucky"
            />
            <p className="radar-fallback">
              If the future radar does not load,{" "}
              <a href={futureRadarUrl} rel="noopener noreferrer" target="_blank">
                open WeatherWise HRRR guidance in a new tab
              </a>
              .
            </p>
          </>
        )}
      </div>

      <div className="weatherwise-attribution">
        <p>Radar powered by WeatherWise.</p>
        <a className="weatherwise-logo-link" href="https://weatherwise.app" rel="noopener noreferrer" target="_blank">
          <img alt="WeatherWise logo" src="https://web.weatherwise.app/favicon.ico" />
          <span>More Radar &amp; Model Tools from WeatherWise</span>
        </a>
      </div>

      {isExpanded ? (
        <div className="radar-fullscreen-overlay" role="dialog" aria-label="Expanded radar view" aria-modal="true">
          <div className="radar-fullscreen-bar">
            <strong>{activeTab === "live" ? "Live Radar" : "Future Radar - HRRR"}</strong>
            <div className="radar-control-group">
              {activeTab === "live" ? (
                <button className="radar-control-button" onClick={() => setIsLivePlaying((value) => !value)} type="button">
                  {isLivePlaying ? "Pause Radar" : "Play Radar"}
                </button>
              ) : null}
              <button className="radar-control-button" onClick={() => setIsExpanded(false)} type="button">
                <X aria-hidden="true" size={16} />
                Exit Full Screen
              </button>
            </div>
          </div>
          <iframe
            allowFullScreen
            className="radar-fullscreen-frame"
            key={`expanded-${selectedRadarUrl}`}
            referrerPolicy="strict-origin-when-cross-origin"
            src={selectedRadarUrl}
            title={`${selectedRadarTitle} expanded`}
          />
        </div>
      ) : null}
    </section>
  );
}
