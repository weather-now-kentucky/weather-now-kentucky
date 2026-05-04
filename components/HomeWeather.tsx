"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  MapPin,
  RefreshCcw,
  Sun,
  Thermometer,
  Wind
} from "lucide-react";
import { HourlyForecast } from "@/components/HourlyForecast";
import { IncomingWeatherBar } from "@/components/IncomingWeatherBar";
import { OutdoorConditions } from "@/components/OutdoorConditions";
import { SectionSponsorTag } from "@/components/SectionSponsorTag";
import { WeatherAlertBanner } from "@/components/WeatherAlertBanner";
import { getIncomingWeatherAlert } from "@/lib/incomingWeather";
import { analyzeRainSignal, buildRainAwareInsight, buildRainAwareSnapshotSummary, isStormWeatherCode } from "@/lib/weatherIntelligence";
import { buildWeatherLocation, clearWeatherLocation, readWeatherLocation, saveWeatherLocation } from "@/lib/weatherLocation";
import type { CurrentConditions, HourlyForecastHour, WeatherAlert } from "@/lib/weather";

type LocationSource = "detected" | "default" | "searched";

type GeoState = {
  lat: number;
  lon: number;
  source: LocationSource;
};

const currentCachePrefix = "wnk-open-meteo-current";
const currentCacheTtl = 5 * 60 * 1000;
const fallbackLocationLabel = "Louisville, KY";

