import { NextResponse } from "next/server";
import { getPointForecast } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Latitude and longitude are required." }, { status: 400 });
  }

  try {
    const forecast = await getPointForecast(lat, lon);
    return NextResponse.json(forecast);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch forecast.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
