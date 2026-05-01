import { Radio } from "lucide-react";

type LivePlayerProps = {
  videoId?: string;
  isLive: boolean;
};

export function LivePlayer({ videoId, isLive }: LivePlayerProps) {
  const embedVideoId = videoId?.trim();

  return (
    <section className="live-wrap">
      <div className="live-status" data-live={isLive}>
        <Radio aria-hidden="true" size={18} />
        {isLive ? "LIVE NOW" : "Off Air"}
      </div>
      <div className="live-frame">
        {embedVideoId ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            src={`https://www.youtube.com/embed/${embedVideoId}`}
            title="Weather Now Kentucky live stream"
          />
        ) : (
          <div className="live-empty">Add NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID to enable the live stream.</div>
        )}
      </div>
    </section>
  );
}
