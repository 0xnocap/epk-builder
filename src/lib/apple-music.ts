/**
 * Apple Music API - free access via public web token extraction.
 * No developer account needed. Token is extracted from Apple's public web player JS.
 * Note: This is unofficial and could break if Apple changes their JS structure.
 */

let cachedToken: { token: string; expires: number } | null = null;

async function getAppleMusicToken(): Promise<string> {
  // Return cached token if still valid (refresh every 30 min)
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  // Fetch Apple Music web player page to find JS file
  const mainPage = await fetch("https://beta.music.apple.com", {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
  });
  const html = await mainPage.text();

  // Find the legacy JS file containing the token
  const jsMatch = html.match(/\/assets\/index-legacy[^"]*\.js/);
  if (!jsMatch) throw new Error("Could not find Apple Music JS file");

  const jsRes = await fetch(`https://beta.music.apple.com${jsMatch[0]}`);
  const js = await jsRes.text();

  // Extract the JWT token
  const tokenMatch = js.match(/eyJh[^"]*/);
  if (!tokenMatch) throw new Error("Could not extract Apple Music token");

  cachedToken = {
    token: tokenMatch[0],
    expires: Date.now() + 30 * 60 * 1000, // 30 min cache
  };

  return cachedToken.token;
}

const AM_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Origin: "https://music.apple.com",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
});

export interface AppleMusicArtist {
  id: string;
  name: string;
  genres: string[];
  bio: string;
  artworkUrl: string | null;
  url: string;
  topSongs: { name: string; albumName: string; artworkUrl: string | null; url: string }[];
  albums: { name: string; genres: string[]; artworkUrl: string | null; url: string }[];
}

/**
 * Search for an artist by name and return full profile with top songs and albums.
 */
export async function searchArtist(artistName: string): Promise<AppleMusicArtist | null> {
  try {
    const token = await getAppleMusicToken();
    const headers = AM_HEADERS(token);

    // Search for artist
    const searchRes = await fetch(
      `https://amp-api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(artistName)}&types=artists&limit=1`,
      { headers }
    );
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const artists = searchData?.results?.artists?.data;
    if (!artists?.length) return null;

    const artistId = artists[0].id;

    // Get full artist data with relationships
    const artistRes = await fetch(
      `https://amp-api.music.apple.com/v1/catalog/us/artists/${artistId}?include=top-songs,albums&extend=artistBio,editorialNotes&views=top-songs`,
      { headers }
    );
    if (!artistRes.ok) return null;

    const artistData = await artistRes.json();
    const data = artistData?.data?.[0];
    if (!data) return null;

    const attrs = data.attributes || {};
    const rels = data.relationships || {};
    const views = data.views || {};

    // Parse artwork URL (Apple uses template URLs with {w}x{h})
    const parseArtwork = (artwork: any): string | null => {
      if (!artwork?.url) return null;
      return artwork.url.replace("{w}", "640").replace("{h}", "640");
    };

    // Top songs from views (preferred) or relationships
    const topSongsData = views["top-songs"]?.data || rels["top-songs"]?.data || [];
    const topSongs = topSongsData.slice(0, 10).map((song: any) => ({
      name: song.attributes?.name || "",
      albumName: song.attributes?.albumName || "",
      artworkUrl: parseArtwork(song.attributes?.artwork),
      url: song.attributes?.url || "",
    }));

    // Albums
    const albumsData = rels.albums?.data || [];
    const albums = albumsData.slice(0, 10).map((album: any) => ({
      name: album.attributes?.name || "",
      genres: album.attributes?.genreNames || [],
      artworkUrl: parseArtwork(album.attributes?.artwork),
      url: album.attributes?.url || "",
    }));

    return {
      id: artistId,
      name: attrs.name || artistName,
      genres: attrs.genreNames || [],
      bio: attrs.artistBio || attrs.editorialNotes?.standard || "",
      artworkUrl: parseArtwork(attrs.artwork),
      url: attrs.url || "",
      topSongs,
      albums,
    };
  } catch (err) {
    console.error("Apple Music search failed:", err);
    return null;
  }
}
