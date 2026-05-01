import Link from "next/link";

export function LiveNowBanner({ isLive }: { isLive: boolean }) {
  if (!isLive) {
    return null;
  }

  return (
    <section className="live-now-banner" aria-label="Live severe weather coverage">
      <div className="live-now-inner">
        <span className="live-now-text">
          <span className="live-dot" aria-hidden="true" />
          LIVE NOW: Severe Weather Coverage Across Kentucky
        </span>
        <Link className="live-now-button" href="/live">
          Watch Live
        </Link>
      </div>
    </section>
  );
}
