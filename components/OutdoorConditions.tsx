"use client";

import { useState } from "react";
import { Fish, Flower2, Hammer, Shield, Trophy } from "lucide-react";
import { SectionSponsorTag } from "@/components/SectionSponsorTag";
import type { CurrentConditions, HourlyForecastHour } from "@/lib/weather";
import { analyzeRainSignal } from "@/lib/weatherIntelligence";

type OutdoorConditionsProps = {
  current: CurrentConditions | null;
  hourly: HourlyForecastHour[];
};

type OutdoorScore = {
  id: string;
  name: string;
  score: number;
  label: string;
  summary: string;
  helped: string[];
  hurt: string[];
  metrics: string[];
};

function clampScore(score: number) {
  return Math.max(1, Math.min(10, score));
}

function scoreLabel(score: number, id?: string) {
  if (id === "sneeze-score") {
    if (score >= 8) return "Low allergy concern";
    if (score >= 6) return "Manageable";
    if (score >= 4) return "Moderate allergy sensitivity";
    if (score >= 2) return "High allergy sensitivity";
    return "Rough allergy day";
  }

  if (score >= 9) return "Excellent";
  if (score >= 7) return "Good";
  if (score >= 5) return "Fair";
  if (score >= 3) return "Poor";
  return "Bad";
}

function isStormCode(code?: number) {
  return typeof code === "number" && code >= 95;
}

function isHeavyRainCode(code?: number) {
  return typeof code === "number" && [65, 67, 82].includes(code);
}

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function metric(label: string, value: string) {
  return `${label}: ${value}`;
}

function finalize(score: number, name: string, helped: string[], hurt: string[], metrics: string[], summary?: string): OutdoorScore {
  const finalScore = clampScore(score);
  const id = name.toLowerCase().replace(/\s+/g, "-");
  const label = scoreLabel(finalScore, id);

  return {
    id,
    name,
    score: finalScore,
    label,
    summary: summary ?? `${label} setup for ${name.toLowerCase()} based on temperature, wind, air quality, and rain chances.`,
    helped,
    hurt,
    metrics
  };
}

function applyRainPenalty(score: number, hurt: string[], rainSignal: ReturnType<typeof analyzeRainSignal>, type: "water" | "field" | "play" | "work") {
  let nextScore = score;

  if (type === "play" && rainSignal.lightningWithin20Miles) {
    hurt.push("Sports play is not recommended with lightning within 20 miles.");
    return 1;
  }

  if (rainSignal.currentWet) {
    nextScore -= type === "play" ? 4 : type === "work" ? 3 : 3;
    hurt.push("Lowered because rain is occurring at your location.");
  } else if (rainSignal.nearbyWet || rainSignal.likelyNextHour) {
    nextScore -= type === "play" ? 3 : 2.5;
    hurt.push("Lowered because rain is nearby.");
  } else if (rainSignal.likelyNext3Hours) {
    nextScore -= type === "play" ? 3 : 2;
    hurt.push("Lowered because showers are expected within the next few hours.");
  } else if (rainSignal.likely3To6Hours) {
    nextScore -= type === "play" ? 1.5 : 1;
    hurt.push("Lowered because rain may arrive later in the next several hours.");
  } else if (rainSignal.laterToday) {
    nextScore -= type === "water" || type === "field" ? 1 : 0.5;
    hurt.push("Light later-day shower chances add some uncertainty.");
  }

  if (rainSignal.stormCurrent || rainSignal.stormNextHour || rainSignal.stormNext3Hours) {
    nextScore -= type === "play" ? 5 : type === "work" ? 4 : 3.5;
    hurt.push("Storm risk nearby makes outdoor plans less favorable.");
  } else if (rainSignal.storm3To6Hours) {
    nextScore -= type === "play" ? 3 : 2;
    hurt.push("Storms are possible later in the next several hours.");
  }

  return nextScore;
}

