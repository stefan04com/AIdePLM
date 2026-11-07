# Image credits

These stand in for images a real Adobe Firefly integration would generate.

## `boabe-pumpkin-latte.jpg` (940 × 628)

- Used for: the post's first visual (`ADOBE_MOCK_IMAGE_URL`).
- Source: provided by the team (Militaru), 2026-11-07.
- License: to confirm before any public use outside the hackathon demo.

## `boabe-pumpkin-latte-revised.jpg` (1024 × 572)

- Used for: the image the Firefly mock "generates": the post switches to it only when someone presses "Generate with Firefly" (`FIREFLY_IMAGE` in `src/lib/firefly.ts`). Also the Slack message image (`SLACK_IMAGE_URL`).
- Source: provided by the team (Militaru), 2026-11-07.
- License: to confirm before any public use outside the hackathon demo. (Replaced on 2026-11-07 an earlier version that had a stock watermark; this one has none.)

## `boabe-latte.jpg` (1280 px)

- Used for: the rejected (risky) trend: the post it would have made, greyed out behind the brand-safety shield (`REJECTED_VISUAL` in `src/lib/firefly.ts`). Never posted.
- Source: Matt Hoffman, 2016, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Latte_artwork_cincinnati_(Unsplash).jpg), originally [Unsplash](https://unsplash.com/photos/72qDM1TA5p8).
- License: CC0 1.0 (public domain, no attribution required).

Slack can't load a file from our laptop, so the Slack message uses the revised image from its public GitHub raw URL (`SLACK_IMAGE_URL` in `.env.example`).
