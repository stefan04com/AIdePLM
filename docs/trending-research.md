# What makes a post trend: research and data plan

Researched 2026-11-07 (Andu). Purpose: know **what makes a post spread** on each platform, and
**which data Moment has to fetch** to tell a user how to post (when, with which hashtags and in which
format) so the post has the best chance to trend.

Every claim has a confidence tag. Build recommendations on **[official]** and **[consistent]** claims;
treat **[single]** claims as hypotheses to test.

| Tag | Meaning |
|---|---|
| **[official]** | The platform said it (docs, newsroom, open-source code, an executive on the record) |
| **[consistent]** | Many independent industry sources agree, but the platform hasn't published it |
| **[single]** | One source or a vendor claim; numbers here are guesses until we measure them |

---

## 1. Rules that hold on every platform

These show up on every platform, so they are the backbone of any recommendation.

1. **Attention beats approval.** Every feed now ranks mostly on *predicted watch time and completion*
   and on *shares / sends*, not on likes. Likes are the weakest signal almost everywhere.
   [official for Instagram and X; consistent for TikTok, YouTube Shorts and LinkedIn]
2. **The first seconds decide.** Short video is shown to a small test audience first; if they keep
   watching, distribution widens; if they swipe away, it stops. The hook has to work in 1-3 seconds.
   [consistent]
3. **The first hour decides.** Early engagement (roughly the first 30-90 minutes) gates the next
   wave of distribution, so post when *your* audience is online and be there to reply. [consistent]
4. **Shares and sends are the strongest "spread" signal.** A send to a friend means "show this to
   people who don't follow me". [official for Instagram: sends per reach]
5. **Original beats reposted.** Instagram cuts recommendations for accounts that mostly repost; TikTok
   reportedly deprioritises other platforms' watermarks; YouTube reportedly favours originals.
   [official for Instagram, April 2026; single for the others]
6. **Search is a discovery channel.** Keywords in the caption, on-screen text and spoken audio are now
   read for search and recommendations, so hashtags matter less than clear keywords. [consistent]
7. **Catch the trend early.** A trend is worth most in its first 24-48 hours; after that the format is
   saturated. [consistent; the exact window is a guess]
8. **Conversation counts, low-effort engagement doesn't.** Real replies rank; "nice!" or emoji-only
   replies, engagement bait and pods are discounted or penalised. [official for X reply scoring;
   consistent for LinkedIn]
9. **Links out of the platform hurt reach** on LinkedIn and Facebook (and reportedly X). Put the link
   in a comment or reply instead. [consistent]
10. **Posting time is personal.** Industry "best times" are averages over millions of accounts. The
    account's own "when my followers are online" data always wins over the averages below. [consistent]

---

## 2. Platform by platform

### Instagram (Reels, Feed, Explore)

| Topic | What we know |
|---|---|
| Main signals | **Watch time, likes per reach, sends per reach** are the three most important signals across surfaces (Adam Mosseri, January 2025). Likes weigh a bit more for followers, sends a bit more for reaching non-followers. [official] |
| Surfaces | Feed, Reels, Stories and Explore each have their own ranking model, so the same post can do well on one and not the other. [official] |
| Originality | Since **April 2026**, accounts that mostly post unoriginal photos, carousels or Reels lose recommendations to non-followers (reach limited to followers). Remixing or adding your own take is the stated fix. [official, reported by TechCrunch / PetaPixel] |
| Trial Reels | Shows a Reel to non-followers first to test it. Available to public accounts with 1,000+ followers since 2025; Meta reports more non-follower reach for most creators who used it. [official claim] |
| Hashtags | **Up to 5 hashtags per post or Reel** (announced December 2025; caption and comments together). A few outdated pages still say 30, so check in the app. Hashtags help categorise, they don't create reach on their own. [consistent] |
| Best times | Weekdays late morning to early afternoon in the audience's local time (Sprout Social / Buffer 2026). [consistent, verify per account] |

### TikTok

