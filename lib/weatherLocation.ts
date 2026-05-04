"use client";

import { useEffect, useState } from "react";

export type WeatherLocationSource = "detected" | "searched" | "default";

export type WeatherLocation = {
  city: string;
  state: string;
  displayName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  source: WeatherLocationSource;
  updatedAt: string;
  query?: string;
  countyLabel?: string;
};

export const weatherLocationKey = "wnk_weather_location";

function splitDisplayName(displayName: string) {
  const [city = "", state = ""] = displayName.split(",").map((part) => part.trim());
  return { city, state };
}

export function buildWeatherLocation(input: {
  displayName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  source: WeatherLocationSource;
  query?: string;
  countyLabel?: string;
}): WeatherLocation {
  const { city, state } = splitDisplayName(input.displayName);

  return {
    city,
    state,
    displayName: input.displayName,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone,
    source: input.source,
    updatedAt: new Date().toISOString(),
    query: input.query,
    countyLabel: input.countyLabel
  };
}

export function isWeatherLocation(value: unknown): value is WeatherLocation {
  const location = value as Partial<WeatherLocation>;

  return (
    typeof location.displayName === "string" &&
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    (location.source === "detected" || location.source === "searched" || location.source === "default") &&
    typeof location.updatedAt === "string"
  );
}

export function readWeatherLocation() {
  try {
    const saved = localStorage.getItem(weatherLocationKey);
    const parsed = saved ? JSON.parse(saved) : null;

    if (isWeatherLocation(parsed)) {
      return parsed;
    }

    if (saved) {
      localStorage.removeItem(weatherLocationKey);
    }
  } catch {
    localStorage.removeItem(weatherLocationKey);
  }

  return null;
}

export function saveWeatherLocation(location: WeatherLocation) {
  localStorage.setItem(weatherLocationKey, JSON.stringify(location));
}

export function clearWeatherLocation() {
  localStorage.removeItem(weatherLocationKey);
}

export function useWeatherLocation() {
  const [location, setLocationState] = useState<WeatherLocation | null>(null);

  useEffect(() => {
    setLocationState(readWeatherLocation());
  }, []);

  function setLocation(nextLocation: WeatherLocation) {
    saveWeatherLocation(nextLocation);
    setLocationState(nextLocation);
  }

  function clearLocation() {
    clearWeatherLocation();
    setLocationState(null);
  }

  return { location, setLocation, clearLocation };
}
