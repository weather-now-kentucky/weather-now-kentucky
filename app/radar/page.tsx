import { SectionSponsorTag } from "@/components/SectionSponsorTag";

export default function RadarPage() {
  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Radar</span>
        <h1>Regional radar for Kentucky.</h1>
        <p className="lede">
          National Weather Service radar imagery focused on the Ohio Valley and central Kentucky corridor.
        </p>
        <SectionSponsorTag sectionKey="radar_main" />
      </section>
      <section className="panel">
        <div style={{ aspectRatio: "16 / 10", borderRadius: 8, overflow: "hidden", background: "#111827" }}>
          <img
            alt="Kentucky radar loop"
            src="https://radar.weather.gov/ridge/standard/KLVX_loop.gif"
            style={{ display: "block", height: "100%", objectFit: "contain", width: "100%" }}
          />
        </div>
      </section>
    </>
  );
}
