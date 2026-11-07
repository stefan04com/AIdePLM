# Trend score: which data source?

Decision doc for Militaru's board item "Source for the Trend score" (`COORDINATION.md`, section "Next: Post / Rules layout, Trend score...").
Checked 2026-11-07 against official docs and pricing pages where they could be opened. Anything marked **(unverified)** comes only from third-party write-ups or could not be checked.

**Goal:** given a post's keywords and hashtags, say how trending they are now and suggest better ones. Every score is labelled **"saved"** (cached data) or **"live"** (fetched now).

## Comparison

| Source | Access | Cost | Rate limit | What Moment gets | Risk | Effort |
|---|---|---|---|---|---|---|
| **Google Trends API** (official) | Alpha; apply by form, few developers picked [1] | Not published [1] | Not published [1] | Search interest, rolling 5 years [1] | Access may never come [1][14] | Low code; blocked on approval |
| **pytrends** (unofficial) | No key | Free | Unknown; 60 s sleep once limited [2] | Interest over time, related queries | Archived 2025-04-17 [2]; scraping vs Google Terms [3] | Low, fragile on stage |
| **SerpApi** Google Trends | API key | Free 250/month; $25 for 1,000; $75 for 5,000 [4] | Free plan 50/h [4] | TIMESERIES, GEO_MAP, RELATED_TOPICS/QUERIES, `geo=RO` [5] | Third party; paid per search | **Low** |
| **YouTube Data API v3** `mostPopular`, `regionCode=RO` | Cloud project + API key [6] | Free, 10,000 units/day [6] | 1 unit per call [7] | Top RO videos with `snippet.tags` [7] | Chart = music, movies, gaming only since 2025-07-21 [8] | **Low** |
| **Reddit Data API** | OAuth app + approval **(unverified)** [9] | Free non-commercial; commercial by deal **(unverified)** [9] | 100 QPM per client id **(unverified)** [9] | `/rising`, `/hot`, search | Approval rare; Moment is commercial **(unverified)** [9] | Medium |
| **X API v2** | Dev account + credits [10] | Pay-per-use: post read $0.005, trends $0.010/request [10] | 3M post reads/month cap [10] | Trends by WOEID, recent search | No free read tier **(unverified)** [11] | Low code; needs a card |
| **Instagram Graph API** hashtag search | Business/Creator account + App Review [12] | Free | 30 unique hashtags / 7 days per account [12] | `top_media`, `recent_media` [12] | Review time; cap runs out fast | High |
| **TikTok Research API** | Academic / non-profit only [13] | n/a | n/a | Nothing for us | No commercial use [13] | Not possible |
| **TikTok Creative Center** | Website; no public API **(unverified)** [15] | Free | n/a | Trending hashtags/sounds, read by hand | Scraping may break terms | Manual only |

## Notes

- **Google Trends** is the best fit for "is this keyword rising in Romania", but the only official route is the invite-only alpha [1]. Applying costs nothing, so apply now and keep the code path ready.
- **pytrends** is the classic free route, but the project is archived [2] and scraping goes against Google's Terms when robots.txt says no [3] (`trends.google.com/robots.txt` disallows `/trends/explore?` [16]). Do not use it in the live demo.
- **SerpApi** is the quickest live route where we do not scrape ourselves (SerpApi does; check its terms before commercial use). 250 free searches per month cover rehearsals and the demo [4].
  One TIMESERIES call can compare several keywords at once [5]. Whether each call counts as one search is not stated on the page; cached repeats are free [5].
- **YouTube** is free and easy, and `snippet.tags` gives ready-made hashtag ideas [7], but the chart now only covers music, movies and gaming [8]. Useful as a secondary signal, not the main score.
- **Reddit**: the official Data API Wiki returned 403 to our fetch (bot protection), so every Reddit fact here comes from third-party blogs [9]. Treat as unverified until a human reads the wiki while logged in.
- **X**: real-time trends exist, but every call is paid [10]. A $20 starter credit is mentioned [10]; other amounts appear in blogs **(unverified)** [11].
- **Instagram** is right for hashtag suggestions (Militaru's other board item), but App Review and the 30-hashtag cap make it a "later" item [12].

## Recommendation

1. **Demo:** the Trend score endpoint reads saved data (keywords and hashtags for the Boabe trend, built from `data/live_trends.json` and a one-off SerpApi pull) and labels it **"saved"** with the date it was collected.
2. **Live, behind the same endpoint:** SerpApi Google Trends (`geo=RO`, TIMESERIES + RELATED_QUERIES) with a key in `.env`; on any error or no key, fall back to the saved data and say "saved". YouTube `mostPopular` RO is an optional, free second signal for tags.
3. **Later:** swap SerpApi for the official Google Trends API if the alpha application is accepted; add X trends (paid) and Instagram hashtag search (after App Review). Skip pytrends, TikTok Research API and Reddit until access is confirmed.

## Sources

1. Google Trends API (alpha): https://developers.google.com/search/apis/trends
2. pytrends README (unofficial, archived, rate limit): https://github.com/GeneralMills/pytrends
3. Google Terms of Service (automated access): https://policies.google.com/terms?hl=en
4. SerpApi pricing: https://serpapi.com/pricing
5. SerpApi Google Trends API: https://serpapi.com/google-trends-api
6. YouTube Data API, getting started (quota): https://developers.google.com/youtube/v3/getting-started
7. YouTube `videos.list` reference: https://developers.google.com/youtube/v3/docs/videos/list
8. YouTube Data API revision history (10 Jul 2025 entry): https://developers.google.com/youtube/v3/revision_history
9. Reddit API (third-party, unverified): https://data365.co/blog/reddit-api-pricing and https://prowlo.com/blog/reddit-data-api ; official wiki not reachable: https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki
10. X API pricing: https://docs.x.com/x-api/getting-started/pricing
11. X free tier status (third-party, unverified): https://postproxy.dev/blog/x-api-pricing-2026/ and https://api.sorsa.io/blog/is-twitter-api-free
12. Instagram hashtag search: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/hashtag-search
13. TikTok Research API: https://developers.tiktok.com/products/research-api/
14. Google Trends API status in 2026 (third-party): https://ppc.land/google-opens-alpha-testing-for-new-trends-api-targeting-developers-and-journalists/
15. TikTok Creative Center access (third-party, unverified): https://bir.ch/blog/tiktok-creative-center
16. Google Trends robots.txt: https://trends.google.com/robots.txt
