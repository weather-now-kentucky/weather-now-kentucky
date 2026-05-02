import { HomeWeather } from "@/components/HomeWeather";
import { getKentuckyAlerts, type WeatherAlert } from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let alerts: WeatherAlert[] = [];

  try {
    alerts = await getKentuckyAlerts();
  } catch {
    alerts = [];
  }

  return <HomeWeather alerts={alerts} />;
}
