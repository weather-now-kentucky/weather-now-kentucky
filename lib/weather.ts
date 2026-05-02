import { z } from "zod";

const weatherBase = "https://api.weather.gov";

const headers = {
  Accept: "application/geo+json",
  "User-Agent": "Weather Now Kentucky (contact: admin@weathernowkentucky.local)"
};

const pointSchema = z.object({
  properties: z.object({
    forecast: z.string(),
    forecastHourly: z.string(),
    observationStations: z.string().optional(),
    radarStation: z.string().optional(),
    relativeLocation: z
      .object({
        properties: z.object({
          city: z.string().optional(),
          state: z.string().optional(),
          county: z.string().optional()
        })
      })
      .optional()
  })
});

const forecastPeriodSchema = z.object({
  number: z.number(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  isDaytime: z.boolean(),
  temperature: z.number(),
  temperatureUnit: z.string(),
  windSpeed: z.string(),
  windDirection: z.string(),
  icon: z.string(),
  shortForecast: z.string(),
  detailedForecast: z.string(),
  probabilityOfPrecipitation: z
    .object({
      value: z.number().nullable()
    })
    .nullable()
    .optional(),
  relativeHumidity: z
    .object({
      value: z.number().nullable()
    })
    .nullable()
    .optional(),
  apparentTemperature: z
    .object({
      value: z.number().nullable(),
      unitCode: z.string().optional()
    })
    .nullable()
    .optional(),
  windGust: z
    .object({
      value: z.number().nullable(),
      unitCode: z.string().optional()
    })
    .nullable()
    .optional()
});

const forecastSchema = z.object({
  properties: z.object({
    periods: z.array(forecastPeriodSchema)
  })
});

const valueUnitSchema = z
  .object({
    value: z.number().nullable(),
    unitCode: z.string().optional()
  })
  .nullable()
  .optional();

const observationStationsSchema = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      properties: z.object({
        stationIdentifier: z.string().optional(),
        name: z.string().optional()
      })
    })
  )
});

const latestObservationSchema = z.object({
  properties: z.object({
    timestamp: z.string().nullable().optional(),
    textDescription: z.string().nullable().optional(),
    temperature: valueUnitSchema,
    dewpoint: valueUnitSchema,
    windDirection: valueUnitSchema,
    windSpeed: valueUnitSchema,
    windGust: valueUnitSchema,
    apparentTemperature: valueUnitSchema,
    heatIndex: valueUnitSchema,
    windChill: valueUnitSchema,
    relativeHumidity: valueUnitSchema
  })
});

const alertSchema = z.object({
  id: z.string(),
  properties: z.object({
    event: z.string(),
    expires: z.string().nullable(),
    areaDesc: z.string(),
    geocode: z
      .object({
        UGC: z.array(z.string()).optional(),
        SAME: z.array(z.string()).optional()
      })
      .optional()
  })
});

const alertsSchema = z.object({
  features: z.array(alertSchema)
});

export type ForecastPeriod = z.infer<typeof forecastPeriodSchema>;

export type WeatherAlert = {
  id: string;
  event: string;
  expires: string | null;
  areaDesc: string;
};

export type CurrentConditions = {
  temperature?: number;
  feelsLike?: number;
  humidity?: number;
  dewpoint?: number;
  windSpeed?: number;
  windDirection?: string;
  windGust?: number;
  textDescription?: string;
  observedAt?: string;
  updatedAt?: string;
};

export type PointForecast = {
  periods: ForecastPeriod[];
  radarStation?: string;
  locationLabel?: string;
  countyLabel?: string;
};

export type CurrentConditionsResponse = {
  currentConditions?: CurrentConditions;
  locationLabel?: string;
  countyLabel?: string;
};

