# Moment

**Brands miss trends because approval takes days. Moment gets a trend to an approved post in 2 hours.**

Built at the IT Fest Adobe Hackathon 2026. Theme: *Marketing Reimagined: build the next generation of AI-powered marketing tools.*

---

## The problem

Online trends live for hours, not weeks. A meme, a news story or a Reddit thread is everywhere this morning and forgotten by tomorrow.

Most brands can't move that fast. Not because they lack ideas, but because of **approval**. A post has to go past the brand team, legal and product, often one after another, over email and chat. Comments are vague ("make it pop"), people contradict each other ("drop the competitor's name" / "keep it, that's the joke"), and nobody knows how real customers will react until it's live.

By the time everyone agrees, the trend is over.

Content review is slow: a 2023 [Filestage survey](https://filestage.io/blog/creative-collaboration-report) of 366 marketers and creatives found the average review takes eight days and over three versions, and up to 10 days at brands (vendor-reported). Attention moves faster: on Twitter, a hashtag's average time in the top 50 fell from 17.5 hours (2013) to 11.9 hours (2016) ([Lorenz-Spreen et al., 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6465266)).

## The idea

Moment is a **war room for one post**. It takes a trend from "this just happened" to "approved and ready to publish" in one sitting, with AI doing the slow parts and people making the decisions.

### How it works

**1. Spot.** A trend comes in from Reddit or the news. Moment checks whether it fits the brand, and explains why or why not.

**2. Draft.** AI writes the brief and the caption and a prompt for the visual. The visual and the post are simulated locally in this version, ready to be generated with Adobe Firefly and laid out in Adobe Express.

**3. Review.** Two kinds of reviewers look at the post at the same time:
- **Real people:** Brand, Legal and Product, each with a short timer.
- **A synthetic audience:** three AI customer personas built from real customer reviews. They react the way those customers would: *"This feels like a brand trying too hard."*

**4. Referee.** AI reads all the feedback together. Where people disagree, it shows a **conflict card**, such as *"Legal says drop the competitor's name, Product wants it in"*, and proposes a compromise. Vague comments become concrete edits.

**5. Ship.** One click applies the changes. The post gets a new version, and the final version plus the to-do list is posted to the team's Slack channel.

### What's new here

**Customers get a seat at the review table.** Today, customer reaction is something you find out after publishing. In Moment, the synthetic audience reviews the post alongside Brand, Legal and Product. When the "customers" disagree with Brand, that's a conflict like any other, and it gets resolved before the post goes out.

## Who it's for

Social media and brand teams at companies big enough to need sign-off from several people, but who still want to react to what's happening today.

## How it fits the theme

| | |
|---|---|
| **Marketing problem** | Slow approval kills trend-based marketing. |
| **AI at the core** | AI checks brand fit, drafts the post, simulates real customers, and resolves conflicts between reviewers. Without it, the product doesn't exist. |
| **Adobe tools** | Integration-ready: the visual and the post are simulated locally; `adobe.py` is where Adobe Firefly (visual) and Adobe Express (post) plug in. |
| **Other integrations** | Slack (real incoming webhook) for the final hand-off. Trends come from Reddit/news in the product concept; the demo uses saved and collected trends. |
| **Cost vs value** | About five AI calls per post. Cost per post vs hours of review time saved: see the pitch. |

## The demo in 3 minutes

1. *"This trend broke 20 minutes ago."* Moment matches it to the brand and drafts the post, with a placeholder visual.
2. Two judges play **Legal** and **Brand** and type real comments. At the same time, the customer personas react.
3. **Conflict cards** appear: Product wants "no added sugar" in the caption, Legal has no documentation for it; Brand wants the cozy moment to lead, Product wants the latte as the hero. One click on "apply compromise" and the post updates.
4. The final post and task list appear as the Slack message the team would get. The header clock shows the real time from trend to approved post: a few minutes on stage, about two hours on a normal working day with reviewers answering between meetings, instead of the [eight days](https://filestage.io/blog/creative-collaboration-report) a review usually takes.

## What's next

- Watching several platforms for trends, not just one
- Personas built from a brand's own customer data
- Learning which compromises each team usually accepts
- Publishing straight to social platforms after approval

## Team

| | |
|---|---|
| **Stefan** | AI and backend |
| **Andu** | Product interface |
| **Militaru** | Integrations: real Slack webhook; local simulation of Adobe and trends, integration-ready |
| **Anda** | Data, story and pitch |

---

Technical details: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Working rules for the repo: [`CLAUDE.md`](CLAUDE.md)
