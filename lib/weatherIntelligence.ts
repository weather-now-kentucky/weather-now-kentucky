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

export function buildRainAwareInsight(current: CurrentConditions | null, hourly: HourlyForecastHour[]) {
  const signal = analyzeRainSignal(current, hourly);
  const temp = current?.temperature;

  if (signal.lightningWithin20Miles) {
    return "Lightning is close enough to make outdoor plans unsafe right now.";
  }

  if (signal.stormCurrent || signal.stormNextHour || signal.stormNext3Hours) {
    return "Storms are close enough to watch carefully. Keep radar handy.";
  }

  if (signal.currentWet || signal.nearbyWet) {
    return "Rain is nearby with showers possible shortly.";
  }

  if (signal.likelyNextHour) {
    return "Dry now, but rain may move in shortly around your location.";
  }

  if (signal.likelyNext3Hours) {
    return "Dry now, but rain may move in over the next few hours.";
  }

  if (signal.likely3To6Hours || signal.storm3To6Hours) {
    return signal.storm3To6Hours
      ? "Quiet right now, but storms are possible later, so keep an eye on radar."
      : "Mostly dry now, with showers possible later in the next several hours.";
  }

  if (signal.laterToday) {
    return "Periods of rain are possible today, though the next few hours look quieter.";
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
  if (signal.lightningWithin20Miles) {
    return "Lightning nearby is the main outdoor safety concern.";
  }

  if (signal.stormCurrent || signal.stormNextHour || signal.stormNext3Hours) {
    return "Thunder or storms are the main weather concern.";
  }

  if (signal.currentWet || signal.nearbyWet) {
    return "Rain nearby is the main short-term weather signal.";
  }

  if (signal.likelyNextHour) {
    return "Rain may arrive shortly.";
  }

  if (signal.likelyNext3Hours) {
    return "Mostly dry now, but showers may move in soon.";
  }

  if (signal.likely3To6Hours) {
    return "Showers may arrive later in the next several hours.";
  }

  if (signal.laterToday) {
    return "Showers are possible later today.";
  }

  return "Quiet right now, with mostly dry conditions expected.";
}
