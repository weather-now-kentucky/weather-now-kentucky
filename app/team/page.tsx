import { TeamMemberCard } from "@/components/TeamMemberCard";
import { getTeamMembers } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const teamMembers = await getTeamMembers();

  return (
    <>
      <section className="page-header team-page-header">
        <span className="eyebrow">Weather Now Kentucky Team</span>
        <h1>Meet the Weather Now Kentucky Team</h1>
        <p className="lede">The people behind the forecasts, live coverage, and Kentucky weather updates.</p>
      </section>
      <section className="team-grid">
        {teamMembers.map((member) => (
          <TeamMemberCard key={member.name} member={member} />
        ))}
      </section>
    </>
  );
}
