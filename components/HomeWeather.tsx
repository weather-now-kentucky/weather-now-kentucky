"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { WeatherAlertBanner } from "@/components/WeatherAlertBanner";
import type { CurrentConditions, ForecastPeriod, PointForecast, WeatherAlert } from "@/lib/weather";

type LocationSource = "detected" | "fallback" | "searched";

type GeoState = {
  lat: number;
  lon: number;
  source: LocationSource;
};

type SavedLocation = {
  lat: number;
  lon: number;
  label: string;
  query: string;
  countyLabel?: string;
};

const savedLocationKey = "wnk-selected-location";
const currentCachePrefix = "wnk-current-conditions";
const currentCacheTtl = 5 * 60 * 1000;
const fallbackLocationLabel = "Louisville, KY";

const kentuckyDefault: GeoState = {
  lat: 38.2527,
  lon: -85.7585,
  source: "fallback"
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

function isSavedLocation(value: unknown): value is SavedLocation {
  const location = value as Partial<SavedLocation>;
  return (
    typeof location.lat === "number" &&
    typeof location.lon === "number" &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lon) &&
    typeof location.label === "string" &&
    typeof location.query === "string" &&
    (typeof location.countyLabel === "string" || typeof location.countyLabel === "undefined")
  );
}

type HomeWeatherProps = {
  alerts: WeatherAlert[];
  forecastOverride: string;
  georgeForecastUpdatedAt: string;
  isLive: boolean;
  liveVideoId?: string;
};

