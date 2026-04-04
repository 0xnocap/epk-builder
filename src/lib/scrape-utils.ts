import * as cheerio from "cheerio";

export type Platform = "instagram" | "tiktok" | "spotify" | "linktree" | "unknown";

export function classifyUrl(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("spotify.com")) return "spotify";
  if (
    u.includes("linktr.ee") ||
    u.includes("linktree.com") ||
    u.includes("beacons.ai") ||
    u.includes("solo.to") ||
    u.includes("linkfire.com") ||
    u.includes("koji.to") ||
    u.includes("lnk.to")
  )
    return "linktree";
  return "unknown";
}

export function extractInstagramUsername(url: string): string | null {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
}

export function extractTikTokUsername(url: string): string | null {
  const match = url.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
}

export function extractSpotifyArtistId(url: string): string | null {
  const match = url.match(/spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Parse a Linktree-style page for all outbound links.
 * Handles Linktree (__NEXT_DATA__), Beacons, Solo.to, and generic link pages.
 */
export function extractLinktreeLinks(html: string): {
  links: string[];
  title: string;
  description: string;
} {
  const $ = cheerio.load(html);
  const links: string[] = [];
  let title = "";
  let description = "";

  // Try Linktree __NEXT_DATA__ first
  const nextDataScript = $("#__NEXT_DATA__").html();
  if (nextDataScript) {
    try {
      const data = JSON.parse(nextDataScript);
      const pageProps = data?.props?.pageProps;

      // Linktree stores links in various places depending on version
      if (pageProps?.links) {
        for (const link of pageProps.links) {
          if (link.url) links.push(link.url);
        }
      }
      if (pageProps?.account) {
        title = pageProps.account.pageTitle || pageProps.account.username || "";
        description = pageProps.account.description || "";
      }
      // Also check for Linktree's newer data structure
      if (pageProps?.userInfo?.links) {
        for (const link of pageProps.userInfo.links) {
          if (link.url) links.push(link.url);
        }
      }
    } catch {
      // JSON parse failed, fall through to HTML parsing
    }
  }

  // Fallback 1: Extract music URLs from raw HTML (catches Linkfire, music smart links, etc.)
  // Handles escaped slashes (\/), JSON-encoded URLs, and normal URLs
  if (links.length === 0) {
    const normalizedHtml = html.replace(/\\\//g, "/");
    const urlRegex = /https?:\/\/(?:open\.spotify\.com|music\.apple\.com|soundcloud\.com|music\.youtube\.com|www\.youtube\.com|www\.tiktok\.com)[^\s"'<>)]+/g;
    const rawMatches = normalizedHtml.match(urlRegex) || [];
    for (const match of rawMatches) {
      const cleaned = match.replace(/\\u0026/g, "&").replace(/[\\]+$/, "");
      if (!links.includes(cleaned)) links.push(cleaned);
    }
  }

  // Fallback 2: parse all anchor tags
  if (links.length === 0) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (
        href &&
        href.startsWith("http") &&
        !href.includes("linktree.com") &&
        !href.includes("beacons.ai") &&
        !href.includes("solo.to")
      ) {
        links.push(href);
      }
    });
  }

  if (!title) {
    title = $("title").text() || $('meta[property="og:title"]').attr("content") || "";
  }
  if (!description) {
    description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";
  }

  return { links: [...new Set(links)], title, description };
}

/**
 * Find Spotify artist URLs from a list of links.
 */
export function findSpotifyFromLinks(links: string[]): string | null {
  for (const link of links) {
    if (link.includes("spotify.com/artist/")) return link;
    // Handle Spotify short links or link.tospotify patterns
    if (link.includes("open.spotify.com")) return link;
  }
  return null;
}

/**
 * Find other music platform links.
 */
export function findMusicLinks(links: string[]): {
  spotify?: string;
  appleMusic?: string;
  soundcloud?: string;
  youtubeMusic?: string;
  youtube?: string;
} {
  const result: Record<string, string> = {};
  for (const link of links) {
    if (link.includes("spotify.com") && !result.spotify) result.spotify = link;
    if (link.includes("music.apple.com") && !result.appleMusic) result.appleMusic = link;
    if (link.includes("soundcloud.com") && !result.soundcloud) result.soundcloud = link;
    if (link.includes("music.youtube.com") && !result.youtubeMusic)
      result.youtubeMusic = link;
    if (
      link.includes("youtube.com") &&
      !link.includes("music.youtube") &&
      !result.youtube
    )
      result.youtube = link;
  }
  return result;
}

/**
 * Find social media links from a list.
 */
export function findSocialLinks(links: string[]): {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  facebook?: string;
} {
  const result: Record<string, string> = {};
  for (const link of links) {
    if (link.includes("instagram.com") && !result.instagram) result.instagram = link;
    if (link.includes("tiktok.com") && !result.tiktok) result.tiktok = link;
    if ((link.includes("twitter.com") || link.includes("x.com")) && !result.twitter)
      result.twitter = link;
    if (link.includes("facebook.com") && !result.facebook) result.facebook = link;
  }
  return result;
}
