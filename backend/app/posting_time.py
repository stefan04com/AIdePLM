"""Recommended posting time per platform.

The times come from data/posting_windows.json (posting_times.py): windows checked against the
2025-26 Sprout Social, Buffer, Hootsuite, Metricool and Later reports, each with its confidence
and sources. If that file can't be read, the rules below (docs/what-makes-a-post-popular.md)
are the fallback. No LLM and no network: these are industry averages, so the reason says so.
"""

from . import posting_times
from .models import Platform, PostingTime

# The data file has one entry per app; Reels and feed share it.
_DATA_KEY = {
    "instagram_reels": "instagram",
    "instagram_feed": "instagram",
    "facebook_reels": "facebook",
    "facebook_feed": "facebook",
}
_DAY = {
    "monday": "Mon",
    "tuesday": "Tue",
    "wednesday": "Wed",
    "thursday": "Thu",
    "friday": "Fri",
    "saturday": "Sat",
    "sunday": "Sun",
}

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
    data = posting_times.recommend(_DATA_KEY.get(platform, platform))
    if data is None:  # data file missing or malformed: the guide's rules
        time, reason = _RULES[platform]
        return PostingTime(platform=platform, time=time, reason=reason + _AVERAGE)
    return PostingTime(
        platform=platform,
        time=_format_windows(data.windows),
        reason=f"{data.reason}{_AVERAGE}",
        confidence=data.confidence,
        sources=[source.url for source in data.sources],
    )


def _format_windows(windows: tuple[posting_times.Window, ...]) -> str:
    """'Tue, Wed 12:00-19:00; Thu 12:00-14:00', or 'Daily 18:00-21:00' for every day."""
    parts = []
    for window in windows:
        days = "Daily" if len(window.days) == 7 else ", ".join(_DAY[d] for d in window.days)
        parts.append(f"{days} {window.start}-{window.end}")
    return "; ".join(parts)
