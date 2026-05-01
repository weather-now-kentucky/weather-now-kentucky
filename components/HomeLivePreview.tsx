import Link from "next/link";
import { Radio } from "lucide-react";

type HomeLivePreviewProps = {
  isLive: boolean;
  videoId?: string;
};

export function HomeLivePreview({ isLive, videoId }: HomeLivePreviewProps) {
  const embedVideoId = videoId?.trim();

  if (!isLive) {
    return null;
  }

  return (
    <section className="home-live-preview">
      <div className="home-live-copy">
        <span>
          <Radio aria-hidden="true" size={17} />
          Live Coverage
        </span>
        <h2>Watch live severe weather coverage now</h2>
      </div>
      <div className="home-live-frame">
        {embedVideoId ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            src={`https://www.youtube.com/embed/${embedVideoId}`}
            title="Weather Now Kentucky live preview"
          />
        ) : (
          <div className="live-empty">Add a YouTube Live Video ID in the admin dashboard.</div>
        )}
      </div>
      <Link className="button home-live-button" href="/live">
        Go Full Screen Coverage
      </Link>
    </section>
  );
}