function buildScores(current: CurrentConditions | null, hourly: HourlyForecastHour[]): OutdoorScore[] {
  const nextHour = hourly[0];
  const temp = current?.temperature;
  const feelsLike = current?.feelsLike ?? temp;
  const dewpoint = current?.dewpoint;
  const humidity = current?.humidity;
  const wind = current?.windSpeed;
  const gust = current?.windGust;
  const pressure = current?.pressureInHg;
  const visibility = current?.visibilityMiles;
  const uv = current?.uvIndex ?? nextHour?.uvIndex;
  const aqi = current?.aqi ?? nextHour?.aqi;
  const pm25 = current?.pm25 ?? nextHour?.pm25;
  const pm10 = current?.pm10 ?? nextHour?.pm10;
  const precip = nextHour?.precipChance;
  const weatherCode = current?.weatherCode ?? nextHour?.weatherCode;
  const rainSignal = analyzeRainSignal(current, hourly);
  const stormy = isStormCode(weatherCode);
  const heavyRain = isHeavyRainCode(weatherCode) || (hasNumber(precip) && precip > 70) || rainSignal.maxPrecipAmountNext3 >= 0.15;
  const baseMetrics = [
    metric("Temp", hasNumber(temp) ? `${temp}°` : "--"),
    metric("Feels Like", hasNumber(feelsLike) ? `${feelsLike}°` : "--"),
    metric("Wind", hasNumber(wind) ? `${wind} mph` : "--"),
    metric("Gust", hasNumber(gust) ? `${gust} mph` : "--"),
    metric("Rain Chance", hasNumber(precip) ? `${precip}%` : "--"),
    metric("Max Rain Next 3 Hr", `${rainSignal.maxPrecipChanceNext3}% / ${rainSignal.maxPrecipAmountNext3.toFixed(2)} in`),
    metric("Max Rain Next 6 Hr", `${rainSignal.maxPrecipChanceNext6}% / ${rainSignal.maxPrecipAmountNext6.toFixed(2)} in`),
    metric("AQI", hasNumber(aqi) ? `${aqi}` : "--"),
    metric("UV", hasNumber(uv) ? `${uv}` : "--")
  ];

  const fishingHelped: string[] = [];
  const fishingHurt: string[] = [];
  let fishing = 7;
  if (hasNumber(pressure) && pressure >= 29.8 && pressure <= 30.3) {
    fishing += 1;
    fishingHelped.push("Pressure is in a steady fishing-friendly range.");
  }
  if (hasNumber(wind) && wind >= 4 && wind <= 12) {
    fishing += 1;
    fishingHelped.push("Wind is enough to ripple water without getting rough.");
  }
  if (hasNumber(precip) && precip >= 20 && precip <= 50 && !stormy) {
    fishing += 0.5;
    fishingHelped.push("A moderate shower chance can help activity when storms are not involved.");
  }
  if (stormy) {
    fishing -= 2;
    fishingHurt.push("Thunderstorm risk makes water activity unsafe.");
  }
  if (hasNumber(gust) && gust > 20) {
    fishing -= 1;
    fishingHurt.push("Gusty wind can make boating and casting harder.");
  }
  if (hasNumber(pressure) && (pressure < 29.6 || pressure > 30.5)) {
    fishing -= 1;
    fishingHurt.push("Pressure is outside the preferred range.");
  }
  if (heavyRain) {
    fishing -= 1;
    fishingHurt.push("Heavy rain risk lowers comfort and safety.");
  }
  fishing = applyRainPenalty(fishing, fishingHurt, rainSignal, "water");

  const huntingHelped: string[] = [];
  const huntingHurt: string[] = [];
  let hunting = 7;
  if (hasNumber(wind) && wind >= 3 && wind <= 10) {
    hunting += 1;
    huntingHelped.push("Light wind helps with scent movement without being disruptive.");
  }
  if (hasNumber(temp) && temp >= 35 && temp <= 65) {
    hunting += 1;
    huntingHelped.push("Temperature is in a comfortable field range.");
  }
  if (hasNumber(visibility) && visibility >= 5) {
    hunting += 1;
    huntingHelped.push("Visibility is good.");
  }
  if (hasNumber(gust) && gust > 25) {
    hunting -= 2;
    huntingHurt.push("Strong gusts can reduce movement and visibility cues.");
  }
  if (heavyRain || stormy) {
    hunting -= 1;
    huntingHurt.push("Rain or storm risk limits field conditions.");
  }
  if (hasNumber(aqi) && aqi > 100) {
    hunting -= 1;
    huntingHurt.push("Air quality is reduced.");
  }
  if (hasNumber(feelsLike) && (feelsLike < 25 || feelsLike > 90)) {
    hunting -= 1;
    huntingHurt.push("Feels-like temperature is outside the comfortable range.");
  }
  hunting = applyRainPenalty(hunting, huntingHurt, rainSignal, "field");

  const sportsHelped: string[] = [];
  const sportsHurt: string[] = [];
  let sports = 8;
  if (hasNumber(temp) && temp >= 55 && temp <= 78) {
    sports += 1;
    sportsHelped.push("Temperature is ideal for outdoor play.");
  }
  if (stormy) {
    sports -= 3;
    sportsHurt.push("Thunderstorms require postponing outdoor play.");
  }
  if (hasNumber(feelsLike) && feelsLike > 95) {
    sports -= 2;
    sportsHurt.push("Heat stress is elevated.");
  }
  if (hasNumber(aqi) && aqi > 100) {
    sports -= 2;
    sportsHurt.push("AQI is high enough to affect sensitive players.");
  }
  if (hasNumber(uv) && uv >= 8) {
    sports -= 1;
    sportsHurt.push("UV is very high.");
  }
  if (hasNumber(gust) && gust > 25) {
    sports -= 1;
    sportsHurt.push("Wind gusts may affect play.");
  }
  if (hasNumber(precip) && precip > 50) {
    sports -= 1;
    sportsHurt.push("Rain chance is elevated.");
  }
  sports = applyRainPenalty(sports, sportsHurt, rainSignal, "play");

  const workHelped: string[] = [];
  const workHurt: string[] = [];
  let work = 8;
  if (hasNumber(temp) && temp >= 50 && temp <= 75 && (!hasNumber(wind) || wind < 15)) {
    work += 1;
    workHelped.push("Temperature and wind are favorable for outdoor work.");
  }
  if (hasNumber(feelsLike) && (feelsLike > 90 || feelsLike < 25)) {
    work -= 2;
    workHurt.push("Feels-like temperature raises exposure concerns.");
  }
  if (hasNumber(aqi) && aqi > 100) {
    work -= 2;
    workHurt.push("Air quality is reduced.");
  }
  if (hasNumber(uv) && uv >= 8) {
    work -= 1;
    workHurt.push("UV exposure is high.");
  }
  if (hasNumber(dewpoint) && dewpoint > 68) {
    work -= 1;
    workHurt.push("High dew point makes work feel more humid.");
  }
  if (hasNumber(precip) && precip > 50) {
    work -= 1;
    workHurt.push("Rain chance is elevated.");
  }
  if (hasNumber(gust) && gust > 25) {
    work -= 1;
    workHurt.push("Gusts may affect ladders, equipment, or loose materials.");
  }
  work = applyRainPenalty(work, workHurt, rainSignal, "work");

  const sneezeHelped: string[] = [];
  const sneezeHurt: string[] = [];
  const month = new Date().getMonth() + 1;
  const spring = month >= 3 && month <= 5;
  const summer = month >= 6 && month <= 8;
  const lateSummerFall = month >= 8 && month <= 10;
  let sneeze = 8;

  if (spring) {
    sneeze -= 2;
    sneezeHurt.push("Kentucky spring often brings tree and grass pollen sensitivity.");
  } else if (summer) {
    sneeze -= 1;
    sneezeHurt.push("Kentucky summer can favor grass pollen and mold sensitivity.");
  } else if (lateSummerFall) {
    sneeze -= 2;
    sneezeHurt.push("Late summer and fall can bring ragweed and mold triggers.");
  } else {
    sneezeHelped.push("Seasonal pollen pressure is usually lower this time of year.");
  }
  if (hasNumber(aqi) && aqi > 100) {
    sneeze -= 2;
    sneezeHurt.push("AQI is elevated for sensitive groups.");
  } else if (hasNumber(aqi) && aqi <= 50) {
    sneeze += 1;
    sneezeHelped.push("AQI is in a cleaner range.");
  }
  if (hasNumber(pm25) && pm25 > 12) {
    sneeze -= 2;
    sneezeHurt.push("PM2.5 may add smoke, haze, or fine particle irritation.");
  }
  if (hasNumber(pm10) && pm10 > 54) {
    sneeze -= 1;
    sneezeHurt.push("PM10 is elevated enough to irritate allergies.");
  }
  if (hasNumber(wind) && wind >= 14 && (!hasNumber(humidity) || humidity < 60)) {
    sneeze -= 1;
    sneezeHurt.push("Windy and drier air can spread pollen.");
  }
  if ((rainSignal.currentWet || rainSignal.nearbyWet) && (!hasNumber(humidity) || humidity < 80)) {
    sneeze += 1;
    sneezeHelped.push("Recent or nearby rain can temporarily wash some pollen down.");
  }
  if ((rainSignal.currentWet || rainSignal.laterToday || (hasNumber(humidity) && humidity >= 75)) && (summer || lateSummerFall)) {
    sneeze -= 1;
    sneezeHurt.push("Humidity or rain can raise mold sensitivity after wet weather.");
  }

  return [
    finalize(fishing, "Fishing", fishingHelped, fishingHurt, [...baseMetrics, metric("Pressure", hasNumber(pressure) ? `${pressure.toFixed(2)} inHg` : "--")]),
    finalize(hunting, "Hunting", huntingHelped, huntingHurt, [...baseMetrics, metric("Visibility", hasNumber(visibility) ? `${visibility} mi` : "--")]),
    finalize(sports, "Sports Play", sportsHelped, sportsHurt, baseMetrics),
    finalize(work, "Outdoor Work", workHelped, workHurt, [...baseMetrics, metric("Dew Point", hasNumber(dewpoint) ? `${dewpoint}°` : "--"), metric("PM2.5", hasNumber(pm25) ? `${pm25} ug/m3` : "--")]),
    finalize(
      sneeze,
      "Sneeze Score",
      sneezeHelped,
      sneezeHurt,
      [
        metric("AQI", hasNumber(aqi) ? `${aqi}` : "--"),
        metric("PM2.5", hasNumber(pm25) ? `${pm25} ug/m3` : "--"),
        metric("PM10", hasNumber(pm10) ? `${pm10} ug/m3` : "--"),
        metric("Wind", hasNumber(wind) ? `${wind} mph` : "--"),
        metric("Humidity", hasNumber(humidity) ? `${humidity}%` : "--"),
        metric("Rain Signal", rainSignal.currentWet ? "current rain" : rainSignal.nearbyWet ? "nearby rain" : rainSignal.laterToday ? "later rain" : "mostly dry"),
        metric("Season", spring ? "tree/grass pollen" : summer ? "grass/mold" : lateSummerFall ? "ragweed/mold" : "lower pollen")
      ],
      `${scoreLabel(clampScore(sneeze), "sneeze-score")} based on air quality, wind, humidity, rain, and Kentucky seasonal allergy triggers.`
    )
  ];
}

