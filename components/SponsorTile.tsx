import { ExternalLink } from "lucide-react";
import type { Sponsor } from "@/lib/content";

export function SponsorTile({ sponsor }: { sponsor: Sponsor }) {
  return (
    <a className="sponsor-tile card" href={sponsor.url} rel="noreferrer" target="_blank">
      {sponsor.logoUrl ? (
        <img alt={`${sponsor.name} logo`} src={sponsor.logoUrl} />
      ) : (
        <div className="sponsor-mark">{sponsor.name.charAt(0)}</div>
      )}
      <div>
        <h3>{sponsor.name}</h3>
        {sponsor.description ? <p>{sponsor.description}</p> : null}
      </div>
      <ExternalLink aria-hidden="true" size={18} />
    </a>
  );
}
