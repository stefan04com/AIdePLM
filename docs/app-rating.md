# Raport de evaluare: Moment

Evaluare făcută pe 2026-11-07 (Andu), pe `main` la commit `4ce39b1`, după criteriile de jurizare din
`ARCHITECTURE.md`: **Problem 25 · AI 25 · Technical 25 · Integrations 15 · Demo 10 · bonus Cost +10**.

**Notă finală: 80 / 100, plus 7 / 10 bonus de cost, adică 87 / 110 (aproximativ 7,9 / 10).**

## Ce am verificat eu și ce am luat din rapoartele echipei

| Verificat de mine | Luat din rapoartele echipei (nu l-am putut rula) |
|---|---|
| Backend: 128 teste trec, `ruff check` și `ruff format` curate | Rulare cu AI real: 3/3 conflicte, 0 fallback-uri, $0.0566/post (`qa/results/live_eval_20261107_122427.md`) |
| Frontend: build, lint, verificarea de 300 de caractere, 20 de teste trec | Postare reală în Slack (testată de Militaru în `#all-ai-de-plm-marketing-team`) |
| Fluxul complet pe backend-ul real, în demo mode: trend → fit 88 → draft → 3 personas → comentarii cu pondere → referee (2 conflicte) → apply → SHIPPED | Testul de browser `qa/e2e_browser.py` (3/3 rulări curate; necesită Playwright, pe care nu l-am instalat) |
| Trendul riscant e respins (fit 9, motiv clar) | Videoclipul de rezervă (`qa/results/moment-backup-demo.mp4`) |
| Erori corecte: 409 la apply înainte de referee, 404 la run necunoscut | |
| Interfața, pe capturi: start, review, după ship (cu poza reală și previzualizarea Slack) | |
| Niciun secret în git, nici în istoric (singurul webhook e unul fals, din teste) | |

Pentru AI real și Slack real nu am chei pe laptopul meu, deci acolo nota se bazează pe rapoartele echipei.

---

## 1. Problem: 21 / 25

**Ce merge**
- Problema e clară și ușor de spus: trendurile trăiesc ore, aprobarea durează zile.
- Cifrele au surse: 11,9 ore viața medie a unui trend (Lorenz-Spreen et al., 2019), 8 zile pentru o rundă de review (Filestage).
- Scenariul de demo (Boabe, cafenea din București) e credibil și coerent: brand guide, review-uri reale, comentarii scriptate.
- Trendul riscant („10 espresso în 10 minute”) arată că produsul spune și „nu”, nu doar „da”.

**Ce nu merge**
- „8 zile” e o cifră raportată de un furnizor (Filestage); trebuie spus așa pe slide.
- Pe ecranul de ship apare un multiplicator de viteză (de tipul „×18.893 mai rapid”), care pe un run de câteva secunde arată umflat. Echipa a notat asta deja în `COORDINATION.md`.

## 2. AI: 21 / 25

**Ce merge**
- 5 apeluri AI structurate (fit, draft, personas, reacții, referee). Fiecare răspuns e validat după o schemă, se reîncearcă o dată, iar apoi există fallback.
- Personas construite din 65 de review-uri reale, cu ponderare: expert verificat ×3 și vechime (`docs/comment-weighting.md`).
- Referee-ul pune oamenii și personas la aceeași masă. Găsește conflicte, propune compromisuri, face edit-uri pe cuvinte și împarte task-uri.
- Rulare cu AI real: 3/3 cu conflictul Legal vs Product și 0 fallback-uri.
- Textul din surse externe (trend, comentarii, review-uri) intră în prompt-uri izolat, ca date, deci e protejat împotriva prompt injection.

**Ce nu merge**
- În demo, AI-ul răspunde din cache (demo mode). Juriul vede conținut pregătit, nu generat live. AI-ul real e dovedit doar prin raportul de evaluare, care trebuie arătat explicit.
- Scriptul spune „Brand și persona student vs Product”, dar pe ecran apare doar „Brand vs Product”. Nici ID-urile personas din backend nu se potrivesc cu `docs/demo-scenario.md`.
- Riscuri notate de echipă: limita de 2048 de tokeni poate tăia JSON-ul referee-ului, iar în rulările live apar mai des conflicte persona-vs-om.

## 3. Technical: 22 / 25

**Ce merge**
- Arhitectură simplă și clară: un singur backend FastAPI cu module separate, un contract tipat (`models.py`) oglindit în TypeScript.
- 148 de teste (128 backend, 20 frontend), lint și formatare curate, plus un test end-to-end în browser și un video de rezervă.
- Fiabilitate: un state machine cu 409 la acțiuni nepermise, timeout-uri și fallback pe fiecare integrare, demo mode, run-ul păstrat în URL (refresh sigur), comentariile refuzate cât timp un pas rulează.
- Niciun secret în git; `.env` e ignorat.

