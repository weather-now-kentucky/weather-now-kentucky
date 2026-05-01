import { LivePlayer } from "@/components/LivePlayer";
import { getSiteSettings } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const settings = await getSiteSettings();
  const videoId = settings.youtubeVideoId?.trim() || process.env.NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID;

  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Live Coverage</span>
        <h1>Weather Now Kentucky live stream.</h1>
        <p className="lede">
          Watch live briefings and severe weather coverage when the Weather Now Kentucky desk is on the air.
        </p>
      </section>
      <LivePlayer isLive={settings.isLive} videoId={videoId} />
    </>
  );
}
