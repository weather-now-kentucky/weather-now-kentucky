import { OutlookWeather } from "@/components/OutlookWeather";

export const dynamic = "force-dynamic";

export default function OutlookPage() {
  return (
    <>
      <section className="page-header">
        <span className="eyebrow">Kentucky Outlook</span>
        <h1>Kentucky Outlook</h1>
        <p className="lede">What&apos;s next across Kentucky, including the seven-day forecast and regional breakdowns.</p>
      </section>
      <OutlookWeather />
    </>
  );
}
