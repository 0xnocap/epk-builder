import { NextRequest } from "next/server";
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

  // TikTok followers
  const tiktokUrl = result.socialLinks?.tiktok;
  if (tiktokUrl) {
    const ttMatch = tiktokUrl.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
    if (ttMatch) {
      tasks.push(
        fetch(`${baseUrl}/api/scrape/tiktok?username=${encodeURIComponent(ttMatch[1])}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.followerCount) result.tiktokFollowerCount = d.followerCount;
          })
          .catch(() => {})
      );
    }
  }

  // Spotify monthly listeners (from page scrape in spotify route)
  const spotifyUrl = result.musicLinks?.spotify;
  if (spotifyUrl) {
    const spMatch = spotifyUrl.match(/artist\/([a-zA-Z0-9]+)/);
    if (spMatch) {
      tasks.push(
        fetch(`${baseUrl}/api/spotify?artistId=${spMatch[1]}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.monthlyListeners) result.spotifyMonthlyListeners = d.monthlyListeners;
            if (d.genres?.length && (!result.genres || result.genres.length === 0)) {
              result.genres = d.genres;
            }
          })
          .catch(() => {})
      );
    }
  }

  await Promise.all(tasks);
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
        result.artistName = username;
        result.scrapeAvailable = false;
      }
    }
    await Promise.all([enrichWithAppleMusic(result), enrichWithPlatformStats(result, baseUrl)]);
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
    await Promise.all([enrichWithAppleMusic(result), enrichWithPlatformStats(result, baseUrl)]);
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
    await Promise.all([enrichWithAppleMusic(result), enrichWithPlatformStats(result, baseUrl)]);
    return Response.json(result);
  }

  // Unknown URL - return empty result for manual mode
  return Response.json(result);
}
