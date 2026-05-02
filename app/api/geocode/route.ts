import { NextResponse } from "next/server";
import { z } from "zod";

const geocodeResultSchema = z.array(
  z.object({
    lat: z.string(),
    lon: z.string(),
    display_name: z.string().optional(),
    address: z
      .object({
        city: z.string().optional(),
        town: z.string().optional(),
        village: z.string().optional(),
        county: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional()
      })
      .optional()
  })
);

const stateAbbreviations: Record<string, string> = {
  Kentucky: "KY",
  Indiana: "IN",
  Illinois: "IL",
  Missouri: "MO",
  Ohio: "OH",
  Tennessee: "TN",
  Virginia: "VA",
  "West Virginia": "WV"
};

function buildLabel(query: string, address?: z.infer<typeof geocodeResultSchema>[number]["address"]) {
  const city = address?.city ?? address?.town ?? address?.village ?? address?.county;
  const state = address?.state ? stateAbbreviations[address.state] ?? address.state : "";

  if (city && state) {
    return `${city}, ${state}`;
  }

  if (address?.postcode && state) {
    return `${address.postcode}, ${state}`;
  }

  return query;
}

function buildCounty(address?: z.infer<typeof geocodeResultSchema>[number]["address"]) {
  return address?.county?.replace(/\s+County$/i, "").trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Location query is required." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Weather Now Kentucky location search"
    },
    next: { revalidate: 86400 }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Unable to search for that location." }, { status: 502 });
  }

  const [result] = geocodeResultSchema.parse(await response.json());

  if (!result) {
    return NextResponse.json({ error: "No matching location found." }, { status: 404 });
  }

  return NextResponse.json({
    lat: Number(result.lat),
    lon: Number(result.lon),
    label: buildLabel(query, result.address),
    countyLabel: buildCounty(result.address)
  });
}
