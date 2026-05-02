import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminSponsorsPage() {
  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Admin</span>
        <h1>Sponsor management.</h1>
        <p className="lede">Manage sponsor logos, status, and section placements for Weather Now Kentucky.</p>
      </section>
      <AdminDashboard />
    </>
  );
}
