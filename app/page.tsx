import { HomeWeather } from "@/components/HomeWeather";
import { getSiteSettings } from "@/lib/content";
import { getKentuckyAlerts, type WeatherAlert } from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();
  const georgeForecastUpdatedAt = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  let alerts: WeatherAlert[] = [];

  try {
    alerts = await getKentuckyAlerts();
  } catch {
    alerts = [];
  }

  return (
    <>
      <HomeWeather
        alerts={alerts}
        forecastOverride={settings.forecastOverride}
        georgeForecastUpdatedAt={georgeForecastUpdatedAt}
        isLive={settings.isLive}
        liveVideoId={settings.youtubeVideoId?.trim() || process.env.NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID}
      />
    </>
  );
}
