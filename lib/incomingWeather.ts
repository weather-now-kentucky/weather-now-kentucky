import type { CurrentConditions, HourlyForecastHour } from "@/lib/weather";

export type IncomingWeatherAlert = {
  show: boolean;
  type: "rain" | "storm" | "snow" | "none";
  etaMinutes: number | null;
  message: string;
  urgency: "low" | "moderate" | "high";
};

function weatherTypeFromCode(code?: number) {
  if (typeof code !== "number") {
    return "none";
  }

  if (code >= 95) {
    return "storm";
  }

  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return "snow";
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "rain";
  }

  return "none";
}

function etaFromIndex(index: number) {
  if (index <= 0) {
    return 15;
  }

  return Math.min(60, index * 60);
}

export function getIncomingWeatherAlert(
  locationLabel: string,
  current: CurrentConditions | null,
  hourly: HourlyForecastHour[]
): IncomingWeatherAlert {
  const currentType = weatherTypeFromCode(current?.weatherCode);

  if (currentType === "rain" || currentType === "storm" || currentType === "snow") {
    return {
      show: true,
      type: currentType,
      etaMinutes: 15,
      message:
        currentType === "storm"
          ? `Storms are near ${locationLabel}. View radar.`
          : `${currentType === "snow" ? "Snow" : "Rain"} is near ${locationLabel}. View radar.`,
      urgency: "high"
    };
  }

  const candidateIndex = hourly.slice(0, 2).findIndex((hour) => {
    const type = weatherTypeFromCode(hour.weatherCode);
    return type !== "none" || (typeof hour.precipChance === "number" && hour.precipChance >= 55);
  });

  if (candidateIndex < 0) {
    return {
      show: false,
      type: "none",
      etaMinutes: null,
      message: "",
      urgency: "low"
    };
  }

  const hour = hourly[candidateIndex];
  const type = weatherTypeFromCode(hour.weatherCode) === "none" ? "rain" : weatherTypeFromCode(hour.weatherCode);
  const etaMinutes = etaFromIndex(candidateIndex);
  const urgency = etaMinutes < 30 ? "high" : "moderate";

  return {
    show: true,
    type,
    etaMinutes,
    message:
      type === "storm"
        ? `Storms may approach ${locationLabel} within ${etaMinutes} minutes.`
        : `${type === "snow" ? "Snow" : "Rain"} may arrive near ${locationLabel} in about ${etaMinutes} minutes.`,
    urgency
  };
}
