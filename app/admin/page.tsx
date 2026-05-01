import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Admin</span>
        <h1>Weather Now Kentucky control desk.</h1>
        <p className="lede">Manage forecast overrides, live status, blog posts, and sponsors.</p>
      </section>
      <AdminDashboard />
    </>
  );
}
