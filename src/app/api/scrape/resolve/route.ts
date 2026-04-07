import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy-fetch";
import {
  classifyUrl,
  extractInstagramUsername,
  extractTikTokUsername,
  extractSpotifyArtistId,
  findSpotifyFromLinks,
  findMusicLinks,
  findSocialLinks,
} from "@/lib/scrape-utils";
import { searchArtist as searchAppleMusic } from "@/lib/apple-music";

interface ResolveResult {
  source: "instagram" | "tiktok" | "spotify" | "manual";
  artistName: string;
  bio: string;
  profileImage: string;
  images: string[];
  genres: string[];
  location: string;
  spotify: {
    found: boolean;
    artistId?: string;
    url?: string;
    topTracks?: {
      name: string;
      album: string;
      albumArt: string;
      spotifyUrl: string;
      previewUrl?: string;
    }[];
    images?: string[];
    followers?: number;
    genres?: string[];
  } | null;
  musicLinks: Record<string, string>;
  socialLinks: Record<string, string>;
  scrapeAvailable: boolean;
  igFollowerCount: number | null;
  tiktokFollowerCount: number | null;
  spotifyMonthlyListeners: number | null;
  appleMusic: {
    found: boolean;
    bio?: string;
    genres?: string[];
    artworkUrl?: string;
    url?: string;
    topSongs?: { name: string; albumName: string; artworkUrl: string | null; url: string }[];
    albums?: { name: string; genres: string[]; artworkUrl: string | null; url: string }[];
  } | null;
}

async function fetchSpotifyData(artistId: string, baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/api/spotify?artistId=${artistId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function scrapeLinktree(url: string, baseUrl: string) {
  try {
    const res = await fetch(
      `${baseUrl}/api/scrape/linktree?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function scrapeInstagram(username: string, baseUrl: string) {
  try {
    const res = await fetch(
      `${baseUrl}/api/scrape/instagram?username=${encodeURIComponent(username)}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function scrapeTikTok(username: string, baseUrl: string) {
  try {
    const res = await fetch(
      `${baseUrl}/api/scrape/tiktok?username=${encodeURIComponent(username)}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function enrichWithPlatformStats(result: ResolveResult, baseUrl: string): Promise<void> {
  const tasks: Promise<void>[] = [];

  // TikTok followers - try from socialLinks or guess from artist/IG username
  let tiktokUsername: string | null = null;
  const tiktokUrl = result.socialLinks?.tiktok;
  if (tiktokUrl) {
    const ttMatch = tiktokUrl.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
    if (ttMatch) tiktokUsername = ttMatch[1];
  }
  // If no TikTok URL found, try IG username and common variants
  if (!tiktokUsername && result.source === "instagram") {
    const igUrl = result.socialLinks?.instagram || "";
    const igMatch = igUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (igMatch) {
      // Try multiple variants: exact, with underscore, without trailing chars
      const base = igMatch[1];
      const variants = [base, `${base}_`, base.replace(/[_.\d]+$/, "")].filter((v, i, a) => a.indexOf(v) === i);
      for (const variant of variants) {
        tasks.push(
          fetch(`${baseUrl}/api/scrape/tiktok?username=${encodeURIComponent(variant)}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.followerCount && !result.tiktokFollowerCount) {
                result.tiktokFollowerCount = d.followerCount;
                result.socialLinks.tiktok = `https://www.tiktok.com/@${variant}`;
              }
            })
            .catch(() => {})
        );
      }
    }
  } else if (tiktokUsername) {
    tasks.push(
      fetch(`${baseUrl}/api/scrape/tiktok?username=${encodeURIComponent(tiktokUsername)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.followerCount) {
            result.tiktokFollowerCount = d.followerCount;
            if (!result.socialLinks.tiktok) {
              result.socialLinks.tiktok = `https://www.tiktok.com/@${tiktokUsername}`;
            }
          }
        })
        .catch(() => {})
    );
  }

  // Spotify monthly listeners - scrape directly from public page (no API needed)
  const spotifyUrl = result.musicLinks?.spotify;
  if (spotifyUrl) {
    const spMatch = spotifyUrl.match(/artist\/([a-zA-Z0-9]+)/);
    if (spMatch) {
      tasks.push(
        proxyFetch(`https://open.spotify.com/artist/${spMatch[1]}`, { render: true })
          .then((r) => r.text())
          .then((html) => {
            // Try rendered page text format: "61,903,926 monthly listener"
            const fullMatch = html.match(/([\d,]+)\s*monthly listener/i);
            if (fullMatch) {
              result.spotifyMonthlyListeners = parseInt(fullMatch[1].replace(/,/g, ""));
              return;
            }
            // Fallback: meta tag format "61.9M monthly listeners"
            const metaMatch = html.match(/content="[^"]*?([\d,.]+[MKB]?) monthly listeners/i);
            if (metaMatch) {
              const raw = metaMatch[1].replace(/,/g, "");
              if (raw.endsWith("M")) result.spotifyMonthlyListeners = Math.round(parseFloat(raw) * 1_000_000);
              else if (raw.endsWith("K")) result.spotifyMonthlyListeners = Math.round(parseFloat(raw) * 1_000);
              else result.spotifyMonthlyListeners = parseInt(raw);
            }
          })
          .catch(() => {})
      );
    }
  }

  await Promise.all(tasks);
}

