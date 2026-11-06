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
| **Knowledge Check** | Quizzes and flashcards |
| **Community** | Ask questions and discuss aviation |
| **Learning accounts** | Profiles with XP, ranks, badges, saved vocabulary, progress, and export/import |

## Running it

No build step or dependencies — open `index.html` in a browser, or serve the folder with any static host (e.g. GitHub Pages).

## Notes

- **Data is stored in the browser (localStorage).** Profiles and community posts are per-device; making them shared online needs a backend (e.g. Supabase or Firebase) with authentication and moderation. See the notes in `app.js`.
- Aircraft and airport figures are approximate.
- For education only — not for real-world flight. Always use official sources for flight planning.
