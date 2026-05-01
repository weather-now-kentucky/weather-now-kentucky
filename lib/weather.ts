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
    radarStation: z.string().optional()
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

export type PointForecast = {
  periods: ForecastPeriod[];
  radarStation?: string;
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

export async function getPointForecast(lat: number, lon: number): Promise<PointForecast> {
  const point = pointSchema.parse(await fetchJson(`${weatherBase}/points/${lat.toFixed(4)},${lon.toFixed(4)}`));
  const forecast = forecastSchema.parse(await fetchJson(point.properties.forecast));

  return {
    periods: forecast.properties.periods.slice(0, 14),
    radarStation: point.properties.radarStation
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
