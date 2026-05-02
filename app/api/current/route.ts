import { NextResponse } from "next/server";
import { getPointCurrentConditions } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Latitude and longitude are required." }, { status: 400 });
  }

  try {
    const current = await getPointCurrentConditions(lat, lon);
    return NextResponse.json(current);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch current conditions.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
