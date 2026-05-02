import { SectionSponsorTag } from "@/components/SectionSponsorTag";

const regions = ["Western KY", "Central KY", "Eastern KY"];

export function KentuckyFocusTiles({ sponsorKey }: { sponsorKey?: string }) {
  return (
    <section className="kentucky-focus">
      <div className="forecast-heading">
        <div>
          <span className="eyebrow">Kentucky Weather Focus</span>
          <h2>Regional outlook</h2>
        </div>
        {sponsorKey ? <SectionSponsorTag sectionKey={sponsorKey} /> : null}
      </div>
      <div className="kentucky-focus-grid">
        {regions.map((region) => (
          <article className="kentucky-focus-tile" key={region}>
            <h3>{region}</h3>
            <p>Regional forecast details coming soon.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