**Ce nu merge**
- Nu există CI; testele se rulează doar de mână.
- `frontend/package-lock.json` nu e sincronizat: `npm install` îl modifică (scoate pachete `esbuild` opționale pentru alte sisteme de operare). Trebuie un commit.
- Datorii tehnice cunoscute: scrierea pe disc se face cu lock-ul ținut, thread-urile care depășesc timeout-ul nu se opresc, iar `/admin/demo-mode` n-are autentificare. Acceptabile la un hackathon.

## 4. Integrations: 8 / 15

**Ce merge**
- AI real prin Amazon Bedrock / Anthropic API.
- Slack real, prin webhook, la ship. Când nu e configurat, interfața arată onest „Preview · not posted”. Câmpul `Run.slack` spune ce s-a întâmplat (posted / simulated / failed).

**Ce nu merge**
- **Adobe Firefly și Adobe Express sunt simulate**, iar hackathonul e al Adobe. E cel mai mare minus la acest criteriu. `adobe.py` e gândit ca punct de integrare, dar pe scenă trebuie spus clar că e simulat.
- Trendurile sunt și ele simulate; versiunea „live” citește trenduri reale salvate în prealabil.
- Poza reală apare doar dacă `.env` are `ADOBE_MOCK_IMAGE_URL=/visuals/boabe-latte.jpg` (e în `.env.example`). Altfel postarea apare cu imaginea SVG simulată. Fiecare laptop trebuie să-și copieze `.env.example`.
- Pentru imagine în Slack trebuie `SLACK_IMAGE_URL` sau un `PUBLIC_BASE_URL` public (nu localhost).

## 5. Demo: 8 / 10

**Ce merge**
- Interfață lucrată: albina Adobee care ghidează, progres pe pași, celebrare la ship, mod prezentator, scurtături de tastatură.
- Script de 3 minute cu timpi, roluri, plan B pentru fiecare problemă și checklist înainte de scenă.
- Comentariul Product e precompletat, iar Brand și Legal le scrie juriul.
- Video de rezervă de 72 de secunde.

**Ce nu merge**
- Header-ul se rupe pe două rânduri la 1600 px și e încărcat; albina acoperă eticheta „simulated” de la previzualizarea Slack.
- Butoanele din script diferă puțin de interfață: „Run” față de „Start run”, „Apply compromise” față de „Apply compromise & ship”.
- Demo-ul depinde de configurarea fiecărui laptop: `.env` (webhook, poza, modelul), demo mode pornit. Repetițiile pe laptopul de prezentare încă nu sunt bifate în `COORDINATION.md`.

## 6. Bonus Cost: +7 / 10

**Ce merge**
- Costul e măsurat, nu estimat: $0.0566 per post (4 apeluri, aproximativ 22 de secunde de model), din 3 rulări live.
- Panoul „AI cost” din aplicație arată costul pe apel și nu afișează niciodată un fals „$0 per post” în demo mode.

**Ce nu merge**
- În demo mode, panoul arată „n/a”. Pe laptopul de demo trebuie o rulare live înainte, ca să apară cifra.
- Partea de „valoare” (8 zile, ore economisite) se bazează pe cifre de la un furnizor sau pe presupuneri; trebuie etichetate așa.

---

## Ce trebuie făcut înainte de prezentare, în ordinea importanței

1. **3 repetiții pe laptopul de prezentare**, una cu demo mode oprit, cu `.env` complet: model, webhook Slack, `ADOBE_MOCK_IMAGE_URL`, `SLACK_IMAGE_URL`.
2. **Spuneți clar pe scenă ce e real și ce e simulat**: AI real și Slack real; Adobe și trendurile simulate. Arătați raportul de evaluare live ca dovadă.
3. **Aliniați scriptul cu ecranul**: conflictul „Brand + persona student” și numele butoanelor.
4. **Înlocuiți multiplicatorul de viteză** cu „21s față de 8 zile”.
5. **Faceți commit la `package-lock.json`**, tag `v1.0.0-demo`, merge în `develop`.
6. **O rulare live pe laptopul de demo**, ca panoul de cost să arate „$X per post”.

## Notă pe scurt

| Criteriu | Notă | Max |
|---|---|---|
| Problem | 21 | 25 |
| AI | 21 | 25 |
| Technical | 22 | 25 |
| Integrations | 8 | 15 |
| Demo | 8 | 10 |
| **Total** | **80** | **100** |
| Bonus Cost | +7 | +10 |
| **Cu bonus** | **87** | **110** |

Cel mai mare câștig rapid e la **Integrations**: dacă Adobe rămâne simulat, merită măcar o explicație de 10
secunde în pitch despre cum se leagă real (punctul de integrare din `adobe.py`). Cel mai mare risc e
**configurarea laptopului de demo**: tot ce merge depinde de `.env` și de demo mode.
