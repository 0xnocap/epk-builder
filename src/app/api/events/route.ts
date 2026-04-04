import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const artistName = request.nextUrl.searchParams.get("artist");
  if (!artistName) {
    return Response.json({ error: "artist parameter required" }, { status: 400 });
  }

  const appId = process.env.BANDSINTOWN_APP_ID || "epk-generator";
  const url = `https://rest.bandsintown.com/artists/${encodeURIComponent(artistName)}/events?app_id=${appId}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return Response.json({ events: [] });

    const events = await res.json();
    const mapped = (Array.isArray(events) ? events : [])
      .slice(0, 10)
      .map((e: any) => ({
        date: e.datetime,
        venue: e.venue?.name,
        city: e.venue?.city,
        region: e.venue?.region,
        country: e.venue?.country,
        ticketUrl: e.offers?.[0]?.url || e.url,
      }));

    return Response.json({ events: mapped });
  } catch {
    return Response.json({ events: [] });
  }
}
