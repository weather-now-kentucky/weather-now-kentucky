import type { WeatherAlert } from "@/lib/weather";

export type AlertTone = "tornado" | "severe" | "flood" | "winter" | "watch" | "advisory";

export type PrioritizedAlert = {
  alert: WeatherAlert;
  priority: number;
  tone: AlertTone;
};

export function classifyAlert(alert: WeatherAlert): PrioritizedAlert {
  const event = alert.event.toLowerCase();

  if (event.includes("tornado emergency") || event.includes("pds tornado warning") || event.includes("tornado warning")) {
    return { alert, priority: 1, tone: "tornado" };
  }

  if (event.includes("severe thunderstorm warning")) {
    return { alert, priority: 2, tone: "severe" };
  }

  if (event.includes("flash flood warning")) {
    return { alert, priority: 3, tone: "flood" };
  }

  if (event.includes("winter storm warning") || event.includes("ice storm warning")) {
    return { alert, priority: 4, tone: "winter" };
  }

  if (event.includes("tornado watch") || event.includes("severe thunderstorm watch")) {
    return { alert, priority: 5, tone: "watch" };
  }

  return { alert, priority: 6, tone: "advisory" };
}

export function getPrimaryAlert(alerts: WeatherAlert[]) {
  return alerts.map(classifyAlert).sort((a, b) => a.priority - b.priority)[0] ?? null;
}

export function isSevereWeatherMode(alerts: WeatherAlert[]) {
  const primaryAlert = getPrimaryAlert(alerts);
  return Boolean(primaryAlert && primaryAlert.priority <= 2);
}