async function fetchJson(url: string, revalidate = 300) {
  const response = await fetch(url, {
    headers,
    next: { revalidate }
  });

  if (!response.ok) {
    throw new Error(`Weather.gov request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function celsiusToFahrenheit(value: number) {
  return Math.round((value * 9) / 5 + 32);
}

function metersPerSecondToMph(value: number) {
  return Math.round(value * 2.23694);
}

function kilometersPerHourToMph(value: number) {
  return Math.round(value * 0.621371);
}

function unitValueToFahrenheit(value?: number | null, unitCode = "") {
  if (typeof value !== "number") {
    return undefined;
  }

  return unitCode.toLowerCase().includes("degc") ? celsiusToFahrenheit(value) : Math.round(value);
}

function unitValueToMph(value?: number | null, unitCode = "") {
  if (typeof value !== "number") {
    return undefined;
  }

  const normalized = unitCode.toLowerCase();

  if (normalized.includes("m_s")) {
    return metersPerSecondToMph(value);
  }

  if (normalized.includes("km_h")) {
    return kilometersPerHourToMph(value);
  }

  return Math.round(value);
}

function degreesToCompass(value?: number | null) {
  if (typeof value !== "number") {
    return undefined;
  }

  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return directions[Math.round(value / 22.5) % 16];
}

function formatObservationTime(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function calculateHeatIndex(temperature?: number, humidity?: number) {
  if (typeof temperature !== "number" || typeof humidity !== "number" || temperature < 80 || humidity < 40) {
    return undefined;
  }

  const heatIndex =
    -42.379 +
    2.04901523 * temperature +
    10.14333127 * humidity -
    0.22475541 * temperature * humidity -
    0.00683783 * temperature * temperature -
    0.05481717 * humidity * humidity +
    0.00122874 * temperature * temperature * humidity +
    0.00085282 * temperature * humidity * humidity -
    0.00000199 * temperature * temperature * humidity * humidity;

  return Math.round(heatIndex);
}

function calculateWindChill(temperature?: number, windSpeed?: number) {
  if (typeof temperature !== "number" || typeof windSpeed !== "number" || temperature > 50 || windSpeed < 3) {
    return undefined;
  }

  return Math.round(35.74 + 0.6215 * temperature - 35.75 * Math.pow(windSpeed, 0.16) + 0.4275 * temperature * Math.pow(windSpeed, 0.16));
}

function normalizeCounty(county?: string) {
  return county?.replace(/\s+County$/i, "").trim();
}

async function getLatestCurrentConditions(observationStations?: string): Promise<CurrentConditions | undefined> {
  if (!observationStations) {
    return undefined;
  }

  try {
    const stations = observationStationsSchema.parse(await fetchJson(observationStations, 1800));

    for (const station of stations.features.slice(0, 5)) {
      try {
        const latest = latestObservationSchema.parse(await fetchJson(`${station.id}/observations/latest`, 120));
        const props = latest.properties;
        const textDescription = props.textDescription?.trim() || undefined;
        const temperature = unitValueToFahrenheit(props.temperature?.value, props.temperature?.unitCode);
        const humidity = typeof props.relativeHumidity?.value === "number" ? Math.round(props.relativeHumidity.value) : undefined;
        const windSpeed = unitValueToMph(props.windSpeed?.value, props.windSpeed?.unitCode);
        const apparentTemperature = unitValueToFahrenheit(props.apparentTemperature?.value, props.apparentTemperature?.unitCode);
        const heatIndex = unitValueToFahrenheit(props.heatIndex?.value, props.heatIndex?.unitCode);
        const windChill = unitValueToFahrenheit(props.windChill?.value, props.windChill?.unitCode);
        const calculatedFeelsLike = calculateHeatIndex(temperature, humidity) ?? calculateWindChill(temperature, windSpeed);

        return {
          temperature,
          feelsLike: apparentTemperature ?? heatIndex ?? windChill ?? calculatedFeelsLike,
          humidity,
          dewpoint: unitValueToFahrenheit(props.dewpoint?.value, props.dewpoint?.unitCode),
          windSpeed,
          windDirection: degreesToCompass(props.windDirection?.value),
          windGust: unitValueToMph(props.windGust?.value, props.windGust?.unitCode),
          textDescription,
          observedAt: station.properties.name ?? station.properties.stationIdentifier ?? station.id.split("/").pop(),
          updatedAt: formatObservationTime(props.timestamp)
        };
      } catch {
        // Try the next nearby station if the first station has no latest observation.
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function getPointForecast(lat: number, lon: number): Promise<PointForecast> {
  const point = pointSchema.parse(await fetchJson(`${weatherBase}/points/${lat.toFixed(4)},${lon.toFixed(4)}`));
  const forecast = forecastSchema.parse(await fetchJson(point.properties.forecast));
  const city = point.properties.relativeLocation?.properties.city;
  const state = point.properties.relativeLocation?.properties.state;
  const county = normalizeCounty(point.properties.relativeLocation?.properties.county);

  return {
    periods: forecast.properties.periods.slice(0, 14),
    radarStation: point.properties.radarStation,
    locationLabel: city && state ? `${city}, ${state}` : undefined,
    countyLabel: county
  };
}

export async function getPointCurrentConditions(lat: number, lon: number): Promise<CurrentConditionsResponse> {
  const point = pointSchema.parse(await fetchJson(`${weatherBase}/points/${lat.toFixed(4)},${lon.toFixed(4)}`, 300));
  const city = point.properties.relativeLocation?.properties.city;
  const state = point.properties.relativeLocation?.properties.state;
  const county = normalizeCounty(point.properties.relativeLocation?.properties.county);

  return {
    currentConditions: await getLatestCurrentConditions(point.properties.observationStations),
    locationLabel: city && state ? `${city}, ${state}` : undefined,
    countyLabel: county
  };
}

export async function getKentuckyAlerts(): Promise<WeatherAlert[]> {
  const alerts = alertsSchema.parse(await fetchJson(`${weatherBase}/alerts/active?area=KY`, 120));

  return alerts.features.map((feature) => ({
    id: feature.id,
    event: feature.properties.event,
    expires: feature.properties.expires,
    areaDesc: feature.properties.areaDesc
  }));
}