async function searchSpotifyByName(artistName: string, baseUrl: string): Promise<any | null> {
  try {
    const res = await fetch(`${baseUrl}/api/spotify?name=${encodeURIComponent(artistName)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function enrichWithSpotify(result: ResolveResult, baseUrl: string): Promise<void> {
  // Skip if we already have Spotify data
  if (result.spotify?.found || result.musicLinks.spotify) return;
  if (!result.artistName) return;

  try {
    const spotifyData = await searchSpotifyByName(result.artistName, baseUrl);
    if (spotifyData?.name) {
      const artistId = spotifyData.spotifyUrl?.match(/artist\/([a-zA-Z0-9]+)/)?.[1];
      result.spotify = {
        found: true,
        artistId,
        url: spotifyData.spotifyUrl,
        topTracks: (spotifyData.topTracks || []).map((t: any) => ({
          name: t.name,
          album: t.album,
          albumArt: t.albumArt,
          spotifyUrl: t.spotifyUrl,
          previewUrl: t.previewUrl,
        })),
        images: (spotifyData.images || []).map((img: { url: string }) => img.url),
        followers: spotifyData.followers,
        genres: spotifyData.genres,
      };
      if (spotifyData.spotifyUrl) {
        result.musicLinks.spotify = spotifyData.spotifyUrl;
      }
      // Fill genres from Spotify if we don't have any
      if ((!result.genres || result.genres.length === 0) && spotifyData.genres?.length) {
        result.genres = spotifyData.genres;
      }
      // Add Spotify images if we're light on images
      if (result.images.length < 2 && spotifyData.images?.length) {
        result.images.push(...spotifyData.images.map((img: { url: string }) => img.url));
      }
      // Monthly listeners from the search result
      if (spotifyData.monthlyListeners && !result.spotifyMonthlyListeners) {
        result.spotifyMonthlyListeners = spotifyData.monthlyListeners;
      }
    }
  } catch (err) {
    console.error("Spotify name search failed:", err);
  }
}

async function enrichWithAppleMusic(result: ResolveResult): Promise<void> {
  if (!result.artistName) return;
  try {
    const am = await searchAppleMusic(result.artistName);
    if (am) {
      result.appleMusic = {
        found: true,
        bio: am.bio,
        genres: am.genres,
        artworkUrl: am.artworkUrl || undefined,
        url: am.url,
        topSongs: am.topSongs,
        albums: am.albums,
      };
      // Use Apple Music name if current name looks like a handle (no spaces)
      if (am.name && !result.artistName.includes(" ")) {
        result.artistName = am.name;
      }
      // Use Apple Music data to fill gaps
      if (!result.genres || result.genres.length === 0) {
        // Collect genres from artist + albums
        const allGenres = [...(am.genres || [])];
        for (const album of am.albums.slice(0, 5)) {
          for (const g of album.genres) {
            if (g !== "Music" && !allGenres.includes(g)) allGenres.push(g);
          }
        }
        result.genres = allGenres.slice(0, 4);
      }
      // Use Apple bio if we don't have a good one
      if ((!result.bio || result.bio.length < 50) && am.bio) {
        result.bio = am.bio;
      }
      // Add Apple Music artwork to images
      if (am.artworkUrl) {
        result.images.push(am.artworkUrl);
      }
      // Set Apple Music link
      if (am.url) {
        result.musicLinks.appleMusic = am.url;
      }
    }
  } catch (err) {
    console.error("Apple Music enrichment failed:", err);
  }
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();
  if (!url) {
    return Response.json({ error: "url required" }, { status: 400 });
  }

  const baseUrl = request.nextUrl.origin;
  const platform = classifyUrl(url);

  const result: ResolveResult = {
    source: "manual",
    artistName: "",
    bio: "",
    profileImage: "",
    images: [],
    genres: [],
    location: "",
    spotify: null,
    musicLinks: {},
    socialLinks: {},
    scrapeAvailable: false,
    igFollowerCount: null,
    tiktokFollowerCount: null,
    spotifyMonthlyListeners: null,
    appleMusic: null,
  };

  // Direct Spotify URL - fastest path
  if (platform === "spotify") {
    const artistId = extractSpotifyArtistId(url);
    if (artistId) {
      const spotifyData = await fetchSpotifyData(artistId, baseUrl);
      if (spotifyData?.name) {
        result.source = "spotify";
        result.artistName = spotifyData.name;
        result.genres = spotifyData.genres || [];
        result.images = (spotifyData.images || []).map((img: { url: string }) => img.url);
        result.profileImage = result.images[0] || "";
        result.spotify = {
          found: true,
          artistId,
          url: spotifyData.spotifyUrl,
          topTracks: (spotifyData.topTracks || []).map((t: any) => ({
            name: t.name,
            album: t.album,
            albumArt: t.albumArt,
            spotifyUrl: t.spotifyUrl,
            previewUrl: t.previewUrl,
          })),
          images: result.images,
          followers: spotifyData.followers,
          genres: spotifyData.genres,
        };
        result.musicLinks = {
          spotify: spotifyData.spotifyUrl,
          appleMusic: `https://music.apple.com/us/search?term=${encodeURIComponent(spotifyData.name)}`,
          soundcloud: `https://soundcloud.com/search?q=${encodeURIComponent(spotifyData.name)}`,
          youtubeMusic: `https://music.youtube.com/search?q=${encodeURIComponent(spotifyData.name)}`,
        };
        result.scrapeAvailable = true;
      }
    }
    await Promise.all([enrichWithAppleMusic(result), enrichWithPlatformStats(result, baseUrl)]);
    return Response.json(result);
  }

  // Instagram URL
  if (platform === "instagram") {
    const username = extractInstagramUsername(url);
    if (username) {
      result.source = "instagram";
      result.socialLinks.instagram = url;

      const igData = await scrapeInstagram(username, baseUrl);
      if (igData?.available) {
        result.scrapeAvailable = true;
        result.artistName = igData.fullName || username;
        result.bio = igData.bio || "";
        result.igFollowerCount = typeof igData.followerCount === "number" ? igData.followerCount : null;
        result.profileImage = igData.profilePicUrl || "";
        result.images = igData.images || [
          ...(igData.profilePicUrl ? [igData.profilePicUrl] : []),
          ...(igData.recentPostImages || []),
        ];

        // Follow bio link to find Spotify and music links
        if (igData.externalUrl) {
          const bioLinkPlatform = classifyUrl(igData.externalUrl);

          if (bioLinkPlatform === "spotify") {
            // Direct Spotify link in bio
            const artistId = extractSpotifyArtistId(igData.externalUrl);
            if (artistId) {
              const spotifyData = await fetchSpotifyData(artistId, baseUrl);
              if (spotifyData?.name) {
                result.genres = spotifyData.genres || [];
                result.musicLinks.spotify = spotifyData.spotifyUrl;
                result.spotify = {
                  found: true,
                  artistId,
                  url: spotifyData.spotifyUrl,
                  topTracks: (spotifyData.topTracks || []).map((t: any) => ({
                    name: t.name, album: t.album, albumArt: t.albumArt,
                    spotifyUrl: t.spotifyUrl, previewUrl: t.previewUrl,
                  })),
                  images: (spotifyData.images || []).map((img: { url: string }) => img.url),
                  followers: spotifyData.followers,
                  genres: spotifyData.genres,
                };
              }
            }
          } else {
            // Linktree or other bio link page - scrape for music links
            const linkData = await scrapeLinktree(igData.externalUrl, baseUrl);
            if (linkData?.links?.length) {
              const musicLinksFound = findMusicLinks(linkData.links);
              const socialLinksFound = findSocialLinks(linkData.links);
              result.musicLinks = { ...result.musicLinks, ...musicLinksFound };
              result.socialLinks = { ...result.socialLinks, ...socialLinksFound };

              // Find and fetch Spotify
              const spotifyUrl = findSpotifyFromLinks(linkData.links);
              if (spotifyUrl) {
                const artistId = extractSpotifyArtistId(spotifyUrl);
                if (artistId) {
                  const spotifyData = await fetchSpotifyData(artistId, baseUrl);
                  if (spotifyData?.name) {
                    result.genres = spotifyData.genres || [];
                    result.musicLinks.spotify = spotifyData.spotifyUrl;
                    result.spotify = {
                      found: true,
                      artistId,
                      url: spotifyData.spotifyUrl,
                      topTracks: (spotifyData.topTracks || []).map((t: any) => ({
                        name: t.name, album: t.album, albumArt: t.albumArt,
                        spotifyUrl: t.spotifyUrl, previewUrl: t.previewUrl,
                      })),
                      images: (spotifyData.images || []).map((img: { url: string }) => img.url),
                      followers: spotifyData.followers,
                      genres: spotifyData.genres,
                    };
                  }
                }
              }
            }
          }
        }
      } else {
        // IG scraper failed (blocked IP) - use other sources
        result.artistName = username;
        result.scrapeAvailable = false;

        // Try common link-in-bio URLs to find music/social links
        // Try both the IG username and common variations
        const cleanName = username.replace(/[_.\d]+$/, ""); // "oliviadeano" -> "oliviadeano", or strip trailing _ digits
        const bioLinkAttempts = [
          `https://linktr.ee/${username}`,
          `https://linktr.ee/${cleanName}`,
          `https://${username}.lnk.to/all`,
          `https://${cleanName}.lnk.to/all`,
        ];
        for (const bioUrl of bioLinkAttempts) {
          try {
            const linkData = await scrapeLinktree(bioUrl, baseUrl);
            if (linkData?.links?.length > 0) {
              const musicLinksFound = findMusicLinks(linkData.links);
              const socialLinksFound = findSocialLinks(linkData.links);
              result.musicLinks = { ...result.musicLinks, ...musicLinksFound };
              result.socialLinks = { ...result.socialLinks, ...socialLinksFound };
              const spotifyUrl = findSpotifyFromLinks(linkData.links);
              if (spotifyUrl) result.musicLinks.spotify = spotifyUrl;
              break;
            }
          } catch { /* try next */ }
        }
      }
    }

    // First enrich with Apple Music to get the real artist name
    await enrichWithAppleMusic(result);

    // If no Spotify found from links, search Spotify by artist name
    await enrichWithSpotify(result, baseUrl);

    // After Apple Music gives us the real name, try bio link scrape with name-based URLs
    if (result.artistName && Object.keys(result.musicLinks).length <= 1) {
      const nameSlug = result.artistName.toLowerCase().replace(/\s+/g, "");
      const nameSlugDash = result.artistName.toLowerCase().replace(/\s+/g, "-");
      const nameAttempts = [
        `https://${nameSlug}.lnk.to/all`,
        `https://linktr.ee/${nameSlug}`,
        `https://${nameSlugDash}.lnk.to/all`,
      ];
      for (const bioUrl of nameAttempts) {
        try {
          const linkData = await scrapeLinktree(bioUrl, baseUrl);
          if (linkData?.links?.length > 0) {
            const musicLinksFound = findMusicLinks(linkData.links);
            const socialLinksFound = findSocialLinks(linkData.links);
            result.musicLinks = { ...result.musicLinks, ...musicLinksFound };
            result.socialLinks = { ...result.socialLinks, ...socialLinksFound };
            const spotifyUrl = findSpotifyFromLinks(linkData.links);
            if (spotifyUrl) result.musicLinks.spotify = spotifyUrl;
            break;
          }
        } catch { /* try next */ }
      }
    }

    // Now enrich with platform stats (needs socialLinks/musicLinks populated first)
    await enrichWithPlatformStats(result, baseUrl);

    // Ensure Apple Music link is set
    if (result.appleMusic?.found && result.appleMusic.url && !result.musicLinks.appleMusic) {
      result.musicLinks.appleMusic = result.appleMusic.url;
    }

    return Response.json(result);
  }

  // TikTok URL
  if (platform === "tiktok") {
    const username = extractTikTokUsername(url);
    if (username) {
      result.source = "tiktok";
      result.socialLinks.tiktok = url;

      const ttData = await scrapeTikTok(username, baseUrl);
      if (ttData?.available) {
        result.scrapeAvailable = true;
        result.artistName = ttData.displayName || username;
        result.bio = ttData.bio || "";
        result.profileImage = ttData.profilePicUrl || "";
        result.images = [
          ...(ttData.profilePicUrl ? [ttData.profilePicUrl] : []),
          ...(ttData.recentVideoThumbnails || []),
        ];

        // Follow bio link
        if (ttData.externalUrl) {
          const bioLinkPlatform = classifyUrl(ttData.externalUrl);
          if (bioLinkPlatform === "spotify") {
            const artistId = extractSpotifyArtistId(ttData.externalUrl);
            if (artistId) {
              const spotifyData = await fetchSpotifyData(artistId, baseUrl);
              if (spotifyData?.name) {
                result.genres = spotifyData.genres || [];
                result.spotify = {
                  found: true,
                  artistId,
                  url: spotifyData.spotifyUrl,
                  topTracks: (spotifyData.topTracks || []).map((t: any) => ({
                    name: t.name,
                    album: t.album,
                    albumArt: t.albumArt,
                    spotifyUrl: t.spotifyUrl,
                    previewUrl: t.previewUrl,
                  })),
                  images: (spotifyData.images || []).map((img: { url: string }) => img.url),
                  followers: spotifyData.followers,
                  genres: spotifyData.genres,
                };
                result.images = [...result.images, ...result.spotify.images!];
              }
            }
          } else {
            const linkData = await scrapeLinktree(ttData.externalUrl, baseUrl);
            if (linkData?.links?.length) {
              const musicLinks = findMusicLinks(linkData.links);
              const socialLinksFound = findSocialLinks(linkData.links);
              result.musicLinks = { ...result.musicLinks, ...musicLinks };
              result.socialLinks = { ...result.socialLinks, ...socialLinksFound };

              const spotifyUrl = findSpotifyFromLinks(linkData.links);
              if (spotifyUrl) {
                const artistId = extractSpotifyArtistId(spotifyUrl);
                if (artistId) {
                  const spotifyData = await fetchSpotifyData(artistId, baseUrl);
                  if (spotifyData?.name) {
                    result.genres = spotifyData.genres || [];
                    result.spotify = {
                      found: true,
                      artistId,
                      url: spotifyData.spotifyUrl,
                      topTracks: (spotifyData.topTracks || []).map((t: any) => ({
                        name: t.name,
                        album: t.album,
                        albumArt: t.albumArt,
                        spotifyUrl: t.spotifyUrl,
                        previewUrl: t.previewUrl,
                      })),
                      images: (spotifyData.images || []).map(
                        (img: { url: string }) => img.url
                      ),
                      followers: spotifyData.followers,
                      genres: spotifyData.genres,
                    };
                    result.images = [...result.images, ...result.spotify.images!];
                  }
                }
              }
            }
          }
        }
      } else {
        result.artistName = username;
        result.scrapeAvailable = false;
      }
    }
    await enrichWithAppleMusic(result);
    await enrichWithSpotify(result, baseUrl);
    await enrichWithPlatformStats(result, baseUrl);
    return Response.json(result);
  }

  // Linktree / bio link page directly
  if (platform === "linktree") {
    const linkData = await scrapeLinktree(url, baseUrl);
    if (linkData) {
      result.artistName = linkData.title || "";
      result.bio = linkData.description || "";
      const musicLinks = findMusicLinks(linkData.links || []);
      const socialLinksFound = findSocialLinks(linkData.links || []);
      result.musicLinks = musicLinks;
      result.socialLinks = socialLinksFound;

      const spotifyUrl = findSpotifyFromLinks(linkData.links || []);
      if (spotifyUrl) {
        const artistId = extractSpotifyArtistId(spotifyUrl);
        if (artistId) {
          result.source = "spotify";
          const spotifyData = await fetchSpotifyData(artistId, baseUrl);
          if (spotifyData?.name) {
            result.artistName = spotifyData.name;
            result.genres = spotifyData.genres || [];
            result.images = (spotifyData.images || []).map(
              (img: { url: string }) => img.url
            );
            result.profileImage = result.images[0] || "";
            result.spotify = {
              found: true,
              artistId,
              url: spotifyData.spotifyUrl,
              topTracks: (spotifyData.topTracks || []).map((t: any) => ({
                name: t.name,
                album: t.album,
                albumArt: t.albumArt,
                spotifyUrl: t.spotifyUrl,
                previewUrl: t.previewUrl,
              })),
              images: result.images,
              followers: spotifyData.followers,
              genres: spotifyData.genres,
            };
            result.scrapeAvailable = true;
          }
        }
      }
    }
    await enrichWithAppleMusic(result);
    await enrichWithSpotify(result, baseUrl);
    await enrichWithPlatformStats(result, baseUrl);
    return Response.json(result);
  }

  // Unknown URL - return empty result for manual mode
  return Response.json(result);
}