type CurrentApiResponse = {
  currentConditions?: CurrentConditions;
  locationLabel?: string;
  countyLabel?: string;
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

export function HomeWeather({ alerts, forecastOverride, georgeForecastUpdatedAt, isLive, liveVideoId }: HomeWeatherProps) {
  const [location, setLocation] = useState<GeoState | null>(null);
  const [locationLabel, setLocationLabel] = useState("Detecting location...");
  const [activeCounty, setActiveCounty] = useState<string | null>(null);
  const [forecast, setForecast] = useState<PointForecast | null>(null);
  const [currentConditions, setCurrentConditions] = useState<CurrentConditions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCurrentLoading, setIsCurrentLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("Requesting your current location...");
  const [searchQuery, setSearchQuery] = useState("");
  const locationLabelRef = useRef(locationLabel);
  const requestIdRef = useRef(0);

  const sevenDayCards = useMemo(() => buildDailyCards(forecast?.periods ?? []), [forecast]);
  const current = forecast?.periods[0];
  const observed = currentConditions;
  const currentSummary = observed?.textDescription ?? current?.shortForecast;
  const currentTemperature = typeof observed?.temperature === "number" ? `${observed.temperature}\u00b0` : current ? `${current.temperature}\u00b0` : "--";
  const CurrentIcon = getWeatherIcon(currentSummary);
  const feelsLike =
    typeof observed?.feelsLike === "number"
      ? `${observed.feelsLike}\u00b0`
      : formatTemperatureValue(current?.apparentTemperature?.value, current?.apparentTemperature?.unitCode);
  const humidity =
    typeof observed?.humidity === "number"
      ? `${observed.humidity}%`
      : typeof current?.relativeHumidity?.value === "number"
        ? `${current.relativeHumidity.value}%`
        : "--";
  const windDisplay =
    typeof observed?.windSpeed === "number"
      ? `${observed.windSpeed} mph${observed.windDirection ? ` ${observed.windDirection}` : ""}`
      : current
        ? `${current.windSpeed} ${current.windDirection}`
        : "Waiting";
  const windGust = typeof observed?.windGust === "number" ? `${observed.windGust} mph` : formatWindGust(current?.windGust?.value, current?.windGust?.unitCode);
  const locationAlerts = useMemo(
    () => (activeCounty ? alerts.filter((alert) => countyMatchesAlert(activeCounty, alert)) : []),
    [activeCounty, alerts]
  );

  useEffect(() => {
    locationLabelRef.current = locationLabel;
  }, [locationLabel]);

  const applyFallbackLocation = useCallback((messageText = "Location unavailable. Showing Louisville, KY.") => {
    requestIdRef.current += 1;
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
    setMessage("Requesting your current location...");

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

        setForecast(null);
        setCurrentConditions(null);
        setActiveCounty(null);
        localStorage.removeItem(savedLocationKey);
        setSearchQuery("");
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
            ? "Location permission denied. Enter a city or ZIP code instead."
            : "Unable to access device location. Enter a city or ZIP code instead."
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, [applyFallbackLocation]);

  useEffect(() => {
    const saved = localStorage.getItem(savedLocationKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        if (isSavedLocation(parsed)) {
          requestIdRef.current += 1;
          setSearchQuery(parsed.query);
          setLocationLabel(parsed.label);
          setActiveCounty(parsed.countyLabel ?? null);
          setMessage(`Showing forecast for ${parsed.label}`);
          setLocation({
            lat: parsed.lat,
            lon: parsed.lon,
            source: "searched"
          });
          return;
        }
      } catch {
        localStorage.removeItem(savedLocationKey);
      }
    }

    requestDeviceLocation(true);
  }, [requestDeviceLocation]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadForecast() {
      if (!location) {
        return;
      }

      setIsLoading(true);
      const fetchId = requestIdRef.current;
      try {
        const response = await fetch(`/api/forecast?lat=${location.lat}&lon=${location.lon}`, { signal: controller.signal });
        const data: PointForecast & { locationLabel?: string; countyLabel?: string; error?: string } = await response.json();

        if (!response.ok) {
          throw new Error((data as { error?: string }).error ?? "Forecast request failed.");
        }

        if (!ignore && requestIdRef.current === fetchId) {
          setForecast(data);
          setActiveCounty((currentCounty) => data.countyLabel ?? currentCounty);

          if (location.source === "fallback") {
            setLocationLabel(fallbackLocationLabel);
          } else if (location.source === "detected" && data.locationLabel) {
            setLocationLabel(data.locationLabel);
            setMessage("Using your current location");
          } else if (location.source === "detected") {
            setLocationLabel("Detected Location");
            setMessage("Unable to determine exact city. Showing forecast for your detected location.");
          }
        }
      } catch (error) {
        if (!ignore && requestIdRef.current === fetchId && !(error instanceof DOMException && error.name === "AbortError")) {
          setMessage(error instanceof Error ? error.message : "Unable to load forecast.");
          setForecast(null);
        }
      } finally {
        if (!ignore && requestIdRef.current === fetchId) {
          setIsLoading(false);
        }
      }
    }

    loadForecast();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [location]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadCurrentConditions() {
      if (!location) {
        return;
      }

      const cached = readCachedCurrent(location);
      const fetchId = requestIdRef.current;

      if (cached?.currentConditions) {
        setCurrentConditions(cached.currentConditions);
        if (cached.countyLabel) {
          setActiveCounty(cached.countyLabel);
        }
      } else {
        setIsCurrentLoading(true);
      }

      try {
        const response = await fetch(`/api/current?lat=${location.lat}&lon=${location.lon}`, { signal: controller.signal });
        const data: CurrentApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to fetch current conditions.");
        }

        if (!ignore && requestIdRef.current === fetchId) {
          writeCachedCurrent(location, data);
          setCurrentConditions(data.currentConditions ?? null);
          setActiveCounty((currentCounty) => data.countyLabel ?? currentCounty);

          if (location.source === "detected") {
            if (data.locationLabel) {
              setLocationLabel(data.locationLabel);
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
  }, [location]);

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

      localStorage.setItem(
        savedLocationKey,
        JSON.stringify({
          lat: data.lat,
          lon: data.lon,
          label,
          query,
          countyLabel: data.countyLabel
        })
      );
      setForecast(null);
      setCurrentConditions(null);
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

  return (
    <section className="home-weather">
      <WeatherAlertBanner alerts={locationAlerts} />
      <section className="current-conditions">
        <div className="current-primary">
          <span className="eyebrow">Current Conditions</span>
          <div className="current-temp-row">
            <p className="current-temp">{currentTemperature}</p>
            <CurrentIcon aria-hidden="true" className="current-icon" />
          </div>
          <h1>{currentSummary ?? "Loading forecast"}</h1>
          <p className="current-location">
            <MapPin aria-hidden="true" size={17} />
            {locationLabel}
          </p>
          <form className="location-search" onSubmit={handleLocationSearch}>
            <label htmlFor="locationSearch">Enter city, state or ZIP code</label>
            <div className="location-search-row">
              <input
                id="locationSearch"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Elizabethtown, KY"
                type="text"
                value={searchQuery}
              />
              <button className="button" disabled={isSearching} type="submit">
                Update Location
              </button>
            </div>
            <button className="location-current-button" onClick={() => requestDeviceLocation(false)} type="button">
              Use my current location
            </button>
          </form>
        </div>
        <div className="current-details">
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
          {observed?.observedAt || observed?.updatedAt ? (
            <p className="observation-note">
              {observed.observedAt ? `Observed at: ${observed.observedAt}` : null}
              {observed.observedAt && observed.updatedAt ? " | " : null}
              {observed.updatedAt ? `Updated: ${observed.updatedAt}` : null}
            </p>
          ) : null}
          <p className="location-note">{message}</p>
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

      <HomeLivePreview isLive={isLive} videoId={liveVideoId} />
      <KentuckyFocusTiles />
      <GeorgesForecastBox forecastOverride={forecastOverride} updatedAt={georgeForecastUpdatedAt} />

      <section className="forecast-section">
        <div className="forecast-heading">
          <span className="eyebrow">Seven-Day Forecast</span>
          <h2>Next up across Kentucky</h2>
        </div>
        {isLoading ? <p className="status-line">Loading forecast from the National Weather Service...</p> : null}
        {isCurrentLoading ? <p className="status-line">Refreshing current observations...</p> : null}
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
