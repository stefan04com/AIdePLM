# Review nou al aplicației Moment (runda 2)

Făcut pe 2026-11-07 (Andu), pe `main` la commit `ca9f646`. Continuă `docs/app-rating.md` (runda 1, nota 80/100 + 7 bonus).
Scopul: ce merge acum, ce nu, și o listă de îmbunătățiri pe priorități, ca să știm ce atacăm după prezentare.

**Notă nouă: 84 / 100, plus 8 / 10 bonus de cost, adică 92 / 110.**

## Ce am verificat eu acum

| Verificat pe laptopul meu | Rezultat |
|---|---|
| Backend: 130 de teste, `ruff check` | trec |
| Frontend: build, lint (limita de 300 de caractere), 21 de teste | trec |
| Flux complet pe backend-ul real, în demo mode | fit 88 → draft → 3 personas → comentarii cu pondere (expert ×3) → referee cu **3 conflicte, inclusiv Brand vs persona** → apply → SHIPPED |
| Trendul riscant | respins (fit 9, motiv clar) |
| Erori | 409 la apply înainte de referee, 404 la run necunoscut |
| Interfața | header pe un rând de la 1600 px, albina nu mai acoperă etichetele, butonul „Apply all & ship” |

Nu am putut verifica: AI-ul real și postarea reală în Slack (nu am chei în `.env`-ul meu), testul în browser (`qa/e2e_browser.py`, cere Playwright).
Pentru ele mă bazez pe rapoartele echipei (`qa/results/live_eval_20261107_142630.md`: 3/3 conflicte om vs persona, $0.0602 per post).

## Ce s-a îmbunătățit față de runda 1

| Subiect | Înainte | Acum |
|---|---|---|
| Persona în conflicte | nu apăreau în rulările live | apar 3/3 live, iar demo mode are și el un conflict cu o persona |
| Referee pe scenă | în demo mode răspundea mereu din cache | `LIVE_IN_DEMO=referee` îl rulează live, cu cache ca rezervă |
| Butonul de ship | „Accept compromise” promitea o alegere falsă | „Apply all & ship”, fără butoane de alegere pe fiecare conflict |
| Costul | „n/a” în demo mode | $0.0602 afișat peste tot, cu sursa („measured in live eval”) |
| Ecranul de ship | „18.893× mai rapid” | „timpul real vs 8 zile” |
| Poza postării | laptop + tastatură, nepotrivită | latte pe masă, potrivită cu textul; ajunge și în Slack |
| Header | pe două rânduri, albina acoperea etichete | pe un rând de la 1600 px |
| Tag de versiune | lipsea | `v1.0.0-demo` |

## Nota pe criterii

| Criteriu | Runda 1 | Acum | De ce |
|---|---|---|---|
| Problem (25) | 21 | 23 | cifra umflată a dispărut; rămâne „8 zile” de la un furnizor, de spus așa |
| AI (25) | 21 | 23 | persona în conflicte, referee live; în demo, restul vine tot din cache |
| Technical (25) | 22 | 22 | la fel; lipsește CI, iar `package-lock.json` se modifică la `npm install` |
| Integrations (15) | 8 | 8 | Adobe și trendurile rămân simulate; AI și Slack sunt reale |
| Demo (10) | 8 | 8 | interfață bună, dar repetițiile pe laptopul de prezentare nu sunt bifate |
| **Total** | **80** | **84** | |
| Bonus cost | 7 | 8 | cifra se vede mereu, cu sursa |

## Ce nu merge sau e riscant acum

1. **Configurarea laptopului decide totul.** Pe laptopul meu `.env` are doar webhook-ul Slack. Din cauza asta draft-ul a venit cu imaginea SVG simulată, nu cu poza cu latte.
   Fiecare laptop trebuie să copieze `.env.example` și să adauge modelul, cheile și `LIVE_IN_DEMO=referee`.
2. **Dovada AI-ului real e doar un raport.** În demo mode, 3 din 4 apeluri vin din cache. Raportul `live_eval` trebuie arătat explicit pe scenă.
3. **Scriptul de demo e aproape la zi,** dar spune încă „Run” la 0:20, iar interfața are „Start run”. Mai spune „student persona”, iar personas reale sunt „Laptop Regular”, „Origin Seeker” și „App-First Commuter”.
4. **Repetițiile.** Cele 3 repetiții pe laptopul de prezentare, una cu demo mode oprit, nu sunt bifate pe tablă.
5. **Adobe e simulat la un hackathon Adobe.** Cel mai mare minus la Integrations.

## Îmbunătățiri propuse, pe priorități

### Înainte de scenă (reparații mici)
- Aliniază scriptul cu ecranul: „Start run”, numele personas, ce se vede la conflicte (Anda).
- Un `.env` de demo gata făcut, pe care îl copiază toți (Stefan), și un test care pică dacă lipsește ceva important (de exemplu poza).
- Pe slide: „8 zile” marcat ca cifră raportată de furnizor (Anda).

### Imediat după prezentare (produs)
- **Alegere reală pe conflicte.** Backend-ul să folosească `conflict_ids`: utilizatorul acceptă sau respinge un compromis, iar caption-ul final se recalculează. Acum butonul e onest, dar nu există nicio alegere.
- **Adobe real.** Un apel Firefly în `adobe.generate_visual()` și un document Express real. Punctul de integrare există deja.
- **Trenduri live.** Citire din Reddit sau X; secțiunea 4 din `docs/trending-research.md` listează sursele și limitele.
- **Recomandarea de postare.** Ora, hashtag-urile și formatul pe platformă, pe baza `docs/what-makes-a-post-popular.md`. E propunerea din secțiunea 5 din `docs/trending-research.md`.
- **Mai multe platforme.** Acum doar un tip de postare; ar trebui draft-uri diferite pe Instagram, TikTok, X, LinkedIn.

### Calitate și tehnic
- CI care rulează testele și build-ul la fiecare push.
- Un test de browser rulat automat, cu poza reală și Slack simulat.
- `MAX_TOKENS` (2048) poate tăia JSON-ul referee-ului; autentificare pe `/admin/demo-mode`; scrierea pe disc cu lock-ul ținut.
- `frontend/package-lock.json` să rămână stabil la `npm install`.
- Fișiere lungi: `styles/wow.css` (633 de linii), `styles/adobee.css` (367), `Adobee.tsx` (322). Merită împărțite.

### Interfață
- Accesibilitate: doar 2 imagini au text alternativ; verificare cu cititor de ecran și contrast pe proiector.
- Ecrane mici: sub 1100 px coloanele se stivuiesc, dar header-ul nu a fost verificat acolo.
- Un mod „istoric” cu run-urile vechi (acum se vede doar run-ul din URL).

### Date și AI
- Reviews: coloanele opționale `date` și `verified_industry` din `reviews.csv` nu sunt completate, deci ponderea review-urilor nu face nimic.
- Un set de evaluare mai mare (alte branduri și trenduri), nu doar Boabe și un singur trend, ca să vedem dacă referee-ul generalizează.
- Măsurarea efectului ponderii comentariilor pe un referee real, pe care nu l-am putut testa.
