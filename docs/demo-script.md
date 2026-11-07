# Moment: 3-minute live demo script

Fictional brand: Boabe. Trend: cozy autumn setup. Product: Pumpkin & Cinnamon Latte.
Source of truth: `docs/demo-scenario.md`. Demo mode must be on for the whole run.

## Roles

| Role | Who | Job |
|---|---|---|
| Presenter | Ada | Speaks and points at the screen. Does not touch the laptop. |
| Driver | Name TBD | Sits at the laptop. Clicks only what the timing table says. |
| Judge (Brand) | Volunteer 1 | Types the Brand comment from card B. |
| Judge (Legal) | Volunteer 2 | Types the Legal comment from card L. |

The Product comment is pre-filled in the form. The driver sends it. Judges do not type it.

**Card B (Brand):**
"This reads like an ad. The trend is about the cozy moment, not about us. Lead with the moment, keep the latte in the background and make the call to action softer."

**Card L (Legal):**
"The caption can't say 'no added sugar', 'healthy' or 'the best latte in town'. We have no documentation for the sugar claim, and health claims and superlatives we can't prove are off-limits."

**Product (pre-filled, driver sends):**
"The Pumpkin & Cinnamon Latte launches this week. Add that it has no added sugar, it's our main selling point, and make the drink the hero of the visual."

## Presenter mode

The driver never needs to find a button: **→** (or **PageDown**, which a slide clicker sends) runs the next step, and the header shows what it will do (`→ start run`, `→ run referee`…). **B** starts the risky trend for the brand-safety beat. Open `http://localhost:5173/?intro` right before going on stage to play the opening title; **🔊** in the header mutes the sound effects.

## Timing table (total 3:00)

| Time | On screen | Who clicks what | Presenter says | Judging criterion |
|---|---|---|---|---|
| 0:00 to 0:20 | Title slide: Moment, Boabe. | Nobody. | "Brands miss trends because approval takes days. Moment gets a trend to an approved post in about two hours." | Problem 25 |
| 0:20 to 0:40 | Saved trend card: cozy autumn setup. Fit score and reason appear. | Driver clicks "Run" on the saved trend. | "This trend broke 20 minutes ago. Moment checks the fit against Boabe's brand rules." | AI 25 |
| 0:40 to 1:05 | Caption, visual and post preview panel (simulated, Express-style). | Nobody. | "The brief, caption and visual are ready. The post sits in a preview, ready to plug into Adobe Express." | Integrations 15, Technical 25 |
| 1:05 to 1:35 | Three human cards with timers. Three persona cards beside them. | Judges type cards B and L and send. Driver sends the pre-filled Product comment. | "Three humans and three personas review at the same time." "The personas are built from 65 real public reviews of Bucharest specialty cafés and coffee-ordering apps." "Boabe is fictional, so they are not its customers." | Problem 25, AI 25 |
| 1:35 to 2:10 | Conflict cards: Legal vs Product on "no added sugar". Brand and student persona vs Product on the product as hero. Compromise text. | Driver clicks "Run referee" at the start of this beat. | "The referee reads all the feedback together." "Legal has no sugar documentation, so Product's claim cannot stay." "The compromise names the latte, drops the claim and softens the call to action." | AI 25 |
| 2:10 to 2:30 | Caption updated in the canvas and post preview. | Driver clicks "Apply compromise". | "One click. Nothing goes out without a human." | Integrations 15, Technical 25 |
| 2:30 to 2:45 | Slack message preview in the app (simulated): final caption, task list, "Trend to approved" clock. | Driver scrolls to the Slack message preview. | "This is the message the team gets in Slack." "Product's task: send the sugar documentation to Legal before any later post." "Trend to approved post in [clock] minutes. On a real day, with reviewers answering between meetings, that's about two hours, not eight days." | Integrations 15, Demo 10 |
| 2:45 to 2:55 | Architecture slide, then cost slide. | Driver advances the slides. | "Five AI calls per post, schema-checked and logged." "About $X per post, against Y hours of review time." | Technical 25, Cost bonus |
| 2:55 to 3:00 | Close slide with the one-line pitch. | Nobody. | "Moment turns a trend into an approved post, with customers at the table. Thank you." | Demo 10 |

Note for the Slack row: read the real number from the header clock. Never say "1h 50m" on stage; the "about two hours" is the real-world claim, the clock is the proof.

## If something breaks

| Symptom | Presenter says | Driver does |
|---|---|---|
| Model call is slow or times out (over 15 s) | "The live model is slow. Here is the saved result." | Confirm demo mode is on. Reopen the saved run. |
| No conflict cards after referee | "The referee is still reviewing. Here is the saved conflict." | Load the saved referee result. Do not run the referee again. |
| Trend fetch fails or looks wrong | "Today we use our saved trend. The flow is the same." | Select the saved trend `trend_cozy_autumn_setup`. |
| Post preview does not load | "This preview shows the same content." | Switch to the preview panel with the pre-generated image. |
| Slack message preview does not appear | "Here is the message the team receives." | Show the saved screenshot of the Slack preview. |
| Wi-Fi drops | "We are on our phone hotspot now." | Move the laptop to the hotspot. Re-run only if needed. |
| Laptop or all paths fail | "Here is the recorded run." | Play the backup video full screen. |

## Pre-stage checklist

- [ ] Demo mode on: `POST /admin/demo-mode` with `{"on": true}`, response confirmed.
- [ ] Fresh start: restart the backend. Pass the full flow three times in a row.
- [ ] Saved trend `trend_cozy_autumn_setup` selected.
- [ ] Tabs open: Moment app, architecture slide, backup video.
- [ ] Browser zoom checked on the projector from the back of the room.
- [ ] Notifications off and Focus mode on.
- [ ] Phone hotspot on and tested. Laptop joined to it.
- [ ] Charger plugged in.
- [ ] Backup video paused at the start, ready for full screen.
- [ ] Cards B and L printed. Product comment pre-filled in the form.
- [ ] `$X` filled from `logs/usage.jsonl` (via `GET /usage`). Y hours agreed with the team.
