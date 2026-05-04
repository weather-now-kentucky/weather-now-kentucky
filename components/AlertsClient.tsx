"use client";

import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/AlertBanner";
import type { WeatherAlert } from "@/lib/weather";

type AlertsCache = {
  alerts: WeatherAlert[];
  fetchedAt: string;
};

const alertsCacheKey = "wnk_kentucky_alerts_cache";
const fallbackMessage =
  "NWS alert data is temporarily unavailable. Please check back shortly or visit weather.gov for official alerts.";

function readAlertsCache() {
  try {
    const saved = localStorage.getItem(alertsCacheKey);
    const parsed = saved ? (JSON.parse(saved) as AlertsCache) : null;

    if (parsed && Array.isArray(parsed.alerts) && typeof parsed.fetchedAt === "string") {
      return parsed;
    }
  } catch {
    localStorage.removeItem(alertsCacheKey);
  }

  return null;
}

function writeAlertsCache(cache: AlertsCache) {
  localStorage.setItem(alertsCacheKey, JSON.stringify(cache));
}

function formatCachedTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

export function AlertsClient({ initialAlerts, initialError }: { initialAlerts: WeatherAlert[]; initialError?: string }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [message, setMessage] = useState(initialError ? fallbackMessage : "");
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (initialAlerts.length > 0) {
      const fetchedAt = new Date().toISOString();
      writeAlertsCache({ alerts: initialAlerts, fetchedAt });
      setCachedAt(null);
      return;
    }

    if (initialError) {
      const cached = readAlertsCache();

      if (cached) {
        setAlerts(cached.alerts);
        setCachedAt(cached.fetchedAt);
        setMessage("Showing recently cached alerts. Official NWS data may be delayed.");
      }
    }
  }, [initialAlerts, initialError]);

  async function retryAlerts() {
    setIsRetrying(true);
    setMessage("Retrying NWS alert data...");

    try {
      if (process.env.NODE_ENV === "development") {
        console.debug("WNK alerts retry", { endpoint: "/api/alerts" });
      }

      const response = await fetch("/api/alerts", { cache: "no-store" });
      const data = (await response.json()) as { alerts?: WeatherAlert[]; fetchedAt?: string; error?: string };

      if (process.env.NODE_ENV === "development") {
        console.debug("WNK alerts retry response", {
          endpoint: "/api/alerts",
          status: response.status,
          mode: response.ok ? "fresh" : "fallback"
        });
      }

      if (!response.ok || !Array.isArray(data.alerts)) {
        throw new Error(data.error ?? fallbackMessage);
      }

      const fetchedAt = data.fetchedAt ?? new Date().toISOString();
      setAlerts(data.alerts);
      setCachedAt(null);
      setMessage("");
      writeAlertsCache({ alerts: data.alerts, fetchedAt });
    } catch (error) {
      const cached = readAlertsCache();

      if (cached) {
        setAlerts(cached.alerts);
        setCachedAt(cached.fetchedAt);
        setMessage("Showing recently cached alerts. Official NWS data may be delayed.");
      } else {
        setAlerts([]);
        setCachedAt(null);
        setMessage(error instanceof Error ? error.message : fallbackMessage);
      }
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <section className="grid">
      {message ? (
        <div className="panel alert-fallback-panel">
          <p>{message}</p>
          {cachedAt ? <small>Cached alert data from {formatCachedTime(cachedAt)}.</small> : null}
          <button className="button" disabled={isRetrying} onClick={retryAlerts} type="button">
            {isRetrying ? "Retrying..." : "Retry Alerts"}
          </button>
        </div>
      ) : null}
      {!message && alerts.length === 0 ? <p className="panel">No active Kentucky alerts are currently listed.</p> : null}
      {alerts.map((alert) => (
        <AlertBanner alert={alert} key={alert.id} />
      ))}
    </section>
  );
}
