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
| **Community** | Ask questions and discuss aviation |
| **Ask Aero** | A built-in study helper (💬 button, bottom right) that explains terms, compares two terms, converts units, spells callsigns phonetically and describes aircraft — answered from AeroLearn's own data, offline |
| **Abbreviation decoder** | Dictionary page: paste abbreviations, a list, or a short sentence and get every known term explained |
| **Aviation timeline** | Aircraft page: 25 milestones from the 1783 balloon to flight on Mars, filterable by era |
| **Handy extras** | Word of the Day (listen/save), aircraft comparison incl. engines and size ratios, unit converter (speed, altitude, distance, vertical speed, weight, pressure, fuel, temperature), lesson bookmarks (🔖), day/night mode |
| **Languages** | English and Filipino (beta) interface — switch in the top bar. Lessons, missions and definitions are still English. Add a language in `i18n.js` |
| **Learning accounts** | Profiles with XP, ranks, badges, saved vocabulary, progress, and export/import |

## Running it

No build step or dependencies — open `index.html` in a browser, or serve the folder with any static host (e.g. GitHub Pages).

## Notes

- **Data is stored in the browser (localStorage).** Profiles and community posts are per-device; making them shared online needs a backend (e.g. Supabase or Firebase) with authentication and moderation. See the notes in `app.js`.
- **Ask Aero is not a large language model.** It matches questions against the dictionary, aircraft library and tools. To connect a real AI model, run your own backend (API keys stay on the server) and set `ASK_AERO_ENDPOINT` in `extras.js`; it is sent `POST {question, lang}` and should return `{answer}`.
- Aircraft and airport figures are approximate.
- For education only — not for real-world flight. Always use official sources for flight planning.
