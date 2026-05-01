import { SponsorTile } from "@/components/SponsorTile";
import { getSponsors } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const sponsors = await getSponsors();

  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Sponsors</span>
        <h1>Community partners.</h1>
        <p className="lede">Sponsor tiles link externally and can be managed from the admin panel.</p>
      </section>
      <section className="grid two">
        {sponsors.map((sponsor) => (
          <SponsorTile key={sponsor.id} sponsor={sponsor} />
        ))}
      </section>
    </>
  );
}
