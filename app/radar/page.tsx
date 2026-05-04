import { RadarTabs } from "@/components/RadarTabs";
import { SectionSponsorTag } from "@/components/SectionSponsorTag";

export default function RadarPage() {
  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Radar</span>
        <h1>Regional radar for Kentucky.</h1>
        <p className="lede">
          Live WeatherWise radar focused on Kentucky and the Ohio Valley.
        </p>
        <SectionSponsorTag sectionKey="radar_main" />
      </section>
      <RadarTabs />
    </>
  );
}