| Topic | What we know |
|---|---|
| Main signals | User interactions (likes, shares, comments, follows, **watching to the end**), video information (captions, sounds, hashtags), and device and account settings, which weigh least. [official, TikTok newsroom] |
| Completion and rewatches | Completion rate is reported as the strongest single signal; rewatches and shares count more than likes. Commonly quoted targets ("70%+ completion") are not confirmed by TikTok. [consistent / single for numbers] |
| Diversity rules | TikTok avoids two videos in a row from the same creator or with the same sound, and skips duplicates and already-seen content. [official] |
| Search | TikTok works as a search engine for younger users: keywords in the caption, on-screen text and speech (it transcribes audio) help discovery. [consistent] |
| Sounds | Trending sounds help most when used early (first ~24 h of the trend); original audio is also rewarded. [single] |
| Penalties | Watermarks from other apps, re-uploads, "not interested" taps. [official for "not interested"; single for watermarks] |
| Best times | Evenings (about 18:00-23:00) and weekends are strongest (Buffer 2026). Consistency matters more than the exact minute. [consistent] |

### X (Twitter)

| Topic | What we know |
|---|---|
| How it ranks | The "For You" ranker (open-sourced on GitHub, January 2026, `xai-org/x-algorithm`) uses a Grok-based model to **predict engagement**: likes, replies, reposts, clicks, follows. [official, open-source] |
| Strongest signals | Predicted reposts, replies the author engages with, and "follow from this post". An analyst's reading of the code gives rough weights of like 1x, bookmark 10x, link click 11x, profile click 12x, reply 13.5x, repost 20x. [single for the exact weights] |
| Reply quality | Replies are scored for quality; emoji-only or "this" replies count for almost nothing. [official, in the code] |
| Hashtags | One or two relevant hashtags at most; more looks like spam. [consistent] |
| Best times | Weekday mornings, about 08:00-11:00 (Buffer 2026). [consistent] |
| Caveat | X updates the open-source code often, so re-read it before relying on any weight. |

### YouTube Shorts

| Topic | What we know |
|---|---|
| How it ranks | A new Short goes to a small seed audience; **viewed vs. swiped away** (shown in YouTube Studio) decides if it is pushed further. Completion, replays and engagement follow. [consistent; the metric itself is official] |
| Hook | The swipe decision happens in the first 1-3 seconds. [consistent] |
| Separate systems | Shorts and long-form recommendations are reported to be separate, so Shorts don't hurt a channel's long videos. [single] |
| Originality | Re-uploads are reported to get less reach. [single] |
| Best times | Evenings and weekends are strong for video platforms (Buffer 2026). [consistent] |

### LinkedIn

| Topic | What we know |
|---|---|
| Main signals | **Dwell time** (how long people stop on the post) and **substantive comments** in the first hour or two decide whether a post leaves its first test group. LinkedIn Engineering has written about a "long dwell" model. [official for dwell time; consistent for the rest] |
| Comments | Long, real comments help far more than reactions; pods and bait are penalised. [consistent] |
| Links | External links in the post body reduce reach; put them in the first comment. [consistent] |
| Hashtags | Three to five specific ones are plenty. [consistent] |
| Best times | Weekdays, mid-afternoon (about 15:00-18:00), Wednesday and Thursday strongest (Buffer 2026). [consistent] |

### Threads and Facebook

| Topic | What we know |
|---|---|
| Threads | Replies and reposts drive distribution to non-followers; conversation-starting posts do best. [consistent] |
| Facebook | Reels are the main way to reach non-followers; Meta introduced a "true interest" survey model for Reels recommendations in January 2026. External links are reported to be suppressed; Groups are treated as high-trust spaces. [single for most points] |
| Best times (Facebook) | Tuesdays and Wednesdays, about 12:00-20:00; weekends weakest (Sprout Social 2026). [consistent] |

---

## 3. Quick tables

### Hashtags

| Platform | How many | How to pick them |
|---|---|---|
| Instagram | Up to **5** (hard limit since Dec 2025) | 1 broad topic + 2-3 niche/community + 1 branded |
| TikTok | 3-5 | Mix of trend hashtag + niche; keywords in caption, text and speech matter more |
| X | 1-2 | Only the trend's own hashtag, if there is one |
| LinkedIn | 3-5 | Specific professional topics, not generic ones |
| YouTube Shorts | 1-3 | Topic keywords; the title matters more |
| Threads / Facebook | 0-3 | Topic tags; low impact |

### Posting windows (local time of the audience, industry averages)

