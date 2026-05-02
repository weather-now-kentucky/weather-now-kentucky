import { ExternalLink } from "lucide-react";
import type { TeamMember } from "@/lib/content";

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <article className="team-member-card">
      <div className="team-headshot">
        {member.photoUrl ? <img alt={`${member.name} headshot`} src={member.photoUrl} /> : <span>{initialsFor(member.name)}</span>}
      </div>
      <div className="team-member-body">
        <span>{member.role}</span>
        <h2>{member.name}</h2>
        <p>{member.bio}</p>
        {member.socialUrl ? (
          <a className="team-link" href={member.socialUrl} rel="noreferrer" target="_blank">
            View profile
            <ExternalLink aria-hidden="true" size={16} />
          </a>
        ) : null}
      </div>
    </article>
  );
}
