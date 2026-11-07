"""Recommended posting time per platform. Rules come from docs/what-makes-a-post-popular.md.

No LLM and no network: the times are industry averages from that guide, so the reason says so.
"""

from .models import Platform, PostingTime

_AVERAGE = " (Industry average: replace it with the account's own 'followers online' data.)"

_RULES: dict[str, tuple[str, str]] = {
    "tiktok": (
        "Daily 18:00-23:00, weekends too",
        "Evenings and weekends do best, and consistency matters more than the exact minute.",
    ),
    "instagram_reels": (
        "Weekdays, late morning to early afternoon (11:00-14:00)",
        "Watch time and sends decide reach, so post when your audience can watch right away.",
    ),
    "instagram_feed": (
        "Weekdays, late morning to early afternoon (11:00-14:00)",
        "Early likes from followers start the next wave, so be there for the first hour.",
    ),
    "youtube_shorts": (
        "Evenings and weekends (18:00-22:00)",
        "The first seconds (viewed vs. swiped away) gate reach, and evenings give more time.",
    ),
    "facebook_reels": (
        "Tuesday-Wednesday 12:00-20:00",
        "Reels are the main way to reach non-followers, and midweek is strongest.",
    ),
    "facebook_feed": (
        "Tuesday-Wednesday 12:00-20:00",
        "Midweek works best and weekends are weakest.",
    ),
    "x": (
        "Weekdays 08:00-11:00",
        "Trends move by the hour and replies in the first hour carry the post.",
    ),
    "threads": (
        "Weekdays 08:00-11:00",
        "No solid study yet, so use the same pattern as X and stay to reply.",
    ),
    "linkedin": (
        "Wednesday-Thursday 15:00-18:00 (weekdays 15:00-18:00 work too)",
        "Real comments in the first 60-90 minutes drive dwell time.",
    ),
}


def recommend(platform: Platform) -> PostingTime:
    time, reason = _RULES[platform]
    return PostingTime(platform=platform, time=time, reason=reason + _AVERAGE)