| Platform | Window | Source |
|---|---|---|
| Instagram | Weekdays, late morning to early afternoon | Sprout Social / Buffer 2026 |
| TikTok | 18:00-23:00, plus weekends | Buffer 2026 |
| X | Weekdays 08:00-11:00 | Buffer 2026 |
| LinkedIn | Weekdays 15:00-18:00, best Wed-Thu | Buffer 2026 |
| Facebook | Tue-Wed 12:00-20:00 | Sprout Social 2026 |
| YouTube Shorts | Evenings and weekends | Buffer 2026 |
| All platforms (general) | Tue-Wed, 11:00-18:00 | Sprout Social 2026 (≈2 billion engagements) |

These are a **fallback** only. With account data (section 4), use the hours when the account's own
followers are online.

---

## 4. What Moment should fetch

What each recommendation needs, where to get it and what it costs. Prefer official APIs; scrapers
can break and may break a platform's terms.

### 4.1 Trend signals (what is rising now)

| Data | Why | Source | Access / limits |
|---|---|---|---|
| Trending topics by country | Find trends while they are early | **X API** `GET /2/trends/by/woeid/{woeid}` | Pay-per-use credits (basic tiers retired in 2026); returns the current list only, no history |
| Search interest over time | Is a topic rising or fading? Compare candidate trends | **Google Trends API** (official) | Alpha since July 2025, access by application; 5 years of consistently scaled data. Until approved, use the Trends website |
| Popular videos per country | What video topics are hot | **YouTube Data API** `videos.list?chart=mostPopular&regionCode=RO` | Free quota. Since July 2025 it returns music, movies and gaming charts (the Trending page was retired) |
| Trending hashtags, sounds, creators on TikTok | Sound and hashtag choice | **TikTok Creative Center** (website) | No public API. The Discovery API is partner-only (e.g. via Meltwater). Scrapers exist but are fragile and may break the terms |
| Hashtag activity on Instagram | Is a hashtag active? What do its top posts look like? | **Instagram Graph API** hashtag search (`top_media`, `recent_media`) | Business/creator account + App Review; **30 unique hashtags per rolling 7 days**; no Stories |
| Rising discussions | Early signals from communities | **Reddit API** (`/rising`, `/hot`) | Free tier 100 queries/min, non-commercial only; commercial use needs a deal. Reports of new-access cutoffs in 2026-2027 are unverified, so check first |

### 4.2 Account data (what works for *this* user)

Get this from the account owner (OAuth) or as an export. It beats every industry average.

| Data | Why |
|---|---|
| When followers are online (by hour and weekday) | The real "best time to post" |
| Per post: reach, views, average watch time, completion, shares/sends, saves, comments | Learn which formats and hooks work for this audience |
| Follower locations and time zones | Convert posting windows to the right local time |
| Past hashtags and their reach | Keep the hashtags that brought new people |
| Share of reach from non-followers | Shows whether posts get recommended or only reach followers |

### 4.3 The post itself (checks before publishing)

All of these come from the draft. No external data is needed.

| Check | Rule |
|---|---|
| Hook | Does the first line or first 1-3 seconds state the point? |
| Length | Short video: short enough to finish and rewatch |
| Keywords | Main topic words in caption, on-screen text and speech |
| Hashtag count | Within the platform limit (Instagram max 5) |
| Original | Not a re-upload; no other app's watermark |
| Links | No link in the body on LinkedIn/Facebook; use a comment |
| Trend age | Trend first seen < 48 h ago, or the post adds a new angle |

---

## 5. How a recommendation could work in Moment

This is a proposal, not part of the frozen contract. It would be a new endpoint or optional field,
agreed with Stefan first.

1. **Inputs:** the `Trend` (platform, `detected_at`), the `Draft` (caption, hashtags, format), the
   account data from 4.2 if connected, and the fresh trend signals from 4.1.
2. **Rules, in this order:**
   - **When:** the account's top online hours → else the platform window from section 3 in the
     audience's time zone → and always "as soon as possible" if the trend is less than 24 h old.
   - **Hashtags:** respect the platform limit; 1 broad + niche + branded; drop hashtags with no recent
     activity (Instagram `recent_media`, TikTok Creative Center).
   - **Format:** short video with a 1-3 s hook where the platform is video-first (TikTok, Reels, Shorts).
   - **Pre-flight checks:** the table in 4.3.