const kentuckyDefault: GeoState = {
  lat: 38.2527,
  lon: -85.7585,
  source: "default"
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

type HomeWeatherProps = {
  alerts: WeatherAlert[];
};

type CurrentApiResponse = {
  currentConditions?: CurrentConditions;
  hourly?: HourlyForecastHour[];
  locationLabel?: string;
  countyLabel?: string;
  timezone?: string;
  error?: string;
};

type CachedCurrent = {
  expiresAt: number;
  data: CurrentApiResponse;
};

function currentCacheKey(location: GeoState) {
  return `${currentCachePrefix}:${location.lat.toFixed(3)},${location.lon.toFixed(3)}`;
}

function readCachedCurrent(location: GeoState) {
  try {
    const cached = localStorage.getItem(currentCacheKey(location));

    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as CachedCurrent;
    return parsed.expiresAt > Date.now() ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCachedCurrent(location: GeoState, data: CurrentApiResponse) {
  localStorage.setItem(
    currentCacheKey(location),
    JSON.stringify({
      expiresAt: Date.now() + currentCacheTtl,
      data
    } satisfies CachedCurrent)
  );
}

function countyMatchesAlert(countyLabel: string, alert: WeatherAlert) {
  const normalizedCounty = countyLabel.toLowerCase().replace(/\s+county$/i, "").trim();
  return alert.areaDesc
    .split(/[;,]/)
    .map((area) => area.toLowerCase().replace(/\s+county$/i, "").trim())
    .includes(normalizedCounty);
}

function conditionClass(summary = "") {
  const lower = summary.toLowerCase();
  const hour = new Date().getHours();

  if (hour >= 20 || hour < 6) {
    return "current-night";
  }

  if (lower.includes("thunder") || lower.includes("storm")) {
    return "current-storm";
  }

  if (lower.includes("snow") || lower.includes("ice") || lower.includes("sleet")) {
    return "current-winter";
  }

  if (lower.includes("rain") || lower.includes("shower") || lower.includes("drizzle")) {
    return "current-rain";
  }

  if (lower.includes("cloud") || lower.includes("overcast") || lower.includes("fog")) {
    return "current-cloudy";
  }

  return "current-clear";
}

function describeTemperatureTrend(current: CurrentConditions | null, hourly: HourlyForecastHour[]) {
  const currentTemp = current?.temperature;
  const laterTemp = hourly[3]?.temperature ?? hourly[2]?.temperature;

  if (typeof currentTemp !== "number" || typeof laterTemp !== "number") {
    return "Temperature trend will update as hourly data comes in.";
  }

  const difference = laterTemp - currentTemp;

  if (difference >= 4) {
    return `Temps rising toward ${laterTemp}\u00b0 over the next few hours.`;
  }

  if (difference <= -4) {
    return `Temps easing down toward ${laterTemp}\u00b0 over the next few hours.`;
  }

  return `Temps holding near ${currentTemp}\u00b0 for the next few hours.`;
}

function buildWeatherSnapshot(current: CurrentConditions | null, hourly: HourlyForecastHour[], rainSignal = analyzeRainSignal(current, hourly)) {
  const nextRainIndex =
    rainSignal.nextWetHourIndex !== null && rainSignal.nextWetHourIndex < 6 ? rainSignal.nextWetHourIndex : -1;
  const nextRain = nextRainIndex >= 0 ? hourly[nextRainIndex] : undefined;
  const maxGust = hourly
    .slice(0, 6)
    .map((hour) => hour.windGust)
    .filter((gust): gust is number => typeof gust === "number")
    .reduce((max, gust) => Math.max(max, gust), current?.windGust ?? 0);
  const windDirection = current?.windDirection ? `${current.windDirection} ` : "";
  const summary = buildRainAwareSnapshotSummary(rainSignal);

  return [
    rainSignal.currentWet || rainSignal.nearbyWet
      ? rainSignal.lightningWithin20Miles
        ? "Lightning is close enough to avoid outdoor plans."
        : rainSignal.stormCurrent || rainSignal.stormNextHour || rainSignal.stormNext3Hours
        ? "Storms are nearby or possible soon."
        : "Rain is nearby with showers possible shortly."
      : nextRain
        ? rainSignal.likelyNextHour || nextRainIndex === 0
        ? "Rain or showers are nearby over the next hour."
        : rainSignal.likelyNext3Hours
          ? "Dry now, but rain may move in over the next few hours."
          : `Rain chance increases in about ${nextRainIndex} hour${nextRainIndex === 1 ? "" : "s"}.`
        : rainSignal.likely3To6Hours || rainSignal.storm3To6Hours
          ? rainSignal.storm3To6Hours
            ? "Storms are possible later, so keep an eye on radar."
            : "Showers may move in later in the next several hours."
        : rainSignal.laterToday
          ? "Periods of rain are possible today."
          : "Quiet right now, with mostly dry conditions expected.",
    describeTemperatureTrend(current, hourly),
    maxGust > 0 ? `${windDirection}wind gusts may reach ${maxGust} mph.` : "Wind stays light based on the next few hours.",
    summary
  ];
}

export function HomeWeather({ alerts }: HomeWeatherProps) {
  const [location, setLocation] = useState<GeoState | null>(null);
  const [debouncedLocation, setDebouncedLocation] = useState<GeoState | null>(null);
  const [locationLabel, setLocationLabel] = useState("Loading location...");
  const [activeCounty, setActiveCounty] = useState<string | null>(null);
  const [currentConditions, setCurrentConditions] = useState<CurrentConditions | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastHour[]>([]);
  const [isCurrentLoading, setIsCurrentLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("Loading your saved forecast location...");
  const [searchQuery, setSearchQuery] = useState("");
  const [snapshotExpanded, setSnapshotExpanded] = useState(false);
  const [hasSavedLocation, setHasSavedLocation] = useState(false);
  const locationLabelRef = useRef(locationLabel);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const observed = currentConditions;
  const currentSummary = observed?.textDescription;
  const currentTemperature = typeof observed?.temperature === "number" ? `${observed.temperature}\u00b0` : "--";
  const CurrentIcon = getWeatherIcon(currentSummary);
  const feelsLike = typeof observed?.feelsLike === "number" ? `${observed.feelsLike}\u00b0` : "--";
  const humidity = typeof observed?.humidity === "number" ? `${observed.humidity}%` : "--";
  const dewpoint = typeof observed?.dewpoint === "number" ? `${observed.dewpoint}\u00b0` : "--";
  const windDisplay =
    typeof observed?.windSpeed === "number"
      ? `${observed.windSpeed} mph${observed.windDirection ? ` ${observed.windDirection}` : ""}`
      : "--";
  const windGust = typeof observed?.windGust === "number" ? `${observed.windGust} mph` : "--";
  const pressure = typeof observed?.pressureInHg === "number" ? `${observed.pressureInHg.toFixed(2)} inHg` : "--";
  const visibility = typeof observed?.visibilityMiles === "number" ? `${observed.visibilityMiles} mi` : "--";
  const uv = typeof observed?.uvIndex === "number" ? `${observed.uvIndex}${observed.uvLabel ? ` ${observed.uvLabel}` : ""}` : "--";
  const aqi = typeof observed?.aqi === "number" ? `${observed.aqi}${observed.aqiLabel ? ` ${observed.aqiLabel}` : ""}` : "--";
  const pm25 = typeof observed?.pm25 === "number" ? `${observed.pm25} ug/m3` : "--";
  const locationAlerts = useMemo(
    () => (activeCounty ? alerts.filter((alert) => countyMatchesAlert(activeCounty, alert)) : []),
    [activeCounty, alerts]
  );
  const currentVisualClass = conditionClass(currentSummary);
  const rainSignal = useMemo(() => analyzeRainSignal(observed, hourlyForecast), [observed, hourlyForecast]);
  const currentInsight = buildRainAwareInsight(observed, hourlyForecast);
  const weatherSnapshot = useMemo(() => buildWeatherSnapshot(observed, hourlyForecast, rainSignal), [observed, hourlyForecast, rainSignal]);
  const incomingAlert = getIncomingWeatherAlert(locationLabel, observed, hourlyForecast);
  const hasSnapshotExtras = weatherSnapshot.length > 3;
  const savedLocationMessage = hasSavedLocation && locationLabel !== "Loading location..." ? `Using saved location: ${locationLabel}` : "";

  useEffect(() => {
    locationLabelRef.current = locationLabel;
  }, [locationLabel]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    console.debug("WNK snapshot intelligence", {
      selectedLocation: locationLabel,
      selectedLatLon: location ? { lat: location.lat, lon: location.lon } : null,
      currentPrecipFlag: rainSignal.currentWet,
      currentCondition: observed?.textDescription,
      currentWeatherCode: observed?.weatherCode,
      maxPopNext3Hours: rainSignal.maxPrecipChanceNext3,
      maxPrecipAmountNext3Hours: rainSignal.maxPrecipAmountNext3,
      maxPopNext6Hours: rainSignal.maxPrecipChanceNext6,
      maxPrecipAmountNext6Hours: rainSignal.maxPrecipAmountNext6,
      rainNearbyOrCurrent: rainSignal.currentWet || rainSignal.nearbyWet,
      rainNearbyFlag: rainSignal.nearbyWet,
      thunderStormFlag: rainSignal.stormCurrent || rainSignal.stormNext3Hours || rainSignal.storm3To6Hours || hourlyForecast.slice(0, 6).some((hour) => isStormWeatherCode(hour.weatherCode)),
      lightningWithin20Miles: rainSignal.lightningWithin20Miles,
      finalSnapshotPhrase: weatherSnapshot[0]
    });
  }, [hourlyForecast, location, locationLabel, observed, rainSignal, weatherSnapshot]);

  const applyFallbackLocation = useCallback((messageText = "Location unavailable. Showing Louisville, KY.") => {
    requestIdRef.current += 1;
    setCurrentConditions(null);
    setHourlyForecast([]);
    setLocation(kentuckyDefault);
    setLocationLabel(fallbackLocationLabel);
    setActiveCounty("Jefferson");
    setMessage(messageText);
  }, []);

  const requestDeviceLocation = useCallback((fallbackOnFailure = false) => {
    const selectionId = requestIdRef.current + 1;
    requestIdRef.current = selectionId;
    const previousLabel = locationLabelRef.current;
    setLocationLabel("Detecting location...");
    setMessage("Detecting location...");

    if (!navigator.geolocation) {
      if (fallbackOnFailure) {
        applyFallbackLocation("Location unavailable. Showing Louisville, KY.");
      } else {
        setMessage("Unable to access device location. Enter a city or ZIP code instead.");
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestIdRef.current !== selectionId) {
          return;
        }

        setCurrentConditions(null);
        setHourlyForecast([]);
        setActiveCounty(null);
        setSearchQuery("");
        const nextLocation = buildWeatherLocation({
          displayName: "Detected Location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "detected"
        });
        saveWeatherLocation(nextLocation);
        setHasSavedLocation(true);
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          source: "detected"
        });
        setLocationLabel("Detected Location");
        setMessage("Using your current location");
      },
      (error) => {
        if (requestIdRef.current !== selectionId) {
          return;
        }

        if (fallbackOnFailure) {
          applyFallbackLocation("Location unavailable. Showing Louisville, KY.");
          return;
        }

        setLocationLabel(previousLabel && previousLabel !== "Detecting location..." ? previousLabel : "Detected Location");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location access denied. Enter city or ZIP manually."
            : "Unable to access device location. Enter a city or ZIP code instead."
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, [applyFallbackLocation]);

  useEffect(() => {
    const saved = readWeatherLocation();

    if (saved) {
      requestIdRef.current += 1;
      setHasSavedLocation(true);
      setSearchQuery(saved.query ?? "");
      setLocationLabel(saved.displayName);
      setActiveCounty(saved.countyLabel ?? null);
      setMessage(saved.source === "detected" ? "Using your current location" : `Showing forecast for ${saved.displayName}`);
      setLocation({
        lat: saved.latitude,
        lon: saved.longitude,
        source: saved.source
      });
      return;
    }

    applyFallbackLocation("Location unavailable. Showing Louisville, KY.");
  }, [applyFallbackLocation]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedLocation(location);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadCurrentConditions() {
      if (!debouncedLocation) {
        return;
      }

      const cached = readCachedCurrent(debouncedLocation);
      const fetchId = requestIdRef.current;

      if (cached?.currentConditions) {
        setCurrentConditions(cached.currentConditions);
        setHourlyForecast(cached.hourly ?? []);
        if (cached.countyLabel) {
          setActiveCounty(cached.countyLabel);
        }
      } else {
        setIsCurrentLoading(true);
      }

      try {
        const response = await fetch(`/api/current?lat=${debouncedLocation.lat}&lon=${debouncedLocation.lon}`, { signal: controller.signal });
        const data: CurrentApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to fetch current conditions.");
        }

        if (!ignore && requestIdRef.current === fetchId) {
          writeCachedCurrent(debouncedLocation, data);
          setCurrentConditions(data.currentConditions ?? null);
          setHourlyForecast(data.hourly ?? []);
          setActiveCounty((currentCounty) => data.countyLabel ?? currentCounty);

          if (debouncedLocation.source !== "default") {
            saveWeatherLocation(
              buildWeatherLocation({
                displayName: data.locationLabel ?? locationLabelRef.current,
                latitude: debouncedLocation.lat,
                longitude: debouncedLocation.lon,
                source: debouncedLocation.source,
                timezone: data.timezone,
                countyLabel: data.countyLabel
              })
            );
            setHasSavedLocation(true);
          }

          if (debouncedLocation.source === "detected") {
            if (data.locationLabel) {
              setLocationLabel(data.locationLabel);
            saveWeatherLocation(
                buildWeatherLocation({
                  displayName: data.locationLabel,
                  latitude: debouncedLocation.lat,
                  longitude: debouncedLocation.lon,
                  source: "detected",
                  timezone: data.timezone,
                  countyLabel: data.countyLabel
                })
              );
              setHasSavedLocation(true);
              setMessage("Using your current location");
            } else {
              setLocationLabel("Detected Location");
              setMessage("Unable to determine exact city. Showing forecast for your detected location.");
            }
          }
        }
      } catch (error) {
        if (!ignore && requestIdRef.current === fetchId && !(error instanceof DOMException && error.name === "AbortError") && !cached) {
          setCurrentConditions(null);
        }
      } finally {
        if (!ignore && requestIdRef.current === fetchId) {
          setIsCurrentLoading(false);
        }
      }
    }

    loadCurrentConditions();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [debouncedLocation]);

  async function handleLocationSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      setMessage("Enter a city, state, or ZIP code to update your forecast.");
      return;
    }

    setIsSearching(true);
    setMessage(`Searching for ${query}...`);
    const selectionId = requestIdRef.current + 1;
    requestIdRef.current = selectionId;

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data: { lat?: number; lon?: number; label?: string; countyLabel?: string; error?: string } = await response.json();

      if (!response.ok || typeof data.lat !== "number" || typeof data.lon !== "number") {
        throw new Error(data.error ?? "Unable to find that location.");
      }

      const label = data.label ?? query;
      if (requestIdRef.current !== selectionId) {
        return;
      }

      saveWeatherLocation(
        buildWeatherLocation({
          displayName: label,
          latitude: data.lat,
          longitude: data.lon,
          source: "searched",
          query,
          countyLabel: data.countyLabel
        })
      );
      setHasSavedLocation(true);
      setCurrentConditions(null);
      setHourlyForecast([]);
      setLocationLabel(label);
      setActiveCounty(data.countyLabel ?? null);
      setMessage(`Showing forecast for ${label}`);
      setLocation({
        lat: data.lat,
        lon: data.lon,
        source: "searched"
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update location.");
    } finally {
      if (requestIdRef.current === selectionId) {
        setIsSearching(false);
      }
    }
  }

  function handleChangeSavedLocation() {
    searchInputRef.current?.focus();
  }

  function handleClearSavedLocation() {
    clearWeatherLocation();
    setHasSavedLocation(false);
    setSearchQuery("");
    applyFallbackLocation("Saved location cleared. Showing Louisville, KY.");
  }

  return (
    <section className="home-weather">
      <WeatherAlertBanner alerts={locationAlerts} />
      <section className="location-control">
        {savedLocationMessage ? (
          <div className="saved-location-row">
            <span>{savedLocationMessage}</span>
            <button onClick={handleChangeSavedLocation} type="button">
              Change
            </button>
            <button onClick={handleClearSavedLocation} type="button">
              Clear saved location
            </button>
          </div>
        ) : null}
        <form className="location-search" onSubmit={handleLocationSearch}>
          <label htmlFor="locationSearch">Enter city, state or ZIP code</label>
          <div className="location-search-row">
            <input
              id="locationSearch"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Elizabethtown, KY"
              ref={searchInputRef}
              type="text"
              value={searchQuery}
            />
            <button className="button" disabled={isSearching} type="submit">
              Update Location
            </button>
          </div>
          <button className="location-current-button" onClick={() => requestDeviceLocation(false)} type="button">
            Use My Current Location
          </button>
        </form>
        <p className="location-note">{message}</p>
      </section>
      {incomingAlert.show ? (
        <div className={`mobile-rain-callout mobile-rain-${incomingAlert.urgency}`}>
          <strong>
            {incomingAlert.type === "storm" ? "Storms nearby" : incomingAlert.type === "snow" ? "Snow nearby" : "Rain nearby"}
          </strong>
          <span>{incomingAlert.message}</span>
          <Link href="/radar">Open Radar</Link>
        </div>
      ) : null}
      <section className={`current-conditions ${currentVisualClass}`}>
        <div className="current-primary">
          <div className="section-title-row">
            <span className="eyebrow">Current Conditions</span>
            <SectionSponsorTag sectionKey="home_current_conditions" />
          </div>
          <div className="current-temp-row">
            <p className="current-temp">{currentTemperature}</p>
            <CurrentIcon aria-hidden="true" className="current-icon" />
          </div>
          <h1>{currentSummary ?? "Loading current conditions"}</h1>
          <p className="current-location">
            <MapPin aria-hidden="true" size={17} />
            {locationLabel}
          </p>
          <p className="current-insight">{currentInsight}</p>
          <div className="weather-snapshot">
            <span>Today&apos;s Snapshot</span>
            <ul className={snapshotExpanded ? "snapshot-expanded" : ""}>
              {weatherSnapshot.map((item, index) => (
                <li className={index >= 3 ? "snapshot-extra" : ""} key={item}>
                  {item}
                </li>
              ))}
            </ul>
            {hasSnapshotExtras ? (
              <button className="snapshot-toggle" onClick={() => setSnapshotExpanded((value) => !value)} type="button">
                {snapshotExpanded ? "Show fewer details" : "Show more details"}
              </button>
            ) : null}
          </div>
        </div>
        <div className="current-details">
          <h2 className="current-details-title">Current Details</h2>
          <div className="current-metric">
            <Wind aria-hidden="true" size={22} />
            <span>Wind</span>
            <strong>{windDisplay}</strong>
          </div>
          <div className="current-metric">
            <CloudSun aria-hidden="true" size={22} />
            <span>Feels Like</span>
            <strong>{feelsLike}</strong>
          </div>
          <div className="current-metric">
            <Droplets aria-hidden="true" size={22} />
            <span>Humidity</span>
            <strong>{humidity}</strong>
          </div>
          <div className="current-metric">
            <Wind aria-hidden="true" size={22} />
            <span>Wind Gust</span>
            <strong>{windGust}</strong>
          </div>
          <div className="current-metric">
            <Thermometer aria-hidden="true" size={22} />
            <span>Dew Point</span>
            <strong>{dewpoint}</strong>
          </div>
          <div className="current-metric">
            <Gauge aria-hidden="true" size={22} />
            <span>Pressure</span>
            <strong>{pressure}</strong>
          </div>
          <div className="current-metric">
            <Eye aria-hidden="true" size={22} />
            <span>Visibility</span>
            <strong>{visibility}</strong>
          </div>
          <div className="current-metric">
            <Sun aria-hidden="true" size={22} />
            <span>UV</span>
            <strong>{uv}</strong>
          </div>
          <div className="current-metric">
            <CloudFog aria-hidden="true" size={22} />
            <span>AQI</span>
            <strong>{aqi}</strong>
          </div>
          <div className="current-metric">
            <CloudFog aria-hidden="true" size={22} />
            <span>PM2.5</span>
            <strong>{pm25}</strong>
          </div>
          {observed?.observedAt || observed?.updatedAt ? (
            <p className="observation-note">
              {observed.observedAt ? `Observed at: ${observed.observedAt}` : null}
              {observed.observedAt && observed.updatedAt ? " | " : null}
              {observed.updatedAt ? `Updated: ${observed.updatedAt}` : null}
            </p>
          ) : null}
          <p className="observation-note">Current conditions powered by Open-Meteo.</p>
          <button
            className="button refresh-button"
            disabled={!location}
            onClick={() => (location ? setLocation({ ...location }) : undefined)}
            type="button"
          >
            <RefreshCcw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
      </section>

      <IncomingWeatherBar alert={incomingAlert} />
      <OutdoorConditions current={observed} hourly={hourlyForecast} />
      <HourlyForecast hours={hourlyForecast} />
      {isCurrentLoading ? <p className="status-line">Refreshing current observations...</p> : null}
      <section className="radar-cta panel">
        <div>
          <span className="eyebrow">Radar</span>
          <h2>Track what is moving toward your part of Kentucky.</h2>
        </div>
        <Link className="button secondary" href="/radar">
          Open Radar
        </Link>
      </section>
      <details className="home-screen-tip">
        <summary>Want quick access?</summary>
        <div>
          <p>Save Weather Now Kentucky to your home screen for a faster app-like experience.</p>
          <div className="home-screen-steps">
            <section>
              <strong>iPhone / Safari</strong>
              <ol>
                <li>Tap the Share button.</li>
                <li>Tap Add to Home Screen.</li>
                <li>Tap Add.</li>
              </ol>
            </section>
            <section>
              <strong>Android / Chrome</strong>
              <ol>
                <li>Tap the three-dot menu.</li>
                <li>Tap Add to Home screen or Install app.</li>
                <li>Confirm.</li>
              </ol>
            </section>
          </div>
        </div>
      </details>
    </section>
  );
}
