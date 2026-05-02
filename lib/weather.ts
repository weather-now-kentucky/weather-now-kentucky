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

const nullableNumberArray = z.array(z.number().nullable()).optional();

const openMeteoForecastSchema = z.object({
  current: z.object({
    time: z.string().optional(),
    temperature_2m: z.number().nullable().optional(),
    relative_humidity_2m: z.number().nullable().optional(),
    apparent_temperature: z.number().nullable().optional(),
    dew_point_2m: z.number().nullable().optional(),
    weather_code: z.number().nullable().optional(),
    wind_speed_10m: z.number().nullable().optional(),
    wind_direction_10m: z.number().nullable().optional(),
    wind_gusts_10m: z.number().nullable().optional(),
    surface_pressure: z.number().nullable().optional(),
    pressure_msl: z.number().nullable().optional(),
    visibility: z.number().nullable().optional(),
    uv_index: z.number().nullable().optional()
  }),
  hourly: z
    .object({
      time: z.array(z.string()).optional(),
      temperature_2m: nullableNumberArray,
      apparent_temperature: nullableNumberArray,
      relative_humidity_2m: nullableNumberArray,
      dew_point_2m: nullableNumberArray,
      precipitation_probability: nullableNumberArray,
      weather_code: nullableNumberArray,
      wind_speed_10m: nullableNumberArray,
      wind_direction_10m: nullableNumberArray,
      wind_gusts_10m: nullableNumberArray,
      uv_index: nullableNumberArray,
      surface_pressure: nullableNumberArray,
      visibility: nullableNumberArray
    })
    .optional()
});

