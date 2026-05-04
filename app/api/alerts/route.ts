import { NextResponse } from "next/server";
import { getKentuckyAlerts } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET() {
  const endpoint = "https://api.weather.gov/alerts/active?area=KY";

  try {
    const alerts = await getKentuckyAlerts();

    if (process.env.NODE_ENV === "development") {
      console.debug("WNK alerts fetch success", { endpoint, status: 200, mode: "fresh" });
    }

    return NextResponse.json({ alerts, fetchedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "NWS alert data is temporarily unavailable.";

    if (process.env.NODE_ENV === "development") {
      console.debug("WNK alerts fetch fallback", { endpoint, status: 502, mode: "error", message });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
