"use client";

import { useEffect, useMemo, useState } from "react";
import { getActiveSponsors, getSponsorPlacementsForSection, type Sponsor, type SponsorPlacement } from "@/lib/content";

type SectionSponsorTagProps = {
  sectionKey: string;
  className?: string;
};

function chooseDailyPlacement(placements: SponsorPlacement[]) {
  if (placements.length <= 1) {
    return placements[0];
  }

  const sorted = [...placements].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.sponsorId.localeCompare(b.sponsorId));
  const daySeed = Math.floor(Date.now() / 86400000);
  return sorted[daySeed % sorted.length];
}

export function SectionSponsorTag({ sectionKey, className = "" }: SectionSponsorTagProps) {
  const [placements, setPlacements] = useState<SponsorPlacement[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    let active = true;

    async function loadSponsor() {
      const [loadedPlacements, loadedSponsors] = await Promise.all([getSponsorPlacementsForSection(sectionKey), getActiveSponsors()]);

      if (active) {
        setPlacements(loadedPlacements.filter((placement) => placement.enabled));
        setSponsors(loadedSponsors.filter((sponsor) => sponsor.status === "active"));
      }
    }

    loadSponsor().catch(() => {
      if (active) {
        setPlacements([]);
        setSponsors([]);
      }
    });

    return () => {
      active = false;
    };
  }, [sectionKey]);

  const selected = useMemo(() => {
    const placement = chooseDailyPlacement(placements);
    const sponsor = placement ? sponsors.find((candidate) => candidate.id === placement.sponsorId) : undefined;
    return placement && sponsor ? { placement, sponsor } : null;
  }, [placements, sponsors]);

  if (!selected) {
    return null;
  }

  return (
    <a
      className={`section-sponsor-tag ${className}`.trim()}
      href={selected.sponsor.websiteUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span>{selected.placement.displayLabel || "Sponsored by"}</span>
      {selected.sponsor.logoUrl ? (
        <img alt={`${selected.sponsor.name} logo`} src={selected.sponsor.logoUrl} />
      ) : (
        <strong>{selected.sponsor.name}</strong>
      )}
    </a>
  );
}