const openMeteoAirQualitySchema = z.object({
  current: z
    .object({
      time: z.string().optional(),
      us_aqi: z.number().nullable().optional(),
      pm2_5: z.number().nullable().optional(),
      pm10: z.number().nullable().optional(),
      carbon_monoxide: z.number().nullable().optional(),
      nitrogen_dioxide: z.number().nullable().optional(),
      sulphur_dioxide: z.number().nullable().optional(),
      ozone: z.number().nullable().optional(),
      dust: z.number().nullable().optional(),
      uv_index: z.number().nullable().optional(),
      uv_index_clear_sky: z.number().nullable().optional()
    })
    .optional(),
  hourly: z
    .object({
      time: z.array(z.string()).optional(),
      us_aqi: nullableNumberArray,
      pm2_5: nullableNumberArray,
      pm10: nullableNumberArray,
      uv_index: nullableNumberArray
    })
    .optional()
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
  pressureInHg?: number;
  visibilityMiles?: number;
  uvIndex?: number;
  uvLabel?: string;
  aqi?: number;
  aqiLabel?: string;
  pm25?: number;
  pm10?: number;
  dust?: number;
  textDescription?: string;
  weatherCode?: number;
  observedAt?: string;
  updatedAt?: string;
  source?: string;
};

export type HourlyForecastHour = {
  time: string;
  temperature?: number;
  feelsLike?: number;
  humidity?: number;
  dewpoint?: number;
  precipChance?: number;
  weatherCode?: number;
  textDescription?: string;
  windSpeed?: number;
  windDirection?: string;
  windGust?: number;
  uvIndex?: number;
  pressureInHg?: number;
  visibilityMiles?: number;
  aqi?: number;
  pm25?: number;
  pm10?: number;
};

export type PointForecast = {
  periods: ForecastPeriod[];
  radarStation?: string;
  locationLabel?: string;
  countyLabel?: string;
};

export type CurrentConditionsResponse = {
  currentConditions?: CurrentConditions;
  hourly?: HourlyForecastHour[];
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

function roundValue(value?: number | null, digits = 0) {
  if (typeof value !== "number") {
    return undefined;
  }

  const multiplier = Math.pow(10, digits);
  return Math.round(value * multiplier) / multiplier;
}

function hPaToInHg(value?: number | null) {
  return roundValue(typeof value === "number" ? value * 0.0295299830714 : undefined, 2);
}

function metersToMiles(value?: number | null) {
  return roundValue(typeof value === "number" ? value * 0.000621371 : undefined, 1);
}

function uvLabel(value?: number | null) {
  if (typeof value !== "number") {
    return undefined;
  }

  if (value >= 11) {
    return "Extreme";
  }

  if (value >= 8) {
    return "Very High";
  }

  if (value >= 6) {
    return "High";
  }

  if (value >= 3) {
    return "Moderate";
  }

  return "Low";
}

function aqiLabel(value?: number | null) {
  if (typeof value !== "number") {
    return undefined;
  }

  if (value <= 50) {
    return "Good";
  }

  if (value <= 100) {
    return "Moderate";
  }

  if (value <= 150) {
    return "Unhealthy for Sensitive Groups";
  }

  if (value <= 200) {
    return "Unhealthy";
  }

  if (value <= 300) {
    return "Very Unhealthy";
  }

  return "Hazardous";
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

function getHourlyNumber(values: (number | null)[] | undefined, index: number) {
  const value = values?.[index];
  return typeof value === "number" ? value : undefined;
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

function openMeteoCodeToText(code?: number | null) {
  if (typeof code !== "number") {
    return undefined;
  }

  const labels: Record<number, string> = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Freezing Fog",
    51: "Light Drizzle",
    53: "Drizzle",
    55: "Heavy Drizzle",
    56: "Light Freezing Drizzle",
    57: "Freezing Drizzle",
    61: "Light Rain",
    63: "Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Freezing Rain",
    71: "Light Snow",
    73: "Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Light Showers",
    81: "Showers",
    82: "Heavy Showers",
    85: "Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorms",
    96: "Thunderstorms With Hail",
    99: "Severe Thunderstorms With Hail"
  };

  return labels[code] ?? "Current Conditions";
}

async function getOpenMeteoWeatherBundle(
  lat: number,
  lon: number
): Promise<{ currentConditions?: CurrentConditions; hourly: HourlyForecastHour[] }> {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(lat));
  forecastUrl.searchParams.set("longitude", String(lon));
  forecastUrl.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,pressure_msl,visibility,uv_index"
  );
  forecastUrl.searchParams.set(
    "hourly",
    "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,surface_pressure,visibility"
  );
  forecastUrl.searchParams.set("temperature_unit", "fahrenheit");
  forecastUrl.searchParams.set("wind_speed_unit", "mph");
  forecastUrl.searchParams.set("precipitation_unit", "inch");
  forecastUrl.searchParams.set("timezone", "auto");

  const airQualityUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airQualityUrl.searchParams.set("latitude", String(lat));
  airQualityUrl.searchParams.set("longitude", String(lon));
  airQualityUrl.searchParams.set(
    "current",
    "us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index,uv_index_clear_sky"
  );
  airQualityUrl.searchParams.set("hourly", "us_aqi,pm2_5,pm10,uv_index");
  airQualityUrl.searchParams.set("timezone", "auto");

  const [forecastResponse, airQualityResponse] = await Promise.all([
    fetch(forecastUrl, {
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 120 }
    }),
    fetch(airQualityUrl, {
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 300 }
    })
  ]);

  if (!forecastResponse.ok) {
    throw new Error(`Open-Meteo forecast request failed: ${forecastResponse.status} ${forecastResponse.statusText}`);
  }

  const forecastData = openMeteoForecastSchema.parse(await forecastResponse.json());
  const airQualityData = airQualityResponse.ok ? openMeteoAirQualitySchema.parse(await airQualityResponse.json()) : undefined;
  const current = forecastData.current;
  const airQuality = airQualityData?.current;
  const pressure = hPaToInHg(current.pressure_msl ?? current.surface_pressure);
  const uv = roundValue(airQuality?.uv_index ?? current.uv_index, 1);
  const aqi = roundValue(airQuality?.us_aqi);

  const currentConditions: CurrentConditions = {
    temperature: roundValue(current.temperature_2m),
    feelsLike: roundValue(current.apparent_temperature),
    humidity: roundValue(current.relative_humidity_2m),
    dewpoint: roundValue(current.dew_point_2m),
    windSpeed: roundValue(current.wind_speed_10m),
    windDirection: degreesToCompass(current.wind_direction_10m),
    windGust: roundValue(current.wind_gusts_10m),
    pressureInHg: pressure,
    visibilityMiles: metersToMiles(current.visibility),
    uvIndex: uv,
    uvLabel: uvLabel(uv),
    aqi,
    aqiLabel: aqiLabel(aqi),
    pm25: roundValue(airQuality?.pm2_5, 1),
    pm10: roundValue(airQuality?.pm10, 1),
    dust: roundValue(airQuality?.dust, 1),
    textDescription: openMeteoCodeToText(current.weather_code),
    weatherCode: typeof current.weather_code === "number" ? current.weather_code : undefined,
    observedAt: "Open-Meteo",
    updatedAt: formatObservationTime(current.time),
    source: "Open-Meteo"
  };

  const now = Date.now();
  const forecastHourly = forecastData.hourly;
  const airQualityHourly = airQualityData?.hourly;
  const hourlyTimes = forecastHourly?.time ?? [];
  const startIndex = Math.max(
    hourlyTimes.findIndex((time) => new Date(time).getTime() >= now - 60 * 60 * 1000),
    0
  );

  const hourly = hourlyTimes.slice(startIndex, startIndex + 12).map((time, offset) => {
    const index = startIndex + offset;
    const weatherCode = getHourlyNumber(forecastHourly?.weather_code, index);
    const hourAqiIndex = airQualityHourly?.time?.findIndex((aqTime) => aqTime === time) ?? -1;
    const aqiValue =
      hourAqiIndex >= 0 ? getHourlyNumber(airQualityHourly?.us_aqi, hourAqiIndex) : undefined;

    return {
      time,
      temperature: roundValue(getHourlyNumber(forecastHourly?.temperature_2m, index)),
      feelsLike: roundValue(getHourlyNumber(forecastHourly?.apparent_temperature, index)),
      humidity: roundValue(getHourlyNumber(forecastHourly?.relative_humidity_2m, index)),
      dewpoint: roundValue(getHourlyNumber(forecastHourly?.dew_point_2m, index)),
      precipChance: roundValue(getHourlyNumber(forecastHourly?.precipitation_probability, index)),
      weatherCode,
      textDescription: openMeteoCodeToText(weatherCode),
      windSpeed: roundValue(getHourlyNumber(forecastHourly?.wind_speed_10m, index)),
      windDirection: degreesToCompass(getHourlyNumber(forecastHourly?.wind_direction_10m, index)),
      windGust: roundValue(getHourlyNumber(forecastHourly?.wind_gusts_10m, index)),
      uvIndex: roundValue(getHourlyNumber(forecastHourly?.uv_index, index), 1),
      pressureInHg: hPaToInHg(getHourlyNumber(forecastHourly?.surface_pressure, index)),
      visibilityMiles: metersToMiles(getHourlyNumber(forecastHourly?.visibility, index)),
      aqi: roundValue(aqiValue),
      pm25: hourAqiIndex >= 0 ? roundValue(getHourlyNumber(airQualityHourly?.pm2_5, hourAqiIndex), 1) : undefined,
      pm10: hourAqiIndex >= 0 ? roundValue(getHourlyNumber(airQualityHourly?.pm10, hourAqiIndex), 1) : undefined
    };
  });

  return {
    currentConditions,
    hourly
  };
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
  const [point, weatherBundle] = await Promise.all([
    fetchJson(`${weatherBase}/points/${lat.toFixed(4)},${lon.toFixed(4)}`, 300).then((data) => pointSchema.parse(data)),
    getOpenMeteoWeatherBundle(lat, lon)
  ]);
  const city = point.properties.relativeLocation?.properties.city;
  const state = point.properties.relativeLocation?.properties.state;
  const county = normalizeCounty(point.properties.relativeLocation?.properties.county);

  return {
    currentConditions: weatherBundle.currentConditions,
    hourly: weatherBundle.hourly,
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
