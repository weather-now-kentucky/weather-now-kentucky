import type { CurrentConditions, HourlyForecastHour } from "@/lib/weather";

export type RainSignal = {
  currentWet: boolean;
  nearbyWet: boolean;
  likelyNext3Hours: boolean;
  laterToday: boolean;
  stormCurrent: boolean;
  stormNext3Hours: boolean;
  stormLater: boolean;
  maxPrecipChanceNext3: number;
  maxPrecipChanceToday: number;
  maxPrecipAmountNext3: number;
  maxPrecipAmountToday: number;
  nextWetHourIndex: number | null;
};

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
  const next3Hours = hourly.slice(0, 3);
  const currentWet =
    isWetWeatherCode(current?.weatherCode) ||
    (current?.textDescription?.toLowerCase().match(/rain|shower|drizzle|storm|thunder|snow|sleet|ice/) ? true : false) ||
    (current?.precipAmount ?? 0) >= 0.01;
  const nearbyWet = currentWet || hourly.slice(0, 2).some(isWetHour);
  const likelyNext3Hours = next3Hours.some((hour) => isWetHour(hour) || (hour.precipChance ?? 0) >= 45);
  const laterToday = restOfToday.slice(3).some((hour) => isWetHour(hour) || (hour.precipChance ?? 0) >= 45);
  const nextWetHourIndex = hourly.findIndex((hour) => isWetHour(hour) || (hour.precipChance ?? 0) >= 45);
  const stormCurrent = isStormWeatherCode(current?.weatherCode) || current?.textDescription?.toLowerCase().includes("thunder") === true;
  const stormNext3Hours = next3Hours.some((hour) => isStormWeatherCode(hour.weatherCode));

  return {
    currentWet,
    nearbyWet,
    likelyNext3Hours,
    laterToday,
    stormCurrent,
    stormNext3Hours,
    stormLater: restOfToday.slice(3).some((hour) => isStormWeatherCode(hour.weatherCode)),
    maxPrecipChanceNext3: maxNumber(next3Hours.map((hour) => hour.precipChance)),
    maxPrecipChanceToday: maxNumber(restOfToday.map((hour) => hour.precipChance)),
    maxPrecipAmountNext3: maxNumber(next3Hours.map((hour) => hour.precipAmount)),
    maxPrecipAmountToday: maxNumber(restOfToday.map((hour) => hour.precipAmount)),
    nextWetHourIndex: nextWetHourIndex >= 0 ? nextWetHourIndex : null
  };
}

export function buildRainAwareInsight(current: CurrentConditions | null, hourly: HourlyForecastHour[]) {
  const signal = analyzeRainSignal(current, hourly);
  const temp = current?.temperature;

  if (signal.stormCurrent || signal.stormNext3Hours) {
    return "Storms are close enough to watch carefully. Keep radar handy.";
  }

  if (signal.currentWet || signal.nearbyWet) {
    return "Rain nearby now. Keep an eye on radar and changing road conditions.";
  }

  if (signal.likelyNext3Hours) {
    return "Mostly dry now, but showers may move in over the next few hours.";
  }

  if (signal.laterToday) {
    return "Dry for now, with showers possible later today around your location.";
  }

  if (hasNumber(temp) && temp <= 45) {
    return "Cool and quiet right now with Kentucky weather holding steady nearby.";
  }

  if (hasNumber(temp) && temp >= 85) {
    return "Warm conditions are in place. Watch heat, humidity, and afternoon storm chances.";
  }

  return "Conditions look steady for now, with the next few hours worth watching.";
}

export function buildRainAwareSnapshotSummary(signal: RainSignal) {
  if (signal.stormCurrent || signal.stormNext3Hours) {
    return "Thunder or storms are the main weather concern.";
  }

  if (signal.currentWet || signal.nearbyWet) {
    return "Rain nearby is the main short-term weather signal.";
  }

  if (signal.likelyNext3Hours) {
    return "Mostly dry now, but showers may move in soon.";
  }

  if (signal.laterToday) {
    return "Showers are possible later today.";
  }

  return "Mostly dry signal in the next several hours.";
}
