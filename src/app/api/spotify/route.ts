import { NextRequest, NextResponse } from "next/server";

async function getSpotifyToken(): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("Spotify token error:", data);
    throw new Error("Failed to get Spotify token");
  }
  return data.access_token;
}

export async function GET(req: NextRequest) {
  let artistId = req.nextUrl.searchParams.get("artistId");
  const searchName = req.nextUrl.searchParams.get("name");

  if (!artistId && !searchName) {
    return NextResponse.json({ error: "artistId or name required" }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${token}` };

    // If no artistId, search by name first
    if (!artistId && searchName) {
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(searchName)}&limit=5`,
        { headers }
      );
      if (!searchRes.ok) {
        return NextResponse.json({ error: "Spotify search failed" }, { status: searchRes.status });
      }
      const searchData = await searchRes.json();
      const artists = searchData?.artists?.items || [];
      if (artists.length === 0) {
        return NextResponse.json({ error: "No artist found", searched: true }, { status: 404 });
      }
      // Find best match - prefer exact name match (case-insensitive), fall back to first result
      const nameLower = searchName.toLowerCase();
      const exactMatch = artists.find((a: any) => a.name.toLowerCase() === nameLower);
      const bestMatch = exactMatch || artists[0];
      // If no exact match, check the top result is reasonably close
      if (!exactMatch) {
        const topName = bestMatch.name.toLowerCase();
        // Reject if the names are too different (simple check: one must contain the other)
        if (!topName.includes(nameLower) && !nameLower.includes(topName)) {
          return NextResponse.json({ error: "No matching artist found", searched: true }, { status: 404 });
        }
      }
      artistId = bestMatch.id;
    }

    // Fetch artist data
    const artistRes = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers }
    );

    if (!artistRes.ok) {
      const err = await artistRes.text();
      console.error("Spotify artist error:", artistRes.status, err);
      return NextResponse.json({ error: "Failed to fetch artist" }, { status: artistRes.status });
    }

    const artist = await artistRes.json();

    // Try top tracks (may 403 in dev mode)
    let topTracks: any[] = [];
    try {
      const topTracksRes = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers }
      );
      if (topTracksRes.ok) {
        const topTracksData = await topTracksRes.json();
        topTracks = (topTracksData.tracks || []).slice(0, 5).map((t: any) => ({
          name: t.name,
          album: t.album?.name,
          albumArt: t.album?.images?.[0]?.url,
          previewUrl: t.preview_url,
          spotifyUrl: t.external_urls?.spotify,
        }));
      }
    } catch {
      // Top tracks unavailable, continue without them
    }

    // Scrape monthly listeners from Spotify's public page (not in API)
    let monthlyListeners: number | null = null;
    try {
      const pageRes = await fetch(`https://open.spotify.com/artist/${artistId}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      });
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const mlMatch = pageHtml.match(/content="[^"]*?([\d,.]+[MKB]?) monthly listeners/i);
        if (mlMatch) {
          const raw = mlMatch[1].replace(/,/g, "");
          if (raw.endsWith("M")) monthlyListeners = Math.round(parseFloat(raw) * 1_000_000);
          else if (raw.endsWith("K")) monthlyListeners = Math.round(parseFloat(raw) * 1_000);
          else if (raw.endsWith("B")) monthlyListeners = Math.round(parseFloat(raw) * 1_000_000_000);
          else monthlyListeners = parseInt(raw);
        }
      }
    } catch {
      // Monthly listeners scrape failed, continue without
    }

    return NextResponse.json({
      name: artist.name,
      genres: artist.genres || [],
      images: artist.images || [],
      popularity: artist.popularity || null,
      followers: artist.followers?.total || null,
      monthlyListeners,
      spotifyUrl: artist.external_urls?.spotify,
      topTracks,
    });
  } catch (error) {
    console.error("Spotify API error:", error);
    return NextResponse.json({ error: "Failed to fetch artist data" }, { status: 500 });
  }
}