3. **Output:** a short checklist the user can act on, each line with its confidence tag, e.g.
   "Post today 18:30 (your followers peak 18-21h) [account data]", "Use #CozyAutumn #Boabe … (5/5)
   [official limit]", "Move the link to the first comment [consistent]".
4. **Feedback loop:** after 1 h and 24 h, read the post's metrics (4.2) and compare them with the
   account's average. This tells us which rules really work, and turns **[single]** claims into
   measured ones.

---

## 6. Re-check before relying on it

- Instagram's hashtag limit (5 vs. older pages saying 30): check the Help Center and the app.
- X ranking weights: read the current `xai-org/x-algorithm` code; it changes often.
- X API trends price per call and the monthly read cap: check docs.x.com.
- Google Trends API: still alpha? Apply for access.
- TikTok Creative Center: which public trend feeds still exist, and the terms on automated access.
- Reddit API: the reported 2026-2027 changes to new access.
- Every "best time" window: replace with account data as soon as we have it.

---

## Sources

Platform and official:
- TikTok newsroom, how the For You feed recommends videos: https://newsroom.tiktok.com/how-tiktok-recommends-videos-for-you/?lang=en
- X For You algorithm coverage (open-source release): https://www.businesstoday.in/technology/news/story/decoding-xs-algorithm-heres-how-grok-open-sources-and-curates-the-for-you-feed-511751-2026-01-20 and https://decrypt.co/355108
- Instagram originality crackdown, April 2026: https://techcrunch.com/2026/04/30/instagram-restricts-reach-of-content-aggregators-in-new-crackdown/ and https://petapixel.com/2026/04/30/new-instagram-policies-target-reposted-content/
- Instagram Graph API, hashtag search and limits: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/hashtag-search
- Instagram Graph API, top media: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media
- YouTube Data API, mostPopular chart change (July 2025): https://developers.google.com/youtube/v3/revision_history and https://developers.google.com/youtube/v3/guides/implementation/videos?hl=en
- X API overview and pricing: https://docs.x.com/overview.md

Industry studies and analyses:
- Mosseri's three signals (secondary write-ups): https://www.socialync.io/blog/adam-mosseri-shares-instagram-algorithm-2026 and https://blog.hootsuite.com/instagram-algorithm/
- Instagram 5-hashtag limit: https://www.digitalapplied.com/blog/instagram-limits-hashtags-5-organic-reach-strategy-2026 and https://later.com/blog/instagram-hashtags/amp
- Sprout Social, best times to post 2026: https://sproutsocial.com/insights/best-times-to-post-on-social-media/
- Buffer, best time to post 2026: https://buffer.com/resources/best-time-to-post-social-media/
- X algorithm weights (one analyst's reading): https://www.thekeyword.co/news/x-algorithm-engagement-weights and https://socialpilot.co/blog/twitter-algorithm
- TikTok algorithm 2026: https://blog.hootsuite.com/tikTok-algorithm/ and https://www.darkroomagency.com/observatory/tiktok-algorithm-guide-2026-everything-we-know-about-how-videos-are-ranked
- YouTube Shorts algorithm: https://vidiq.com/blog/post/youtube-shorts-algorithm/ and https://outlierkit.com/resources/youtube-shorts-algorithm/
- LinkedIn algorithm 2026: https://metricool.com/linkedin-algorithm/ and https://www.eclincher.com/articles/how-the-linkedin-algorithm-works-in-2026-a-guide-for-b2b-growth
- Threads (Buffer, from the Threads team): https://buffer.com/resources/threads-algorithm/
- Facebook algorithm 2026: https://www.socialpilot.co/blog/facebook-algorithm
- TikTok Creative Center data access: https://bir.ch/blog/tiktok-creative-center and https://community.meltwater.com/monitor-191/trends-center-in-monitor-7615
- X API pricing 2026: https://opentermsarchive.org/en/memos/x-replaces-its-dollar200-entry-level-api-plan-with-a-pay-per-use-model/ and https://opentweet.io/x-api-pricing
- Google Trends API alpha: https://konabayev.com/blog/google-trends-api-landscape-2026/
- Reddit API pricing 2026: https://www.socialcrawl.dev/blog/reddit-api-key-limits-alternatives-2026
