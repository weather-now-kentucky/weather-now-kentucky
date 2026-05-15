import type { CurrentConditions, HourlyForecastHour } from "@/lib/weather";

export type RainSignal = {
  currentWet: boolean;
  nearbyWet: boolean;
  likelyNextHour: boolean;
  likelyNext3Hours: boolean;
  likely3To6Hours: boolean;
  laterToday: boolean;
  stormCurrent: boolean;
  stormNextHour: boolean;
  stormNext3Hours: boolean;
  storm3To6Hours: boolean;
  stormLater: boolean;
  lightningWithin20Miles: boolean;
  maxPrecipChanceNextHour: number;
  maxPrecipChanceNext3: number;
  maxPrecipChanceNext6: number;
  maxPrecipChanceToday: number;
  maxPrecipAmountNextHour: number;
  maxPrecipAmountNext3: number;
  maxPrecipAmountNext6: number;
  maxPrecipAmountToday: number;
  nextWetHourIndex: number | null;
};

export type PrimaryWeatherState =
  | "SEVERE_ACTIVE"
  | "LIGHTNING_NEARBY"
  | "RAINING_NOW"
  | "STORMS_NEARBY"
  | "RAIN_APPROACHING"
  | "RAIN_LATER"
  | "QUIET_DRY";

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isWetWeatherCode(code?: number) {
  return (
    typeof code === "number" &&
    (((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 71 && code <= 77) || code === 85 || code === 86 || code >= 95))
  );
}

export function isStormWeatherCode(code?: number) {
  return typeof code === "number" && code >= 95;
}

function isWetHour(hour: Pick<HourlyForecastHour, "weatherCode" | "precipChance" | "precipAmount">) {
  return isWetWeatherCode(hour.weatherCode) || (hour.precipChance ?? 0) >= 35 || (hour.precipAmount ?? 0) >= 0.01;
}

function maxNumber(values: Array<number | undefined>) {
  return values.filter(hasNumber).reduce((max, value) => Math.max(max, value), 0);
}

export function analyzeRainSignal(current: CurrentConditions | null, hourly: HourlyForecastHour[]): RainSignal {
  const todayHours = hourly.filter((hour) => {
    const time = new Date(hour.time);
    const now = new Date();
    return time.getFullYear() === now.getFullYear() && time.getMonth() === now.getMonth() && time.getDate() === now.getDate();
  });
  const restOfToday = todayHours.length ? todayHours : hourly;
  const nextHour = hourly.slice(0, 1);
  const next3Hours = hourly.slice(0, 3);
  const next6Hours = hourly.slice(0, 6);
  const hours3To6 = hourly.slice(3, 6);
  const currentWet =
    isWetWeatherCode(current?.weatherCode) ||
    (current?.textDescription?.toLowerCase().match(/rain|shower|drizzle|storm|thunder|snow|sleet|ice/) ? true : false) ||
    (current?.precipAmount ?? 0) >= 0.01;
  const nearbyWet = currentWet || nextHour.some(isWetHour);
  const likelyNextHour = nextHour.some((hour) => isWetHour(hour) || (hour.precipChance ?? 0) >= 40);
  const likelyNext3Hours = next3Hours.some((hour) => isWetHour(hour) || (hour.precipChance ?? 0) >= 45);
  const likely3To6Hours = hours3To6.some((hour) => isWetHour(hour) || (hour.precipChance ?? 0) >= 45);
  const laterToday = restOfToday.slice(6).some((hour) => isWetHour(hour) || (hour.precipChance ?? 0) >= 45);
  const nextWetHourIndex = hourly.findIndex((hour) => isWetHour(hour) || (hour.precipChance ?? 0) >= 45);
  const stormCurrent = isStormWeatherCode(current?.weatherCode) || current?.textDescription?.toLowerCase().includes("thunder") === true;
  const stormNextHour = nextHour.some((hour) => isStormWeatherCode(hour.weatherCode));
  const stormNext3Hours = next3Hours.some((hour) => isStormWeatherCode(hour.weatherCode));
  const storm3To6Hours = hours3To6.some((hour) => isStormWeatherCode(hour.weatherCode));
  const lightningDistance = (current as CurrentConditions & { lightningDistanceMiles?: number } | null)?.lightningDistanceMiles;

  return {
    currentWet,
    nearbyWet,
    likelyNextHour,
    likelyNext3Hours,
    likely3To6Hours,
    laterToday,
    stormCurrent,
    stormNextHour,
    stormNext3Hours,
    storm3To6Hours,
    stormLater: restOfToday.slice(6).some((hour) => isStormWeatherCode(hour.weatherCode)),
    lightningWithin20Miles: hasNumber(lightningDistance) && lightningDistance <= 20,
    maxPrecipChanceNextHour: maxNumber(nextHour.map((hour) => hour.precipChance)),
    maxPrecipChanceNext3: maxNumber(next3Hours.map((hour) => hour.precipChance)),
    maxPrecipChanceNext6: maxNumber(next6Hours.map((hour) => hour.precipChance)),
    maxPrecipChanceToday: maxNumber(restOfToday.map((hour) => hour.precipChance)),
    maxPrecipAmountNextHour: maxNumber(nextHour.map((hour) => hour.precipAmount)),
    maxPrecipAmountNext3: maxNumber(next3Hours.map((hour) => hour.precipAmount)),
    maxPrecipAmountNext6: maxNumber(next6Hours.map((hour) => hour.precipAmount)),
    maxPrecipAmountToday: maxNumber(restOfToday.map((hour) => hour.precipAmount)),
    nextWetHourIndex: nextWetHourIndex >= 0 ? nextWetHourIndex : null
  };
}

