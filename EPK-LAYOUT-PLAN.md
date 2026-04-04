# EPK Layout & Content Overhaul

## Context
The generated EPKs feel cookie-cutter, lack depth, and miss critical sections that industry professionals expect. We have data we're pulling but not displaying (top tracks, follower counts, genres). The layout needs to feel like a professional artist page, not a generic template.

Research from industry sources (Icon Collective, eapy.io, Hypebot, Aristake) shows that venue bookers, label reps, and press reviewers spend ~10 seconds deciding if an EPK is worth reading. The page needs strong visual hierarchy, social proof, and easy access to music.

## What Industry Pros Want (that we're missing)

1. **Social proof stats** - follower counts, stream counts, notable numbers. Currently we have IG followers and Spotify data but don't display them.
2. **Top tracks / latest release** - We fetch `topTracks` from Spotify but never render them. Industry needs to hear music without leaving the page.
3. **Press quotes / achievements** - No section for this at all. Even a placeholder "Notable" section would help.
4. **Video embeds** - YouTube links are scraped but never embedded. Live performance video is critical for venue booking.
5. **"For fans of" / comparable artists** - Helps industry quickly contextualize the sound.
6. **Downloadable press photos** - Gallery exists but no download option.
7. **Short bio + long bio** - We only have one bio field.

## What We HAVE But Don't Show

- `topTracks[]` - Spotify top tracks with album art, names, Spotify links (fetched, never rendered)
- `spotify.followers` - Follower count from Spotify (when API works)
- IG `followerCount` - From our scraper (5.4M for Olivia Dean)
- `socialLinks` YouTube - scraped but not embedded as video
- Multiple `genres[]` - stored as array, only first shown
- `musicLinks.youtube` - YouTube channel link, could embed videos

## New EPK Section Order

1. **Hero** (existing, keep 3 templates)
2. **Stats Bar** (NEW) - Horizontal row of key metrics: IG followers, Spotify monthly listeners, genre tags. Social proof at a glance.
3. **About** (enhanced) - Bio with press photo. Add "Sounds like" / genre tags. Show full bio text.
4. **Music** (NEW, replaces Listen+Stream) - Combined section: Spotify embed player + top tracks list with album art + streaming platform buttons. All music in one place.
5. **Video** (NEW) - If YouTube link exists, embed their channel or latest video. If not, skip section.
6. **Gallery** (existing, enhanced) - All images with object-top. Add subtle download hint on hover.
7. **Press** (NEW) - Placeholder section: "Notable achievements, press mentions, and milestones." User can fill in via editor. Shows placeholder text if empty prompting them to add quotes.
8. **Shows** (existing, keep)
9. **Connect** (existing, enhanced) - Social links WITH follower counts where available.
10. **Contact** (existing, keep)
11. **Footer** (existing, keep)

## Implementation Details

### Files to modify:
- `src/app/preview/page.tsx` - Main EPK output
- `src/app/epk/page.tsx` - Authenticated EPK (mirror changes)
- `src/context/EPKContext.tsx` - Add `pressQuotes`, `achievements` fields
- `src/components/EPKEditor.tsx` - Add Press/Achievements editing section
- `src/app/api/scrape/resolve/route.ts` - Pass through follower counts
- `src/app/build/page.tsx` - Store IG follower count in context

### NEW: Stats Bar Section
Horizontal row below hero. Shows 2-4 key stats in large text:
- Instagram followers (from scrape)
- Genre tags (multiple, as pills)
- Post count or other metrics
Styled as a glassmorphic bar, numbers in display font.

### NEW: Music Section (replaces Listen + Stream)
Combined section with:
- Spotify artist embed (existing, keep)
- **Top Tracks grid** - 3-5 tracks from `data.topTracks` with album art thumbnail, track name, album name. Each links to Spotify.
- Streaming platform buttons below (existing, keep)

### NEW: Video Section
- Check `data.musicLinks.youtubeMusic` or `data.socialLinks.youtube`
- If YouTube channel URL found, embed using `youtube.com/embed/@channelname`
- Actually: YouTube channel embeds don't work well. Better approach: use YouTube Data API to get latest video, OR just link to the channel with a styled card.
- Simplest: embed the YouTube channel URL as a link card with the YouTube icon. Not a video player (we don't have individual video IDs).

### NEW: Press Section
- Array field `pressQuotes: { quote: string, source: string }[]` in EPKContext
- Array field `achievements: string[]` in EPKContext
- If empty, show subtle placeholder: "Add press quotes and achievements in the editor"
- If populated, show quotes in styled blockquote cards + achievements as a list
- Editable via EPKEditor sidebar

### Enhanced About Section
- Show all genres as pills (not just first)
- Show IG follower count in the sidebar stats
- Keep existing layout but add richer metadata

### Enhanced Connect Section
- Show follower counts next to social links where available
- Format large numbers (5.4M, 120K, etc.)

### Data Flow Changes

**EPKContext new fields:**
```typescript
pressQuotes: { quote: string; source: string }[];
achievements: string[];
igFollowerCount: number | null;
```

**Build page:** Store `igFollowerCount` from resolve response.

**Resolve endpoint:** Already returns follower data in IG scrape, just needs to be passed through to the frontend context.

## Verification

1. Paste an IG link -> EPK generates with: Stats bar (followers, genres), top tracks (when Spotify works), gallery, social links with counts, shows
2. Press section shows placeholder prompting user to add quotes
3. Editor allows adding press quotes and achievements
4. All data from scraping pipeline is visible somewhere on the EPK
5. Layout feels comprehensive and professional, not cookie-cutter