const icons = {
  fishing: Fish,
  hunting: Shield,
  "sports-play": Trophy,
  "outdoor-work": Hammer,
  "sneeze-score": Flower2
};

export function OutdoorConditions({ current, hourly }: OutdoorConditionsProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const scores = buildScores(current, hourly);

  return (
    <section className="outdoor-section">
      <div className="forecast-heading">
        <div>
          <span className="eyebrow">Outdoor Conditions</span>
          <h2>Location-based comfort scores for Kentucky weather.</h2>
        </div>
        <SectionSponsorTag sectionKey="home_outdoor_conditions" />
      </div>
      <div className="outdoor-grid">
        {scores.map((item) => {
          const Icon = icons[item.id as keyof typeof icons];
          const isExpanded = expanded === item.id;

          return (
            <article className="outdoor-card" key={item.id}>
              <button
                aria-expanded={isExpanded}
                className="outdoor-card-button"
                onClick={() => setExpanded(isExpanded ? null : item.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={24} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.summary}</small>
                </span>
                <b>
                  {item.score}
                  <small>{item.label}</small>
                </b>
              </button>
              {isExpanded ? (
                <div className="outdoor-breakdown">
                  <div>
                    <strong>What helped</strong>
                    <p>{item.helped.length ? item.helped.join(" ") : "No strong positive signals right now."}</p>
                  </div>
                  <div>
                    <strong>What hurt</strong>
                    <p>{item.hurt.length ? item.hurt.join(" ") : "No major limiting factors right now."}</p>
                  </div>
                  <div>
                    <strong>Metrics used</strong>
                    <p>{item.metrics.join(" / ")}</p>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