export function resolvePrimaryWeatherState(signal: RainSignal, options: { hasActiveWarning?: boolean } = {}): PrimaryWeatherState {
  if (options.hasActiveWarning) {
    return "SEVERE_ACTIVE";
  }

  if (signal.lightningWithin20Miles) {
    return "LIGHTNING_NEARBY";
  }

  if (signal.stormCurrent) {
    return "STORMS_NEARBY";
  }

  if (signal.currentWet) {
    return "RAINING_NOW";
  }

  if (signal.stormNextHour || signal.stormNext3Hours) {
    return "STORMS_NEARBY";
  }

  if (signal.nearbyWet || signal.likelyNextHour || signal.likelyNext3Hours) {
    return "RAIN_APPROACHING";
  }

  if (signal.storm3To6Hours || signal.likely3To6Hours || signal.stormLater || signal.laterToday) {
    return "RAIN_LATER";
  }

  return "QUIET_DRY";
}

export function buildRainAwareInsight(
  current: CurrentConditions | null,
  hourly: HourlyForecastHour[],
  state = resolvePrimaryWeatherState(analyzeRainSignal(current, hourly))
) {
  const temp = current?.temperature;

  if (state === "SEVERE_ACTIVE") {
    return "Severe weather is active nearby. Stay weather-aware and keep alerts close.";
  }

  if (state === "LIGHTNING_NEARBY") {
    return "Lightning is close enough to make outdoor plans unsafe right now.";
  }

  if (state === "STORMS_NEARBY") {
    return "Storms are close enough to watch carefully. Keep radar handy.";
  }

  if (state === "RAINING_NOW") {
    return "Rain is moving through right now around your location.";
  }

  if (state === "RAIN_APPROACHING") {
    return "Rain is nearby with showers possible shortly.";
  }

  if (state === "RAIN_LATER") {
    return "Rain or storms may become more likely later today.";
  }

  if (hasNumber(temp) && temp <= 45) {
    return "Cool conditions are in place with no immediate rain signal.";
  }

  if (hasNumber(temp) && temp >= 85) {
    return "Warm conditions are in place. Watch heat, humidity, and afternoon storm chances.";
  }

  return "Quiet weather for now with the next few hours looking steady.";
}

export function buildRainAwareSnapshotSummary(signal: RainSignal, state = resolvePrimaryWeatherState(signal)) {
  if (state === "SEVERE_ACTIVE") {
    return "Severe weather is the main concern nearby.";
  }

  if (state === "LIGHTNING_NEARBY") {
    return "Lightning nearby is the main outdoor safety concern.";
  }

  if (state === "STORMS_NEARBY") {
    return "Thunder or storms are the main weather concern.";
  }

  if (state === "RAINING_NOW") {
    return "Ongoing rain is the main short-term weather signal.";
  }

  if (state === "RAIN_APPROACHING") {
    return "Nearby showers are the main short-term weather signal.";
  }

  if (state === "RAIN_LATER") {
    return "Showers are possible later today.";
  }

  return "No rain nearby in the short term.";
}
