# AeroLearn ✈

**Understand the skies. One lesson at a time.**

A beginner-friendly aviation learning platform with an interactive glossary, lessons, quizzes, and community discussions.

## Features

| Section | What people can do |
|---|---|
| **Academy** | Learn about aircraft, aerodynamics, navigation, and aviation (lessons + METAR decoder, pitch/roll/yaw demo, unit converter) |
| **ATC & Communications** | Understand pilots, control towers, VHF, and radio communication (lessons, radio practice, phonetic alphabet, radio spectrum, squawk codes) |
| **Communication explorer** | Radio phraseology library (with quiz), call sign explorer, communication breakdown scenarios and tower light signals, frequency explorer with a VHF range calculator, and a stage-by-stage communication timeline of a fictional flight. All callsigns, airports and frequencies are fictional, labelled educational examples, and nothing is transmitted |
| **Interactive ATC simulator** | Fly a training circuit and talk to Ground and Tower — tune the radio, read back clearances, choose or type your calls |
| **Aviation Dictionary** | Search 140 terms like VHF, PMR, ILS, IFR, and transponder; save favourites and add your own |
| **Aircraft Library** | Explore and compare 16 aircraft |
| **Aircraft explorer** | Click aircraft parts to learn their names and functions, plus a "find the part" game |
| **Aviation dashboard** | Zulu clock, term of the day, airport information, aircraft profiles, and weather education |
| **Aviation Careers** | Explore 8 careers (commercial pilot, aerospace & avionics engineer, ATC controller, aviation software engineer, aircraft mechanic, flight dispatcher, airport operations manager) — a day in the job, skills, typical path, and related AeroLearn tools — plus a Career Match Quiz |
| **Missions** | Six missions (001 First Flight, 002 Tower Communication, 003 Aircraft Detective, 004 Weather Watch, 005 Navigation Challenge, 006 Emergency Awareness), each with a briefing, tasks and a debrief. Earn 1–3 stars, XP per new star, and achievements shown on your profile. A free quiz and flashcards remain for quick practice |
| **Shop & hangar** | Earn Aero Coins (half of every XP, never real money) and spend them on 6 animated companions (Pip the Penguin, Rex, Oliver, Charlie, Rookie, Skye) that wander, nap, play, follow the cursor and travel across your dashboard, plus pet accessories, hangar decorations, dashboard themes and profile cosmetics. Some items are achievement-only. Click a pet for its profile (pet, play, dress up, rename). **My hangar** shows your pets, decorations, trophies, favourite aircraft and workstation. Spending never lowers XP |
| **Community** | Ask questions, reply and upvote — shared between everyone, stored in PostgreSQL (React) |
| **Live weather** | Real METAR reports for any airport (e.g. RPLL Manila), decoded with flight category and a Zulu clock (React) |
| **Ask Aero** | A built-in study helper (💬 button, bottom right) that explains terms, compares two terms, converts units, spells callsigns phonetically and describes aircraft — answered from AeroLearn's own data, offline |
| **Abbreviation decoder** | Dictionary page: paste abbreviations, a list, or a short sentence and get every known term explained |
| **Aviation timeline** | Aircraft page: 25 milestones from the 1783 balloon to flight on Mars, filterable by era |
| **Handy extras** | Word of the Day (listen/save), aircraft comparison incl. engines and size ratios, unit converter (speed, altitude, distance, vertical speed, weight, pressure, fuel, temperature), lesson bookmarks (🔖), day/night mode |
| **Languages** | English and Filipino (beta) interface — switch in the top bar. Lessons, missions and definitions are still English. Add a language in `i18n.js` |
| **Learning accounts** | Real accounts (email + password). XP, lessons, missions, saved words and bookmarks sync to every device; edit profile, download your data, delete your account (React) |

## Architecture

AeroLearn is moving from a single HTML page to a full-stack app, **one page at a time**.

```
apps/
  web/                 React 19 + TypeScript (Vite) — the app shell, routing and ported pages
    src/pages/         Auth, Profile, Community, Thread, Live         ← ported to React
    src/components/    Layout (top bar), LegacyFrame (shows not-yet-ported pages)
    public/legacy/     The classic site (vanilla JS) — Academy, Lab, Missions, Dictionary, …
  api/                 Fastify + TypeScript REST API
    src/routes/        auth, progress, community, live (METAR)
    migrations/        Plain SQL migrations, applied automatically on start
    test/              API tests against a real PostgreSQL test database
packages/
  shared/              Types, zod validation, ranks and progress-merging used by web and api
```

- **Ported pages** (`/login`, `/register`, `/profile`, `/community`, `/live`) are React and talk to the API.
- **Every other URL** (`/academy`, `/atc/sim`, `/missions`, …) shows that page of the classic site in a same-origin frame, without its own top bar. Its URL, theme and language stay in sync with the app.
- **Progress sync:** the classic site keeps saving to `localStorage` as before. When you're signed in, the app notices each save and stores it in PostgreSQL. On sign-in, this device's progress is *merged* with the account's (highest XP, all lessons, best mission stars), so nothing is lost.
- **Porting the next page:** build it under `apps/web/src/pages`, add a `<Route>` in `App.tsx`, and add the page to `REACT_PAGES` in `public/legacy/app.js` so links inside the classic site hand over to it.

### API

| Method & path | What it does |
|---|---|
| `POST /api/auth/register` · `login` · `logout`, `GET /api/auth/me` | Accounts. Sessions are random tokens in an `httpOnly` cookie; only their SHA-256 hash is stored. Passwords use scrypt |
| `PATCH /api/me`, `GET /api/me/export`, `DELETE /api/me` | Edit profile, download all your data, delete your account (password required) |
| `GET/PUT /api/progress`, `POST /api/progress/merge` | Load, save, or merge learning progress |
| `GET/POST /api/posts`, `GET/DELETE /api/posts/:id`, `POST /api/posts/:id/replies`, `DELETE /api/replies/:id`, `PUT /api/posts/:id/vote` | Community |
| `GET /api/live/metar?ids=RPLL,KJFK` | Live METARs from aviationweather.gov, normalised, cached 5 minutes |

Every state-changing request must send the header `x-aerolearn: 1` (CSRF protection). Auth and posting routes are rate-limited.

## Running it

Requirements: **Node.js 20+** and **PostgreSQL 14+**.

```bash
npm install
cp .env.example .env        # then set DATABASE_URL (and TEST_DATABASE_URL for tests)
npm run migrate             # create the tables (also runs automatically when the API starts)
npm run dev                 # API on :3001 + React on http://localhost:5173 (with hot reload)
```

| Command | |
|---|---|
| `npm test` | API tests (needs `TEST_DATABASE_URL`; the test database is wiped between tests) |
| `npm run typecheck` | Type-check every package |
| `npm run build && npm start` | Production: one Node server on `PORT` serving the API and the built React app |

### Static site (no server)

`npm run build:static` builds `apps/web/dist` without the API. Accounts, the shared community and live weather are left out; progress, on-device profiles, the shop and a browser-only community still work. On Render, create a **Static Site** (or use `render.yaml`): build command `npm ci && npm run build:static`, publish directory `apps/web/dist`, and a rewrite rule `/*` → `/index.html`.

The classic site still works on its own: open `apps/web/public/legacy/index.html` directly. Progress then stays in that browser only.

## Notes

- Community posts and accounts now live in PostgreSQL. Before a public launch, add email verification, password reset, and moderation tools (reporting, admin removal).
- **Ask Aero is not a large language model.** It matches questions against the dictionary, aircraft library and tools. To connect a real AI model, run your own backend (API keys stay on the server) and set `ASK_AERO_ENDPOINT` in `extras.js`; it is sent `POST {question, lang}` and should return `{answer}`.
- Aircraft and airport figures are approximate.
- For education only — not for real-world flight. Always use official sources for flight planning.
