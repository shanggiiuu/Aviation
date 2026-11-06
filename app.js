"use strict";
// ================= Helpers =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// ---- Storage, namespaced per learning profile ----
// Global keys are shared by everyone on this device; all other keys belong to the active profile.
// The built-in "guest" profile uses the original un-prefixed keys, so earlier progress is kept.
const GLOBAL_KEYS = ["posts", "profiles", "current"];
const USER_KEYS = ["xp", "fav", "custom", "viewed", "lessons", "best", "voted", "cname", "quizHistory", "simBest", "simDone", "partsFound", "exBest", "labDone", "airportMap"];
const rawGet = (key, def) => { try { const v = localStorage.getItem(key); return v === null ? def : JSON.parse(v); } catch { return def; } };
const rawSet = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } };
let CURRENT = rawGet("sky_current", "guest");
if (CURRENT !== "guest" && !rawGet("sky_profiles", []).some((p) => p.id === CURRENT)) CURRENT = "guest";
const keyFor = (k, id = CURRENT) => (GLOBAL_KEYS.includes(k) || id === "guest" ? "sky_" + k : `sky_u_${id}_${k}`);
const store = {
  get: (k, def) => rawGet(keyFor(k), def),
  set: (k, v) => rawSet(keyFor(k), v),
};
const currentProfile = () => CURRENT === "guest" ? { id: "guest", name: "Guest", avatar: "👤" } : store.get("profiles", []).find((p) => p.id === CURRENT);
const rankFor = (xp) => {
  let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
  return { name: RANKS[i][1], next: RANKS[i + 1] || null, floor: RANKS[i][0] };
};

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
function addXP(n, msg) {
  const xp = store.get("xp", 0) + n;
  store.set("xp", xp);
  const el = $("#xp"); el.textContent = xp;
  el.parentElement.classList.remove("bump"); void el.offsetWidth; el.parentElement.classList.add("bump");
  if (msg) toast(`+${n} XP · ${msg}`);
}
$("#xp").textContent = store.get("xp", 0);
$("#acctAvatar").textContent = currentProfile().avatar;
$("#acctName").textContent = currentProfile().name;

// ================= Glossary data access =================
const allTerms = () => [...GLOSSARY, ...store.get("custom", []).map((x) => ({ ...x, custom: true }))];
const findTerm = (name) => {
  const n = String(name).trim().toLowerCase();
  return allTerms().find((x) => x.t.toLowerCase() === n) ||
         allTerms().find((x) => x.f && x.f.toLowerCase() === n);
};
// {{Term}} or {{Term|label}} -> clickable glossary link
const linkify = (html) => html.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g,
  (_, t, label) => `<a class="term-link" data-term="${esc(t)}">${esc(label || t)}</a>`);

document.addEventListener("click", (e) => {
  const ac = e.target.closest("[data-ac]");
  if (ac) { e.preventDefault(); openAircraft(ac.dataset.ac); return; }
  const link = e.target.closest(".term-link");
  if (link && link.dataset.term) { e.preventDefault(); openTerm(link.dataset.term); }
});

// ================= Router =================
const pages = ["home", "dashboard", "academy", "lab", "ops", "atc", "dictionary", "aircraft", "quiz", "community", "profile"];
const PAGE_ANCHORS = { "atc/sim": "#sim", "aircraft/explorer": "#explorer" };
const PAGE_ALIASES = { learn: "academy", glossary: "dictionary", tools: "academy" }; // old links keep working
function route() {
  let [page, ...rest] = (location.hash.slice(1) || "home").split("/");
  page = PAGE_ALIASES[page] || page;
  const p = pages.includes(page) ? page : "home";
  $$(".page").forEach((s) => s.classList.toggle("active", s.id === "page-" + p));
  $$("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.page === p));
  if (p === "dictionary" && rest.length) openTerm(decodeURIComponent(rest.join("/")));
  if (p === "dashboard") renderDashboard();
  if (p === "profile") renderProfile();
  const anchor = PAGE_ANCHORS[p + "/" + rest.join("/")];
  if (anchor) setTimeout(() => $(anchor).scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  else window.scrollTo({ top: 0 });
  if ((p === "lab" || p === "ops") && rest[0] && $("#tool-" + rest[0])) setTimeout(() => showTool(rest[0], true), 50);
}
window.addEventListener("hashchange", route);

// ================= Modal =================
function openTerm(name) {
  const x = findTerm(name);
  if (!x) { toast(`"${name}" isn't in the glossary yet`); return; }
  const terms = allTerms();
  const mentioned = terms.filter((o) => o.t !== x.t && o.t.length >= 2 &&
    new RegExp("(^|[^A-Za-z0-9])" + reEsc(o.t) + "($|[^A-Za-z0-9])").test(x.d));
  const sameCat = terms.filter((o) => o.c === x.c && o.t !== x.t && !mentioned.includes(o));
  const related = [...mentioned, ...sameCat].slice(0, 6);
  $("#modalBody").innerHTML = `
    <h2>${esc(x.t)}</h2>
    ${x.f ? `<div class="full">${esc(x.f)}</div>` : ""}
    <span class="badge ${x.custom ? "custom" : ""}">${esc(CATEGORIES[x.c] || "Other")}${x.custom ? " · your term" : ""}</span>
    <p>${esc(x.d)}</p>
    ${x.ex ? `<div class="ex">${esc(x.ex)}</div>` : ""}
    <div class="related"><div class="label">Related</div><div class="chips">${related.map((r) => `<button class="chip term-link" data-term="${esc(r.t)}">${esc(r.t)}</button>`).join("")}</div></div>
    <div class="row">
      <button class="btn ghost small" id="mFav">${isFav(x.t) ? "★ Saved" : "☆ Save to favourites"}</button>
      ${"speechSynthesis" in window ? `<button class="btn ghost small" id="mSpeak">🔊 Listen</button>` : ""}
      ${x.custom ? `<button class="btn ghost small" id="mDel">🗑 Delete my term</button>` : ""}
    </div>`;
  $("#modal").classList.remove("hidden");
  $("#mFav").onclick = () => { toggleFav(x.t); $("#mFav").textContent = isFav(x.t) ? "★ Saved" : "☆ Save to favourites"; };
  const sp = $("#mSpeak"); if (sp) sp.onclick = () => speak(`${x.t}. ${x.f || ""}. ${x.d}`);
  const del = $("#mDel");
  if (del) del.onclick = () => {
    store.set("custom", store.get("custom", []).filter((c) => c.t !== x.t));
    closeModal(); renderGlossary(); toast("Term deleted");
  };
  const viewed = store.get("viewed", []);
  if (!viewed.includes(x.t)) { viewed.push(x.t); store.set("viewed", viewed); addXP(1); }
}
function closeModal() { $("#modal").classList.add("hidden"); window.speechSynthesis?.cancel(); }
$("#modalX").onclick = closeModal;
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function speak(text) {
  if (!("speechSynthesis" in window)) return toast("Speech not supported in this browser");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.lang = "en-GB";
  speechSynthesis.speak(u);
}

// ================= Favourites =================
const isFav = (t) => store.get("fav", []).includes(t);
function toggleFav(t) {
  let f = store.get("fav", []);
  f = f.includes(t) ? f.filter((x) => x !== t) : [...f, t];
  store.set("fav", f);
  renderGlossary();
}

// ================= HOME =================
const FACTS = [
  "Runway numbers come from the magnetic heading: runway 27 points roughly 270° (west). Because Earth's magnetic field drifts, runways are sometimes renumbered.",
  "'Mayday' comes from the French 'm'aider' — 'help me'. 'Pan-pan' comes from 'panne' — a breakdown.",
  "Pilots say 'niner' instead of 'nine' so it isn't confused with the German 'nein' (no) or with 'five'.",
  "All aviation uses UTC time (called 'Zulu') so a flight from Tokyo to New York has no time-zone confusion.",
  "VHF aviation radio uses AM, not FM. With AM, two stations transmitting at once are both partly heard, rather than one silently blocking the other.",
  "A Boeing 747 wing flexes upward by several metres in flight. That's by design — a stiff wing would be heavier and could crack.",
  "Contrails are clouds: water vapour from engine exhaust freezing into ice crystals in the cold upper air.",
  "Airliners usually cruise at 35,000–41,000 ft because the thin air means less drag and better fuel economy.",
  "The black box is actually bright orange so it's easier to find after an accident.",
  "Pilots and ATC around the world use English as the standard language of aviation radio.",
  "PMR446 walkie-talkies are limited to 0.5 W and are not allowed for aviation communication — they're for everyday short-range talk on the ground.",
  "A stall has nothing to do with the engine — it's the wing exceeding its critical angle of attack.",
];
function renderHome() {
  $("#termCount").textContent = GLOSSARY.length;
  $("#heroChips").innerHTML = ["VHF", "PMR", "ATC", "ILS", "METAR", "Squawk", "QNH", "V1", "Stall", "ADS-B"]
    .map((t) => `<button class="chip term-link" data-term="${t}">${t}</button>`).join("");
  const day = Math.floor(Date.now() / 864e5);
  const w = GLOSSARY[day % GLOSSARY.length];
  $("#wotd").innerHTML = `<h3>${esc(w.t)}</h3><div class="full">${esc(w.f)}</div><p>${esc(w.d)}</p><a class="term-link" data-term="${esc(w.t)}">Open in glossary →</a>`;
  let fi = day % FACTS.length;
  const showFact = () => { $("#fact").textContent = FACTS[fi]; };
  showFact();
  $("#nextFact").onclick = () => { fi = (fi + 1) % FACTS.length; showFact(); };
  $("#heroSearch").onsubmit = (e) => {
    e.preventDefault();
    const q = $("#heroInput").value.trim();
    $("#gSearch").value = q;
    gState.cat = "all";
    renderGlossary();
    location.hash = "dictionary";
    if (q && findTerm(q)) setTimeout(() => openTerm(q), 50);
  };
}

// ================= LEARN =================
const LESSONS = [
  {
    title: "How an aircraft flies", mins: 5,
    html: `
      <p>Every aircraft in flight is balancing <b>four forces</b>:</p>
      <svg class="forces" viewBox="0 0 400 230">
        <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
        <g transform="translate(200 115)">
          <path d="M-80 0 L70 -7 Q92 0 70 7 Z" fill="#93c5fd"/><path d="M-10 -2 L-30 -18 L10 -18 L20 -2Z" fill="#60a5fa"/><path d="M-78 -2 L-92 -30 L-76 -30 L-60 -3Z" fill="#f9a8d4"/>
          <g color="#2563eb"><line x1="0" y1="-20" x2="0" y2="-95" stroke="currentColor" stroke-width="4" marker-end="url(#ah)"/><text x="8" y="-80" fill="currentColor" font-weight="700">LIFT</text></g>
          <g color="#be185d"><line x1="0" y1="15" x2="0" y2="95" stroke="currentColor" stroke-width="4" marker-end="url(#ah)"/><text x="8" y="90" fill="currentColor" font-weight="700">WEIGHT</text></g>
          <g color="#1e40af"><line x1="95" y1="0" x2="180" y2="0" stroke="currentColor" stroke-width="4" marker-end="url(#ah)"/><text x="120" y="-10" fill="currentColor" font-weight="700">THRUST</text></g>
          <g color="#ec4899"><line x1="-95" y1="0" x2="-185" y2="0" stroke="currentColor" stroke-width="4" marker-end="url(#ah)"/><text x="-170" y="-10" fill="currentColor" font-weight="700">DRAG</text></g>
        </g>
      </svg>
      <ul>
        <li>{{Lift}} pushes up — made by the wings as they move through the air.</li>
        <li>{{Weight}} pulls down — gravity acting on the aircraft.</li>
        <li>{{Thrust}} pushes forward — from propellers or jet engines.</li>
        <li>{{Drag}} pulls back — air resistance.</li>
      </ul>
      <p>In steady, level flight: <b>lift = weight</b> and <b>thrust = drag</b>. To climb, you need extra lift (or thrust); to speed up, thrust must exceed drag.</p>
      <h4>How does a wing make lift?</h4>
      <p>A wing (an {{Airfoil|airfoil}}) is shaped and tilted so it deflects air downward. Pushing air down pushes the wing up (Newton's third law), and at the same time the air pressure above the wing drops below the pressure underneath. The tilt of the wing against the oncoming air is called the {{AoA|angle of attack}}.</p>
      <p>More angle of attack = more lift … up to a point. Past the <b>critical angle</b> (about 15–18°) the airflow can no longer follow the top of the wing, it separates, and lift collapses. That's a {{Stall|stall}} — and it can happen at any speed.</p>
      <p class="tip">Stall recovery is counter-intuitive: lower the nose to reduce the angle of attack, even though the ground is below you.</p>`,
    check: { q: "In steady level flight, lift is equal to…", o: ["Thrust", "Weight", "Drag", "Twice the weight"], a: 1, why: "Lift balances weight; thrust balances drag." },
  },
  {
    title: "Flight controls & the three axes", mins: 4,
    html: `
      <p>An aircraft can rotate around three axes, all passing through its {{Centre of gravity|centre of gravity}}:</p>
      <table><tr><th>Movement</th><th>Axis</th><th>Control surface</th><th>Pilot input</th></tr>
        <tr><td>{{Pitch}} — nose up/down</td><td>Lateral (wingtip to wingtip)</td><td>{{Elevator}}</td><td>Yoke/stick forward & back</td></tr>
        <tr><td>{{Roll}} — bank left/right</td><td>Longitudinal (nose to tail)</td><td>{{Aileron|Ailerons}}</td><td>Yoke turn / stick left & right</td></tr>
        <tr><td>{{Yaw}} — nose left/right</td><td>Vertical</td><td>{{Rudder}}</td><td>Rudder pedals</td></tr></table>
      <p>Secondary controls change the wing's shape or help the pilot:</p>
      <ul>
        <li>{{Flaps}} — extend to fly slower and land steeper.</li>
        <li>{{Slats}} — leading-edge devices to delay the stall.</li>
        <li>{{Spoilers}} — kill lift and add drag; help descent and braking.</li>
        <li>{{Trim}} — removes control pressure so the aircraft holds an attitude hands-off.</li>
      </ul>
      <p><b>How do you turn?</b> Not with the rudder alone! You <i>bank</i> with the ailerons so part of the lift points sideways, and add a little rudder to cancel {{Adverse yaw|adverse yaw}}. Back pressure on the elevator keeps the nose from dropping.</p>
      <p><a href="#academy" data-open-tool="axes">▶ Try the interactive Pitch · Roll · Yaw tool</a></p>`,
    check: { q: "Which control surface is moved by the rudder pedals?", o: ["Aileron", "Elevator", "Rudder", "Flaps"], a: 2, why: "The pedals move the rudder on the vertical tail, controlling yaw." },
  },
  {
    title: "Inside the cockpit", mins: 4,
    html: `
      <p>The classic training cockpit has the <b>{{Six pack|six pack}}</b> of instruments:</p>
      <table><tr><td>{{ASI|Airspeed indicator}}</td><td>{{Attitude indicator}}</td><td>{{Altimeter}}</td></tr>
        <tr><td>{{Turn coordinator}}</td><td>{{Heading indicator}}</td><td>{{VSI|Vertical speed indicator}}</td></tr></table>
      <p>The airspeed indicator, altimeter and VSI work on air pressure from the {{Pitot tube|pitot tube}} and {{Static port|static ports}}. The attitude, heading and turn instruments traditionally use gyroscopes.</p>
      <p>Modern aircraft have a {{Glass cockpit|glass cockpit}}: a {{PFD}} combines the six pack on one screen and an {{MFD}} shows the moving map, weather and engine data.</p>
      <p>Airliners add safety systems that talk to the crew:</p>
      <ul>
        <li>{{TCAS}} — detects other aircraft and commands "Climb!" or "Descend!" to avoid collisions.</li>
        <li>{{TAWS}} — warns "Terrain, pull up!" if heading toward the ground.</li>
        <li>{{Autopilot}} and {{FMS}} — fly the route, but pilots are always monitoring.</li>
      </ul>`,
    check: { q: "Which instrument would fail if the pitot tube got blocked by ice?", o: ["Attitude indicator", "Airspeed indicator", "Heading indicator", "Magnetic compass"], a: 1, why: "The ASI needs ram air pressure from the pitot tube." },
  },
  {
    title: "Talking on the radio: VHF, HF, UHF & PMR", mins: 7, atc: true,
    html: `
      <p>Aviation radio is split by frequency band. Here are the main players:</p>
      <table><tr><th>Band</th><th>Range</th><th>Aviation use</th></tr>
        <tr><td>{{HF}}</td><td>3–30 MHz</td><td>Long-range voice over oceans — bounces off the ionosphere</td></tr>
        <tr><td>{{VHF}}</td><td>30–300 MHz</td><td><b>Main civil voice band 118–137 MHz</b>, VOR & ILS localizer 108–118 MHz</td></tr>
        <tr><td>{{UHF}}</td><td>300 MHz–3 GHz</td><td>Military voice 225–400 MHz, glideslope, DME, transponder, GPS</td></tr>
        <tr><td>{{PMR}} (PMR446)</td><td>446.0–446.2 MHz</td><td><b>Not aviation!</b> Licence-free walkie-talkies for the public</td></tr></table>
      <h4>Why VHF range depends on altitude</h4>
      <p>VHF travels in straight lines, so the curve of the Earth blocks it. A rule of thumb: <b>range (NM) ≈ 1.23 × √altitude (ft)</b>.</p>
      <div class="check-q">
        <label>Aircraft altitude: <b id="losAltV">5,000 ft</b></label>
        <input type="range" id="losAlt" min="0" max="41000" step="500" value="5000" style="padding:0;accent-color:var(--accent)">
        <p style="margin:.5rem 0 0">Approximate VHF range: <b id="losOut" style="color:var(--accent)"></b></p>
      </div>
      <h4>PMR vs. airband — what's the difference?</h4>
      <p>{{PMR}} means Private/Professional Mobile Radio. <b>PMR446</b> handhelds are cheap, licence-free and FM, limited to 0.5 W. They're great for hiking or coordinating a team on the ground, but transmitting to aircraft on them is not possible or legal. Aviation radios use <b>AM</b> on the {{Airband|airband}} and need a licence (and, for the pilot, a radio operator certificate).</p>
      <h4>Speaking the language</h4>
      <p>Letters use the {{Phonetic alphabet|phonetic alphabet}} and messages follow a standard order: <i>who you're calling, who you are, where you are, what you want</i>.</p>
      <div class="tip" style="font-family:Consolas,monospace;font-size:.92rem">
        PILOT: "Oxford Tower, Golf Alpha Bravo Charlie Delta, holding point runway 19, ready for departure."<br>
        TOWER: "Golf Charlie Delta, runway 19, cleared for take-off, wind 210 degrees 8 knots."<br>
        PILOT: "Runway 19, cleared for take-off, Golf Charlie Delta."
      </div>
      <p>Notice the {{Readback|readback}} — the pilot repeats the runway and clearance. Other key words: {{Roger}}, {{Wilco}}, "Say again", "Standby", "Affirm" (yes), "Negative" (no).</p>
      <p>Emergencies: {{Mayday}} for distress, {{Pan-Pan}} for urgency, and the {{Guard|guard frequency}} 121.5 MHz is monitored worldwide. Codes on the {{Squawk|transponder}}: 7700 emergency, 7600 radio failure, 7500 hijack.</p>
      <p><a href="#atc" data-open-tool="spectrum">▶ See all bands on the interactive radio spectrum</a></p>`,
    check: { q: "Can you use a PMR446 walkie-talkie to talk to the control tower?", o: ["Yes, on channel 1", "Yes, if you hold it high", "No — it's not an aviation band", "Only in an emergency"], a: 2, why: "PMR446 is a licence-free UHF FM band for the public; ATC uses AM on the VHF airband (118–137 MHz)." },
  },
  {
    title: "Navigation: finding your way", mins: 6,
    html: `
      <p>Flights follow one of two sets of rules:</p>
      <ul><li>{{VFR}} — look outside, navigate by landmarks and maps, see and avoid other traffic.</li>
          <li>{{IFR}} — fly by instruments and ATC clearances; can fly in cloud.</li></ul>
      <h4>Ground-based radio aids</h4>
      <ul>
        <li>{{VOR}} — tells you which {{Radial|radial}} (bearing) you're on from a station.</li>
        <li>{{DME}} — tells you how far you are from it, in {{Nautical mile|nautical miles}}.</li>
        <li>{{NDB}} + {{ADF}} — an older beacon your needle points at.</li>
        <li>{{ILS}} — guides you to the runway with a {{Localizer|localizer}} (left/right) and a {{Glideslope|glideslope}} (up/down).</li>
      </ul>
      <h4>Satellites</h4>
      <p>Today most navigation uses {{GNSS}} (GPS, Galileo…). With {{RNAV}} aircraft fly direct between {{Waypoint|waypoints}}, and {{RNP}} adds integrity monitoring for very precise curved approaches. Departures and arrivals follow published {{SID|SIDs}} and {{STAR|STARs}}.</p>
      <h4>Heading vs. track</h4>
      <p>Wind pushes the aircraft sideways. The {{Heading|heading}} is where the nose points; the {{Track|track}} is where you actually go over the ground. With a wind from the left, you point the nose a little left of your desired track — this is called the <b>wind correction angle</b>.</p>`,
    check: { q: "Which ILS component gives up/down guidance?", o: ["Localizer", "Glideslope", "DME", "VOR"], a: 1, why: "The glideslope gives vertical guidance (usually 3°); the localizer gives lateral guidance." },
  },
  {
    title: "Weather for pilots", mins: 6,
    html: `
      <p>Weather is a top cause of accidents, so pilots get very specific reports:</p>
      <ul><li>{{METAR}} — current weather at an airport.</li><li>{{TAF}} — forecast for an airport.</li><li>{{SIGMET}} — warnings of hazardous weather.</li></ul>
      <p>A METAR looks scary but is simple once decoded:</p>
      <div class="tip" style="font-family:Consolas,monospace">EGLL 061150Z 24012KT 9999 FEW030 SCT045 14/08 Q1018</div>
      <table>
        <tr><td><code>EGLL</code></td><td>London Heathrow ({{ICAO}} code)</td></tr>
        <tr><td><code>061150Z</code></td><td>6th of the month, 11:50 {{Zulu time|UTC}}</td></tr>
        <tr><td><code>24012KT</code></td><td>Wind from 240° at 12 knots</td></tr>
        <tr><td><code>9999</code></td><td>Visibility 10 km or more</td></tr>
        <tr><td><code>FEW030 SCT045</code></td><td>Few clouds at 3,000 ft, scattered at 4,500 ft (see {{Okta|oktas}})</td></tr>
        <tr><td><code>14/08</code></td><td>Temperature 14 °C, {{Dew point|dew point}} 8 °C</td></tr>
        <tr><td><code>Q1018</code></td><td>{{QNH}} 1018 hPa</td></tr>
      </table>
      <h4>Hazards</h4>
      <ul>
        <li>{{Cumulonimbus}} — thunderstorms: turbulence, hail, lightning, icing. Stay far away.</li>
        <li>{{Icing}} — ice destroys the wing's shape.</li>
        <li>{{Wind shear}} — sudden wind changes near the ground.</li>
        <li>Low {{Ceiling|ceilings}} and fog — you can't see the runway.</li>
        <li>{{Density altitude|High density altitude}} — hot & high airports reduce performance.</li>
      </ul>
      <p><a href="#academy" data-open-tool="metar">▶ Decode a real METAR with the Academy tools</a></p>`,
    check: { q: "In a METAR, what does 'OVC' mean?", o: ["1–2 oktas", "3–4 oktas", "5–7 oktas", "8 oktas — full cover"], a: 3, why: "OVC = overcast, 8/8 of the sky covered." },
  },
  {
    title: "Airports & airspace", mins: 5,
    html: `
      <p><b>{{Runway numbers}}</b> are the magnetic direction divided by 10: runway 09 points east, 27 points west. Parallel runways get L/C/R.</p>
      <ul>
        <li>{{Threshold}} — white piano-key stripes where the landing area starts.</li>
        <li>{{Taxiway|Taxiways}} — yellow centreline, blue edge lights, named by letters.</li>
        <li>Holding points — double yellow lines (solid + dashed). Never cross without a clearance: {{Hold short|hold short}}.</li>
        <li>{{Apron}} — where aircraft park.</li>
      </ul>
      <p>At small airfields, pilots fly a rectangular {{Circuit|circuit}}: upwind → crosswind → downwind → base → final.</p>
      <h4>Airspace</h4>
      <p>The sky is divided into {{Airspace classes|airspace classes}} A–G. Busy airports have a {{CTR}} from the ground up and a {{TMA}} above. Entering controlled airspace needs a clearance from {{ATC}}. Uncontrolled class G lets you fly VFR without talking to anyone — though it's wise to talk on the {{CTAF}}.</p>
      <p>Above the {{Transition altitude|transition altitude}}, everyone sets {{Standard pressure|1013 hPa}} and altitudes become {{Flight level|flight levels}} — FL350 = 35,000 ft.</p>`,
    check: { q: "Runway 09 points roughly towards…", o: ["North", "East", "South", "West"], a: 1, why: "09 = 090° = east. The opposite end is runway 27." },
  },
  {
    title: "A flight from gate to gate", mins: 5,
    html: `
      <ol>
        <li><b>Preflight</b> — weather ({{METAR}}, {{TAF}}), {{NOTAM|NOTAMs}}, fuel, weight & balance, walk-around inspection.</li>
        <li><b>Clearance</b> — listen to {{ATIS}}, get the IFR clearance: route, {{SID}}, initial altitude, {{Squawk|squawk code}}.</li>
        <li><b>{{Pushback}} & start</b> — {{APU}} supplies air to start the engines.</li>
        <li><b>Taxi</b> — Ground control gives the route along taxiways to the holding point.</li>
        <li><b>Take-off</b> — Tower clears for take-off. Callouts: "{{V1}}" (committed to fly), "Rotate" ({{VR}}), positive climb, gear up. {{V2}} is the safe climb speed.</li>
        <li><b>Climb</b> — through the {{Transition altitude|transition altitude}}, set standard pressure. Departure → Area control.</li>
        <li><b>Cruise</b> — typically FL350–FL410 at about {{Mach}} 0.78–0.85. Over oceans, {{HF}} or {{CPDLC}}.</li>
        <li><b>Descent & approach</b> — follow a {{STAR}}, then intercept the {{ILS}}.</li>
        <li><b>Landing</b> — at about {{Vref}}; spoilers deploy, reversers and brakes. If anything isn't right: {{Go-around|go-around}}.</li>
        <li><b>Taxi in</b> — Ground control guides you to the gate. Shut down, paperwork, done! 🎉</li>
      </ol>`,
    check: { q: "What happens if an engine fails AFTER V1?", o: ["Abort the take-off", "Continue the take-off", "Return to the gate", "Turn off the other engine"], a: 1, why: "After V1 there isn't enough runway left to stop safely, so the crew continues and deals with the failure airborne." },
  },
];

// ---- ATC & Communications lessons ----
const ATC_EXTRA_LESSONS = [
  {
    title: "Who's who in Air Traffic Control", mins: 4,
    html: `
      <p>{{ATC}} is split into units, each responsible for one phase of flight. A pilot is "handed off" from one to the next, changing frequency each time:</p>
      <table><tr><th>Unit</th><th>Responsible for</th></tr>
        <tr><td>Clearance Delivery</td><td>Route clearance before start-up</td></tr>
        <tr><td>Ground</td><td>Pushback and taxiing</td></tr>
        <tr><td>Tower</td><td>Runways, take-offs, landings, the {{Circuit|circuit}}</td></tr>
        <tr><td>Approach / Departure</td><td>Radar sequencing around busy airports ({{TMA}})</td></tr>
        <tr><td>Area Control (Center)</td><td>En-route traffic at high altitude</td></tr></table>
      <p>Before calling anyone, pilots listen to the {{ATIS}} recording. At small airfields without a tower, there may be an information service or just a {{CTAF}} where pilots announce their own positions.</p>
      <p>Controllers keep aircraft apart using <b>separation</b> standards — for example 1,000 ft vertically, or several miles horizontally on radar. The {{Transponder|transponder}} {{Squawk|squawk code}} lets them identify each blip.</p>`,
    check: { q: "Who gives you permission to take off?", o: ["Ground", "Tower", "Clearance Delivery", "Area Control"], a: 1, why: "Tower controls the runway and issues take-off and landing clearances." },
  },
  {
    title: "Phraseology: speaking like a pilot", mins: 5,
    html: `
      <p>Radio time is precious and mistakes are dangerous, so aviation uses a fixed vocabulary:</p>
      <table><tr><th>Say</th><th>Meaning</th></tr>
        <tr><td>{{Roger}}</td><td>I have received all of your last transmission</td></tr>
        <tr><td>{{Wilco}}</td><td>I understand and will comply</td></tr>
        <tr><td>Affirm</td><td>Yes (never "affirmative" in ICAO phraseology — it can be confused with "negative")</td></tr>
        <tr><td>Negative</td><td>No / not correct</td></tr>
        <tr><td>Say again</td><td>Repeat your message (never "repeat" — that's a military artillery term)</td></tr>
        <tr><td>Standby</td><td>Wait, I will call you back</td></tr>
        <tr><td>Correction</td><td>I made an error; the correct version is…</td></tr></table>
      <h4>Numbers</h4>
      <ul>
        <li>Altitudes: "<b>flight level three five zero</b>" (FL350), "<b>altitude four thousand feet</b>".</li>
        <li>Headings: "<b>heading two seven zero</b>" — always three digits.</li>
        <li>Frequencies: "<b>one two one decimal five</b>" (121.5).</li>
        <li>Special digits: tree (3), fife (5), niner (9) — see the {{Phonetic alphabet|phonetic alphabet}}.</li>
      </ul>
      <h4>Readbacks</h4>
      <p>Safety-critical items must be read back: runway and take-off/landing clearances, {{Hold short|hold short}} instructions, altitudes, headings, speeds, frequencies and squawk codes. The callsign goes at the end of a readback. Try the radio practice below!</p>`,
    check: { q: "How do you ask a controller to repeat their message?", o: ["Repeat", "Say again", "Come again", "What?"], a: 1, why: "'Say again' is the standard phrase. 'Repeat' is avoided because in military use it means fire the same artillery again." },
  },
  {
    title: "Emergencies & the transponder", mins: 4,
    html: `
      <p>Two levels of emergency call exist:</p>
      <ul>
        <li>{{Mayday}} ×3 — <b>distress</b>: grave and imminent danger (engine failure over water, fire).</li>
        <li>{{Pan-Pan}} ×3 — <b>urgency</b>: serious but not immediately dangerous (sick passenger, lost, minor fault).</li>
      </ul>
      <p>A Mayday call follows a pattern: <i>Mayday ×3 → station called → callsign → nature of emergency → intentions → position, level, heading → persons on board</i>. If you're unsure who to call, use the {{Guard|guard frequency}} <b>121.5 MHz</b>.</p>
      <h4>Transponder emergency codes</h4>
      <table><tr><th>Squawk</th><th>Meaning</th><th>Memory aid</th></tr>
        <tr><td>7500</td><td>Hijack</td><td>"Seventy-five, man with a knife"</td></tr>
        <tr><td>7600</td><td>Radio failure</td><td>"Seventy-six, radio's in a fix"</td></tr>
        <tr><td>7700</td><td>Emergency</td><td>"Seventy-seven, going to heaven"</td></tr></table>
      <p>An {{ELT}} activates automatically in a crash, transmitting on 406 MHz to satellites so rescuers can find the aircraft.</p>`,
    check: { q: "Which squawk code means radio failure?", o: ["7500", "7600", "7700", "1200"], a: 1, why: "7600 = lost communications. 7500 is hijack and 7700 is general emergency." },
  },
];
const ACADEMY_LESSONS = LESSONS.filter((l) => !l.atc);
const ATC_LESSONS = [ATC_EXTRA_LESSONS[0], LESSONS.find((l) => l.atc), ATC_EXTRA_LESSONS[1], ATC_EXTRA_LESSONS[2]];

// Lesson progress is stored by title. Migrate the old index-based format once.
(function migrateLessonProgress() {
  const old = store.get("lessons", []);
  if (old.length && typeof old[0] === "number") store.set("lessons", old.map((i) => LESSONS[i] && LESSONS[i].title).filter(Boolean));
})();

function renderLessons(container, list, barId) {
  const done = store.get("lessons", []);
  const root = $(container);
  root.innerHTML = list.map((l, i) => `
    <details class="card lesson ${done.includes(l.title) ? "done" : ""}" data-i="${i}">
      <summary><span class="num">${done.includes(l.title) ? "✓" : String(i + 1).padStart(2, "0")}</span>${esc(l.title)}<span class="meta">${l.mins} min</span></summary>
      <div class="lesson-body">
        ${linkify(l.html)}
        <div class="check-q"><b>Quick check:</b> ${esc(l.check.q)}
          <div class="opts">${l.check.o.map((o, j) => `<button class="chip" data-j="${j}">${esc(o)}</button>`).join("")}</div>
          <div class="cq-fb"></div>
        </div>
        <div class="row end"><button class="btn mark">${done.includes(l.title) ? "✓ Completed" : "Mark complete (+20 XP)"}</button></div>
      </div>
    </details>`).join("");
  const updateBar = () => {
    const d = store.get("lessons", []);
    const pct = Math.round(list.filter((l) => d.includes(l.title)).length / list.length * 100);
    $("#" + barId + "Bar").style.width = pct + "%";
    $("#" + barId + "Pct").textContent = pct + "%";
  };
  updateBar();

  $$(".lesson", root).forEach((el) => {
    const l = list[+el.dataset.i];
    let tried = false;
    $$(".opts .chip", el).forEach((b) => b.onclick = () => {
      const ok = +b.dataset.j === l.check.a;
      $(".cq-fb", el).innerHTML = `<p style="margin:.6rem 0 0">${ok ? "✅ Correct!" : "❌ Not quite."} ${esc(l.check.why)}</p>`;
      b.style.borderColor = ok ? "var(--accent)" : "var(--red)";
      if (ok && !tried) addXP(5, "First-try answer");
      tried = true;
    });
    $(".mark", el).onclick = () => {
      const d = store.get("lessons", []);
      if (d.includes(l.title)) return;
      d.push(l.title); store.set("lessons", d);
      el.classList.add("done"); $(".num", el).textContent = "✓"; $(".mark", el).textContent = "✓ Completed";
      addXP(20, "Lesson complete");
      updateBar();
    };
  });

  // radio range calculator (lives inside the radio lesson)
  const los = $("#losAlt", root);
  if (los) {
    const upd = () => {
      const h = +los.value;
      $("#losAltV").textContent = h.toLocaleString() + " ft";
      const nm = 1.23 * Math.sqrt(h);
      $("#losOut").textContent = h === 0 ? "only a few NM (ground level — blocked by terrain and buildings)" : `${Math.round(nm)} NM (${Math.round(nm * 1.852)} km)`;
    };
    los.oninput = upd; upd();
  }
}
// links like "Try the tool" inside lessons
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-open-tool]");
  if (a) setTimeout(() => showTool(a.dataset.openTool, true), 80);
});

// ================= GLOSSARY =================
const gState = { cat: "all" };
function renderGlossaryFilters() {
  const cats = [["all", "All"], ["fav", "★ Favourites"], ...Object.entries(CATEGORIES), ["custom", "✎ My terms"]];
  $("#gFilters").innerHTML = cats.map(([k, v]) => `<button class="chip ${gState.cat === k ? "active" : ""}" data-cat="${k}">${esc(v)}</button>`).join("");
  $$("#gFilters .chip").forEach((b) => b.onclick = () => { gState.cat = b.dataset.cat; renderGlossaryFilters(); renderGlossary(); });
}
function highlight(text, q) {
  const e = esc(text);
  if (!q) return e;
  return e.replace(new RegExp("(" + reEsc(esc(q)) + ")", "gi"), "<mark>$1</mark>");
}
function renderGlossary() {
  const q = $("#gSearch").value.trim();
  const ql = q.toLowerCase();
  const favs = store.get("fav", []);
  let list = allTerms().filter((x) => {
    if (gState.cat === "fav" && !favs.includes(x.t)) return false;
    if (gState.cat === "custom" && !x.custom) return false;
    if (!["all", "fav", "custom"].includes(gState.cat) && x.c !== gState.cat) return false;
    if (!ql) return true;
    return x.t.toLowerCase().includes(ql) || (x.f || "").toLowerCase().includes(ql) || x.d.toLowerCase().includes(ql);
  });
  // rank: exact term > term starts > term contains > full form > definition
  const score = (x) => {
    if (!ql) return 0;
    const t = x.t.toLowerCase();
    if (t === ql) return 0; if (t.startsWith(ql)) return 1; if (t.includes(ql)) return 2;
    if ((x.f || "").toLowerCase().includes(ql)) return 3; return 4;
  };
  const sort = $("#gSort").value;
  list.sort((a, b) => score(a) - score(b) ||
    (sort === "cat" ? (a.c > b.c ? 1 : a.c < b.c ? -1 : 0) : 0) ||
    a.t.localeCompare(b.t, undefined, { sensitivity: "base" }));

  $("#gCount").textContent = `${list.length} term${list.length === 1 ? "" : "s"}`;
  $("#gList").innerHTML = list.length ? list.map((x) => `
    <div class="card term" data-term="${esc(x.t)}">
      <button class="fav ${favs.includes(x.t) ? "on" : ""}" data-fav="${esc(x.t)}" title="Save to favourites">${favs.includes(x.t) ? "★" : "☆"}</button>
      <h3>${highlight(x.t, q)}</h3>
      ${x.f ? `<div class="full">${highlight(x.f, q)}</div>` : ""}
      <p>${highlight(x.d, q)}</p>
      <span class="badge ${x.custom ? "custom" : ""}">${esc(CATEGORIES[x.c] || "Other")}${x.custom ? " · yours" : ""}</span>
    </div>`).join("")
    : `<div class="empty">No terms found for "<b>${esc(q)}</b>".<br><br><button class="btn ghost small" id="emptyAdd">+ Add "${esc(q)}" as your own term</button></div>`;
  const ea = $("#emptyAdd");
  if (ea) ea.onclick = () => { showAddForm(); $("#addTermForm [name=t]").value = q; };
}
$("#gList").addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) { e.stopPropagation(); toggleFav(fav.dataset.fav); return; }
  const card = e.target.closest(".term");
  if (card) openTerm(card.dataset.term);
});
$("#gSearch").addEventListener("input", renderGlossary);
$("#gSort").addEventListener("change", renderGlossary);

function showAddForm() {
  const f = $("#addTermForm");
  f.classList.remove("hidden");
  $("[name=t]", f).focus();
}
$("#addTermForm [name=c]").innerHTML = Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
$("#addTermBtn").onclick = showAddForm;
$("#cancelAdd").onclick = () => { $("#addTermForm").classList.add("hidden"); $("#addTermForm").reset(); };
$("#addTermForm").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const t = fd.get("t").trim(), d = fd.get("d").trim();
  if (!t || !d) return;
  if (GLOSSARY.some((x) => x.t.toLowerCase() === t.toLowerCase())) { toast(`"${t}" already exists — open it from the list`); return; }
  const custom = store.get("custom", []).filter((x) => x.t.toLowerCase() !== t.toLowerCase());
  custom.push({ t, f: fd.get("f").trim(), c: fd.get("c"), d });
  store.set("custom", custom);
  e.target.reset(); e.target.classList.add("hidden");
  addXP(5, "Term added");
  renderGlossary();
};

// ================= TOOLS =================
// Each page has <div class="tool-group" data-tools="a,b,c">; move the matching panels from #toolbox into it and build tabs.
$$(".tool-group").forEach((g) => {
  const names = g.dataset.tools.split(",");
  const tabs = document.createElement("div");
  tabs.className = "tool-tabs";
  tabs.innerHTML = names.map((n, i) => `<button data-tool="${n}" class="${i === 0 ? "active" : ""}">${esc($("#tool-" + n).dataset.label)}</button>`).join("");
  g.appendChild(tabs);
  names.forEach((n, i) => { const p = $("#tool-" + n); p.classList.toggle("hidden", i !== 0); g.appendChild(p); });
  tabs.addEventListener("click", (e) => { const b = e.target.closest("button[data-tool]"); if (b) showTool(b.dataset.tool); });
});
function showTool(name, scroll) {
  const panel = $("#tool-" + name);
  const g = panel && panel.closest(".tool-group");
  if (!g) return;
  $$(".tool-tabs button", g).forEach((b) => b.classList.toggle("active", b.dataset.tool === name));
  $$(".tool", g).forEach((t) => t.classList.toggle("hidden", t !== panel));
  if (scroll) g.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- Phonetic ----
function renderPhonetic() {
  const v = $("#phInput").value.toUpperCase();
  const parts = [];
  for (const ch of v) {
    if (PHONETIC[ch]) parts.push(`<span class="ph-word"><b>${esc(ch)}</b> ${PHONETIC[ch]}</span>`);
    else if (ch === " ") parts.push(`<span class="ph-gap"></span>`);
  }
  $("#phOut").innerHTML = parts.join("") || `<span class="sub">Type something above…</span>`;
}
$("#phInput").addEventListener("input", renderPhonetic);
$("#phSpeak").onclick = () => {
  const words = [...$("#phInput").value.toUpperCase()].map((c) => PHONETIC[c]).filter(Boolean);
  if (words.length) speak(words.join(", "));
};
$("#phGrid").innerHTML = Object.entries(PHONETIC).filter(([k]) => /[A-Z0-9]/.test(k))
  .map(([k, v]) => `<button class="ph-tile" data-w="${v}"><b>${k}</b>${v}</button>`).join("");
$("#phGrid").addEventListener("click", (e) => { const t = e.target.closest(".ph-tile"); if (t) speak(t.dataset.w); });

// ---- METAR decoder ----
const WX = {
  intensity: { "-": "light", "+": "heavy", VC: "in the vicinity:" },
  desc: { MI: "shallow", BC: "patches of", PR: "partial", DR: "low drifting", BL: "blowing", SH: "showers of", TS: "thunderstorm with", FZ: "freezing" },
  phen: { DZ: "drizzle", RA: "rain", SN: "snow", SG: "snow grains", IC: "ice crystals", PL: "ice pellets", GR: "hail", GS: "small hail", UP: "unknown precipitation",
    BR: "mist", FG: "fog", FU: "smoke", VA: "volcanic ash", DU: "dust", SA: "sand", HZ: "haze", PY: "spray", PO: "dust whirls", SQ: "squalls", FC: "funnel cloud / tornado", SS: "sandstorm", DS: "duststorm" },
};
const CLOUD = { FEW: "Few (1–2 oktas)", SCT: "Scattered (3–4 oktas)", BKN: "Broken (5–7 oktas)", OVC: "Overcast (8 oktas)", VV: "Sky obscured — vertical visibility" };

function decodeMetar(raw) {
  const tok = raw.toUpperCase().replace(/=$/, "").trim().split(/\s+/).filter(Boolean);
  const rows = [];
  let ceiling = Infinity, visSM = null, trend = false, station = null, wind = null, temp = null;
  const add = (code, text, unk) => rows.push({ code, text: (trend ? "↳ (forecast change) " : "") + text, unk });
  for (let i = 0; i < tok.length; i++) {
    const t = tok[i];
    let m;
    if (t === "METAR" || t === "SPECI") { add(t, t === "SPECI" ? "Special (non-routine) report" : "Routine weather report"); continue; }
    if (t === "AUTO") { add(t, "Fully automated observation (no human observer)"); continue; }
    if (t === "COR") { add(t, "Corrected report"); continue; }
    if (!station && /^[A-Z]{4}$/.test(t)) { station = t; add(t, `Airport ICAO code: ${t}`); continue; }
    if ((m = t.match(/^(\d{2})(\d{2})(\d{2})Z$/))) { add(t, `Observed on day ${+m[1]} of the month at ${m[2]}:${m[3]} UTC (Zulu)`); continue; }
    if (t === "00000KT") { add(t, "Wind calm"); wind = { calm: true }; continue; }
    if ((m = t.match(/^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/))) {
      const unit = { KT: "knots", MPS: "m/s", KMH: "km/h" }[m[4]];
      const dir = m[1] === "VRB" ? "variable direction" : `from ${m[1]}°`;
      add(t, `Wind ${dir} at ${+m[2]} ${unit}${m[3] ? `, gusting to ${+m[3]} ${unit}` : ""}`);
      if (!trend) wind = { dir: m[1], spd: +m[2], gust: m[3] ? +m[3] : null };
      continue;
    }
    if ((m = t.match(/^(\d{3})V(\d{3})$/))) { add(t, `Wind direction varying between ${m[1]}° and ${m[2]}°`); continue; }
    if (t === "CAVOK") { add(t, "Ceiling And Visibility OK — visibility 10 km+, no cloud below 5,000 ft, no significant weather"); if (!trend) visSM = 10; continue; }
    if ((m = t.match(/^(\d{4})(NDV)?$/))) {
      const v = +m[1];
      add(t, v === 9999 ? "Visibility 10 km or more" : `Visibility ${v >= 1000 ? (v / 1000) + " km" : v + " m"}`);
      if (!trend) visSM = v / 1609;
      continue;
    }
    if (/^\d$/.test(t) && /^\d\/\dSM$/.test(tok[i + 1] || "")) {
      const [a, b] = tok[i + 1].replace("SM", "").split("/");
      const v = +t + a / b; add(t + " " + tok[i + 1], `Visibility ${v} statute miles`);
      if (!trend) visSM = v; i++; continue;
    }
    if ((m = t.match(/^(M|P)?(\d+(?:\/\d+)?)SM$/))) {
      const v = m[2].includes("/") ? m[2].split("/")[0] / m[2].split("/")[1] : +m[2];
      add(t, `Visibility ${m[1] === "M" ? "less than " : m[1] === "P" ? "more than " : ""}${v} statute mile${v === 1 ? "" : "s"}`);
      if (!trend) visSM = v; continue;
    }
    if ((m = t.match(/^R(\d{2}[LCR]?)\/([PM])?(\d{4})(?:V([PM])?(\d{4}))?(FT)?\/?([UDN])?$/))) {
      const u = m[6] ? "ft" : "m";
      const tr = { U: ", improving", D: ", getting worse", N: ", no change" }[m[7]] || "";
      add(t, `Runway ${m[1]} visual range ${m[2] === "P" ? "more than " : m[2] === "M" ? "less than " : ""}${+m[3]} ${u}${m[5] ? ` varying to ${+m[5]} ${u}` : ""}${tr}`);
      continue;
    }
    if ((m = t.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3}|\/\/\/)(CB|TCU|\/\/\/)?$/))) {
      const h = m[2] === "///" ? null : +m[2] * 100;
      const extra = m[3] === "CB" ? " — CUMULONIMBUS (thunderstorm cloud) ⚠" : m[3] === "TCU" ? " — towering cumulus" : "";
      add(t, `${CLOUD[m[1]]} ${h === null ? "at unknown height" : `at ${h.toLocaleString()} ft above the airport`}${extra}`);
      if (!trend && ["BKN", "OVC", "VV"].includes(m[1]) && h !== null) ceiling = Math.min(ceiling, h);
      continue;
    }
    if (["NSC", "SKC", "CLR", "NCD"].includes(t)) { add(t, { NSC: "No significant cloud", SKC: "Sky clear", CLR: "No clouds detected below 12,000 ft", NCD: "No cloud detected" }[t]); continue; }
    if ((m = t.match(/^(M?\d{2})\/(M?\d{2})?$/))) {
      const c = (s) => (s.startsWith("M") ? -s.slice(1) : +s);
      const T = c(m[1]);
      add(t, `Temperature ${T} °C${m[2] ? `, dew point ${c(m[2])} °C` : ""}${m[2] && T - c(m[2]) <= 2 ? " — close spread, fog/mist likely" : ""}`);
      if (!trend) temp = T;
      continue;
    }
    if ((m = t.match(/^Q(\d{4})$/))) { add(t, `QNH ${+m[1]} hPa (≈ ${(m[1] / 33.8639).toFixed(2)} inHg)`); continue; }
    if ((m = t.match(/^A(\d{4})$/))) { const v = m[1] / 100; add(t, `Altimeter ${v.toFixed(2)} inHg (≈ ${Math.round(v * 33.8639)} hPa)`); continue; }
    if (t === "NOSIG") { add(t, "No significant change expected in the next 2 hours"); continue; }
    if (t === "TEMPO" || t === "BECMG") { trend = false; add(t, t === "TEMPO" ? "TEMPORARILY (for periods within the next 2 hours):" : "BECOMING (permanent change expected):"); trend = true; continue; }
    if ((m = t.match(/^(FM|TL|AT)(\d{4})$/))) { add(t, `${{ FM: "From", TL: "Until", AT: "At" }[m[1]]} ${m[2].slice(0, 2)}:${m[2].slice(2)} UTC`); continue; }
    if (t === "RMK") { trend = false; add(tok.slice(i).join(" "), "Remarks — extra local information (e.g. AO2 = automated station with precipitation sensor)"); break; }
    if ((m = t.match(/^(-|\+|VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)*)$/)) && (m[2] || m[3])) {
      const phen = (m[3].match(/../g) || []).map((p) => WX.phen[p]).join(" and ");
      let txt = [m[1] ? WX.intensity[m[1]] : (m[3] && /DZ|RA|SN|SG|PL|GR|GS/.test(m[3]) ? "moderate" : ""), m[2] ? WX.desc[m[2]] : "", phen].filter(Boolean).join(" ");
      if (m[2] === "TS" && !phen) txt = (m[1] ? WX.intensity[m[1]] + " " : "") + "thunderstorm";
      if (m[2] === "SH" && !phen) txt = (m[1] ? WX.intensity[m[1]] + " " : "") + "showers";
      add(t, "Weather: " + txt.charAt(0).toUpperCase() + txt.slice(1) + (m[2] === "TS" ? " ⚡" : ""));
      continue;
    }
    if (t === "NSW") { add(t, "No significant weather"); continue; }
    add(t, "Not recognised by this simple decoder", true);
  }
  // flight category (US-style)
  let cat = null;
  if (visSM !== null || ceiling !== Infinity) {
    const v = visSM ?? 10;
    if (ceiling < 500 || v < 1) cat = ["LIFR", "#be185d", "Low IFR — very poor conditions"];
    else if (ceiling < 1000 || v < 3) cat = ["IFR", "#ec4899", "Instrument conditions — no VFR flying"];
    else if (ceiling <= 3000 || v <= 5) cat = ["MVFR", "#60a5fa", "Marginal VFR — be careful"];
    else cat = ["VFR", "#2563eb", "Good visual flying conditions"];
  }
  return { rows, cat, ceiling, station, wind, temp };
}
function renderMetar() {
  const r = decodeMetar($("#metarIn").value);
  if (!r.rows.length) { $("#metarOut").innerHTML = ""; return; }
  const sum = [];
  if (r.station) sum.push(`<b>${esc(r.station)}</b>`);
  if (r.wind) sum.push(r.wind.calm ? "calm wind" : `wind ${r.wind.dir === "VRB" ? "variable" : r.wind.dir + "°"} ${r.wind.spd} kt${r.wind.gust ? ` (gusts ${r.wind.gust})` : ""}`);
  if (r.temp !== null) sum.push(`${r.temp} °C`);
  sum.push(r.ceiling === Infinity ? "no ceiling" : `ceiling ${r.ceiling.toLocaleString()} ft`);
  $("#metarOut").innerHTML =
    `<div class="metar-summary">${r.cat ? `<span class="cat-flag" style="background:${r.cat[1]};color:#fff">${r.cat[0]}</span>${r.cat[2]}<br>` : ""}<span class="sub">${sum.join(" · ")}</span></div>` +
    r.rows.map((x) => `<div class="mrow ${x.unk ? "unk" : ""}"><code>${esc(x.code)}</code><span>${esc(x.text)}</span></div>`).join("");
}
let metarXP = false;
$("#metarGo").onclick = () => { renderMetar(); if (!metarXP) { metarXP = true; addXP(3, "METAR decoded"); } };
$$(".metar-ex").forEach((b) => b.onclick = () => { $("#metarIn").value = b.dataset.m; renderMetar(); });
$("#metarIn").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); renderMetar(); } });

// ---- Spectrum ----
function renderSpectrum() {
  const lo = Math.log10(0.1), hi = Math.log10(3000);
  const x = (f) => ((Math.log10(f) - lo) / (hi - lo)) * 100;
  const bands = [["LF/MF", 0.1, 3], ["HF", 3, 30], ["VHF", 30, 300], ["UHF", 300, 3000]];
  let html = bands.map(([n, a, b]) => `<div class="band-bg" style="left:${x(a)}%;width:${x(b) - x(a)}%">${n}</div>`).join("");
  html += [[0.1, "100k"], [1, "1 MHz"], [10, "10"], [100, "100"], [1000, "1 GHz"]]
    .map(([f, l]) => `<div class="tick" style="left:${Math.max(x(f), 3)}%">${l}</div>`).join("");
  html += SPECTRUM.map((s, i) => {
    const left = x(s.from), w = Math.max(x(s.to) - left, 0.6);
    const labelLeft = left > 72;
    return `<div class="spec-bar" data-i="${i}" style="left:${left}%;width:${w}%;top:${30 + i * 21}px;background:${s.color};color:${s.color}">
      <span style="${labelLeft ? "left:auto;right:100%;margin:0 6px 0 0" : ""}">${esc(s.name)}</span></div>`;
  }).join("");
  $("#spectrum").innerHTML = html;
  const info = (i) => {
    const s = SPECTRUM[i], g = findTerm(s.term);
    $$(".spec-bar").forEach((b) => b.classList.toggle("sel", +b.dataset.i === i));
    const fmt = (f) => (f < 1 ? `${Math.round(f * 1000)} kHz` : `${f} MHz`);
    $("#specInfo").innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${s.color}"></span> <b>${esc(s.name)}</b> — ${s.from === s.to ? fmt(s.from) : `${fmt(s.from)} – ${fmt(s.to)}`}
      <p style="margin:.4rem 0">${g ? esc(g.d) : ""}</p><a class="term-link" data-term="${esc(s.term)}">Open "${esc(s.term)}" in glossary →</a>`;
  };
  $$(".spec-bar").forEach((b) => { b.onmouseenter = b.onclick = () => info(+b.dataset.i); });
}

// ---- Axes ----
function updateAxes() {
  const p = +$("#pitchR").value, r = +$("#rollR").value, y = +$("#yawR").value;
  $("#pitchV").textContent = p + "°"; $("#rollV").textContent = r + "°"; $("#yawV").textContent = y + "°";
  $("#pitchPlane").setAttribute("transform", `rotate(${-p})`);
  $("#elevSurf").style.transform = `translateY(${-p / 8}px)`;
  $("#rollPlane").setAttribute("transform", `rotate(${r})`);
  $("#ailL").style.transform = `translateY(${r / 15}px)`;
  $("#ailR").style.transform = `translateY(${-r / 15}px)`;
  $("#yawPlane").setAttribute("transform", `rotate(${y})`);
  $("#rudSurf").style.transform = `translateX(${y / 8}px)`;
  let tip = "Tip: In a real aircraft you use ailerons <em>and</em> rudder together to make a coordinated turn.";
  if (Math.abs(r) > 45) tip = "⚠ Bank over 45° is a steep turn — the stall speed increases noticeably and you need more back pressure.";
  else if (p > 20) tip = "⚠ High nose attitude — watch your airspeed. Too much angle of attack leads to a stall.";
  else if (p < -15) tip = "⚠ Steep nose-down — airspeed will build rapidly.";
  else if (Math.abs(y) > 20 && Math.abs(r) < 5) tip = "Yawing without banking = a skid. The ball in the turn coordinator would be way off centre.";
  else if (r > 5) tip = "Right bank: right aileron goes <b>up</b>, left aileron goes <b>down</b>.";
  else if (r < -5) tip = "Left bank: left aileron goes <b>up</b>, right aileron goes <b>down</b>.";
  $("#axesTip").innerHTML = tip;
}
["pitchR", "rollR", "yawR"].forEach((id) => $("#" + id).addEventListener("input", updateAxes));

// ---- Unit converter ----
const CONV = [
  { name: "Speed", units: [["kt", 1], ["km/h", 1 / 1.852], ["mph", 0.868976], ["m/s", 1.943844]] },
  { name: "Altitude", units: [["ft", 1], ["m", 3.28084], ["FL", 100]] },
  { name: "Distance", units: [["NM", 1], ["km", 1 / 1.852], ["mi", 0.868976]] },
  { name: "Pressure", units: [["hPa", 1], ["inHg", 33.8639], ["mmHg", 1.33322]] },
  { name: "Fuel (Jet A-1)", units: [["L", 1], ["US gal", 3.78541], ["kg", 1 / 0.8]] },
  { name: "Temperature", units: [["°C"], ["°F"], ["K"]], temp: true },
];
function renderConverter() {
  $("#convGrid").innerHTML = CONV.map((g, gi) => `<div class="conv-group"><h4>${g.name}</h4>
    ${g.units.map(([u], ui) => `<label><span>${u}</span><input type="number" step="any" data-g="${gi}" data-u="${ui}"></label>`).join("")}</div>`).join("");
  $("#convGrid").addEventListener("input", (e) => {
    const inp = e.target; if (!inp.dataset.g) return;
    const g = CONV[+inp.dataset.g], ui = +inp.dataset.u, v = parseFloat(inp.value);
    const others = $$(`input[data-g="${inp.dataset.g}"]`).filter((x) => x !== inp);
    if (isNaN(v)) { others.forEach((o) => (o.value = "")); return; }
    const round = (n) => +n.toFixed(Math.abs(n) < 10 ? 3 : 1);
    if (g.temp) {
      const c = ui === 0 ? v : ui === 1 ? (v - 32) * 5 / 9 : v - 273.15;
      const vals = [c, c * 9 / 5 + 32, c + 273.15];
      others.forEach((o) => (o.value = round(vals[+o.dataset.u])));
    } else {
      const base = v * g.units[ui][1];
      others.forEach((o) => (o.value = round(base / g.units[+o.dataset.u][1])));
    }
  });
  // sensible defaults
  const set = (g, u, v) => { const el = $(`input[data-g="${g}"][data-u="${u}"]`); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
  set(0, 0, 120); set(1, 0, 35000); set(2, 0, 100); set(3, 0, 1013.25); set(4, 0, 1000); set(5, 0, 15);
}

// ---- Squawk ----
const SQUAWKS = [
  { code: "7500", name: "Unlawful interference (hijack)", color: "#e11d48", d: "Silently tells ATC the aircraft has been hijacked. Mnemonic: \"Seventy-five — man with a knife\"." },
  { code: "7600", name: "Radio failure", color: "#db2777", d: "Lost communications. The pilot follows published lost-comms procedures. Mnemonic: \"Seventy-six — radio's in a fix\"." },
  { code: "7700", name: "General emergency", color: "#e11d48", d: "Any emergency — engine failure, medical, fire. Triggers alerts on every radar screen. Mnemonic: \"Seventy-seven — going to heaven\"." },
  { code: "7000", name: "VFR conspicuity (Europe/ICAO)", color: "#2563eb", d: "Default code for VFR flights not receiving an ATC service in most of Europe." },
  { code: "1200", name: "VFR (USA, Canada, Australia)", color: "#2563eb", d: "Default code for VFR flights in North America and some other countries." },
  { code: "2000", name: "No code assigned (IFR)", color: "#3b82f6", d: "Used when entering radar airspace from an area where no code was assigned, e.g. after oceanic crossings in ICAO regions." },
  { code: "1000", name: "Mode S conspicuity (Europe)", color: "#3b82f6", d: "IFR flights in Mode S airspace where the aircraft is identified by its 24-bit address and flight ID instead." },
  { code: "7400", name: "Drone lost link", color: "#f472b6", d: "Used in some regions by unmanned aircraft when the control link to the pilot is lost." },
];
function renderSquawk() {
  $("#sqCards").innerHTML = SQUAWKS.map((s) => `<div class="card sq-card" style="border-left-color:${s.color}">
    <div class="code" style="color:${s.color}">${s.code}</div><b>${esc(s.name)}</b><p class="sub" style="margin:.3rem 0 0">${esc(s.d)}</p></div>`).join("");
  const check = () => {
    const v = $("#sqIn").value.trim();
    const out = $("#sqOut");
    if (!v) { out.innerHTML = `<span class="sub">Enter a 4-digit code.</span>`; return; }
    if (/[89]/.test(v)) { out.innerHTML = `❌ <b>Invalid</b> — transponder codes only use digits 0–7 (octal), so there are 4,096 possible codes. 8 and 9 don't exist!`; return; }
    if (!/^[0-7]{1,4}$/.test(v)) { out.innerHTML = `❌ Digits only, please.`; return; }
    if (v.length < 4) { out.innerHTML = `<span class="sub">Keep typing… (${4 - v.length} more)</span>`; return; }
    const s = SQUAWKS.find((x) => x.code === v);
    out.innerHTML = s ? `<b style="color:${s.color}">${esc(s.name)}</b><br>${esc(s.d)}` : `✅ Valid code. <b>${v}</b> is a normal discrete code ATC might assign to identify one specific aircraft on radar.`;
  };
  $("#sqIn").addEventListener("input", check); check();
}

// ================= QUIZ =================
const quiz = { qs: [], i: 0, score: 0, streak: 0 };
function makeQuestions() {
  const abbr = GLOSSARY.filter((x) => /^[A-Z][A-Z0-9-]{1,6}$/.test(x.t) && x.f && x.f.toUpperCase() !== x.t && x.f.length < 60);
  const qa = shuffle(abbr).slice(0, 3).map((x) => {
    const wrong = shuffle(abbr.filter((o) => o.t !== x.t)).slice(0, 3).map((o) => o.f);
    return { q: `What does <b>${esc(x.t)}</b> stand for?`, a: x.f, o: shuffle([x.f, ...wrong]), term: x.t };
  });
  const qb = shuffle(GLOSSARY.filter((x) => x.t.length < 25)).slice(0, 3).map((x) => {
    const masked = x.d.split(/(?<=\.)\s/).slice(0, 2).join(" ").slice(0, 240)
      .replace(new RegExp(reEsc(x.t), "gi"), "_____");
    const wrong = shuffle(GLOSSARY.filter((o) => o.t !== x.t && o.c === x.c)).slice(0, 3).map((o) => o.t);
    return { q: `Which term matches this description?<br><span class="sub" style="font-size:1rem;font-weight:400">“${esc(masked)}”</span>`, a: x.t, o: shuffle([x.t, ...wrong]), term: x.t };
  });
  const qc = shuffle(QUIZ_EXTRA).slice(0, 2).map((x) => ({ q: esc(x.q), a: x.a, o: shuffle(x.o) }));
  // aircraft library questions
  const acGen = [
    () => {
      const four = shuffle(AIRCRAFT.filter((a) => a.range)).slice(0, 4);
      const best = four.reduce((m, a) => (a.range > m.range ? a : m));
      return { q: "Which of these aircraft has the <b>longest range</b>?", a: best.name, o: four.map((a) => a.name), ac: best.id };
    },
    () => {
      const a = shuffle(AIRCRAFT)[0];
      const n = /^\d/.test(a.engines) ? a.engines.match(/^\d+/)[0] : "None";
      const opts = shuffle(["None", "1", "2", "4", "6"].filter((x) => x !== n)).slice(0, 3);
      return { q: `How many engines does the <b>${esc(a.name)}</b> have?`, a: n, o: shuffle([n, ...opts]), ac: a.id };
    },
    () => {
      const a = shuffle(AIRCRAFT)[0];
      const wrong = shuffle(Object.keys(AC_CATS).filter((c) => c !== a.cat)).slice(0, 3).map((c) => AC_CATS[c]);
      return { q: `What kind of aircraft is the <b>${esc(a.name)}</b>?`, a: AC_CATS[a.cat], o: shuffle([AC_CATS[a.cat], ...wrong]), ac: a.id };
    },
    () => {
      const four = shuffle(AIRCRAFT).slice(0, 4);
      const oldest = four.reduce((m, a) => (a.year < m.year ? a : m));
      return { q: "Which of these aircraft <b>flew first</b>?", a: oldest.name, o: four.map((a) => a.name), ac: oldest.id };
    },
  ];
  const qd = shuffle(acGen).slice(0, 2).map((g) => g());
  return shuffle([...qa, ...qb, ...qc, ...qd]);
}
function startQuiz() {
  Object.assign(quiz, { qs: makeQuestions(), i: 0, score: 0, streak: 0 });
  renderQ();
}
function renderQ() {
  $("#qScore").textContent = quiz.score; $("#qStreak").textContent = quiz.streak; $("#qBest").textContent = store.get("best", 0);
  if (quiz.i >= quiz.qs.length) {
    const best = store.get("best", 0);
    const isBest = quiz.score > best;
    if (isBest) store.set("best", quiz.score);
    const pct = quiz.score / quiz.qs.length;
    const msg = pct === 1 ? "Perfect — you're ready for the left seat! 👨‍✈️" : pct >= .7 ? "Great flying! ✈" : pct >= .4 ? "Not bad — review the glossary and try again." : "Keep learning — every pilot started here.";
    $("#qProgress").textContent = "Finished";
    $("#qBody").innerHTML = `<div class="q-done"><div class="big">${quiz.score}/${quiz.qs.length}</div><p>${msg}</p>${isBest ? "<p>🏅 New personal best!</p>" : ""}<button class="btn" id="qAgain">Play again</button></div>`;
    $("#qAgain").onclick = startQuiz;
    $("#qBest").textContent = store.get("best", 0);
    store.set("quizHistory", [...store.get("quizHistory", []), { ts: Date.now(), score: quiz.score, total: quiz.qs.length }].slice(-30));
    return;
  }
  const q = quiz.qs[quiz.i];
  $("#qProgress").textContent = `Question ${quiz.i + 1} of ${quiz.qs.length}`;
  $("#qBody").innerHTML = `<div class="q-text">${q.q}</div>
    <div class="q-opts">${q.o.map((o) => `<button class="q-opt" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>
    <div class="q-feedback"></div>`;
  $$("#qBody .q-opt").forEach((b) => b.onclick = () => {
    const ok = b.dataset.v === q.a;
    $$("#qBody .q-opt").forEach((x) => { x.disabled = true; if (x.dataset.v === q.a) x.classList.add("right"); });
    if (!ok) b.classList.add("wrong");
    if (ok) { quiz.score++; quiz.streak++; addXP(10); } else quiz.streak = 0;
    $("#qScore").textContent = quiz.score; $("#qStreak").textContent = quiz.streak;
    $("#qBody .q-feedback").innerHTML = `<p>${ok ? (quiz.streak >= 3 ? `🔥 ${quiz.streak} in a row!` : "✅ Correct!") : `❌ The answer is <b>${esc(q.a)}</b>.`}
      ${q.term ? ` <a class="term-link" data-term="${esc(q.term)}">Learn more</a>` : ""}
      ${q.ac ? ` <a class="term-link" data-ac="${esc(q.ac)}">See in Aircraft Library</a>` : ""}</p>
      <button class="btn" id="qNext">${quiz.i + 1 < quiz.qs.length ? "Next →" : "See results"}</button>`;
    $("#qNext").onclick = () => { quiz.i++; renderQ(); };
    $("#qNext").focus();
  });
}
$$("#quizTabs button").forEach((b) => b.onclick = () => {
  $$("#quizTabs button").forEach((x) => x.classList.toggle("active", x === b));
  $("#q-quiz").classList.toggle("hidden", b.dataset.q !== "quiz");
  $("#q-flash").classList.toggle("hidden", b.dataset.q !== "flash");
});

// ---- Flashcards ----
const fc = { cat: "all", deck: [], i: 0 };
function buildDeck() {
  const favs = store.get("fav", []);
  fc.deck = allTerms().filter((x) => fc.cat === "all" || (fc.cat === "fav" ? favs.includes(x.t) : x.c === fc.cat));
  fc.i = 0; renderCard();
}
function renderFlashFilters() {
  $("#fFilters").innerHTML = [["all", "All"], ["fav", "★ Saved words"], ...Object.entries(CATEGORIES)]
    .map(([k, v]) => `<button class="chip ${fc.cat === k ? "active" : ""}" data-cat="${k}">${esc(v)}</button>`).join("");
  $$("#fFilters .chip").forEach((b) => b.onclick = () => { fc.cat = b.dataset.cat; renderFlashFilters(); buildDeck(); });
}
function renderCard() {
  const x = fc.deck[fc.i];
  $("#flashcard").classList.remove("flipped");
  if (!x) { $("#fcFront").textContent = fc.cat === "fav" ? "No saved words yet — tap ☆ on dictionary terms" : "No cards"; $("#fcBack").textContent = ""; $("#fcCount").textContent = ""; return; }
  setTimeout(() => {
    $("#fcFront").innerHTML = `${esc(x.t)}<small>tap to flip</small>`;
    $("#fcBack").innerHTML = `<b>${esc(x.f || x.t)}</b>${esc(x.d)}`;
  }, 150);
  $("#fcCount").textContent = `Card ${fc.i + 1} of ${fc.deck.length}`;
}
const flip = () => $("#flashcard").classList.toggle("flipped");
const fcMove = (d) => { if (!fc.deck.length) return; fc.i = (fc.i + d + fc.deck.length) % fc.deck.length; renderCard(); };
$("#flashcard").onclick = flip;
$("#fcFlip").onclick = flip;
$("#fcPrev").onclick = () => fcMove(-1);
$("#fcNext").onclick = () => fcMove(1);
$("#fcShuffle").onclick = () => { fc.deck = shuffle(fc.deck); fc.i = 0; renderCard(); };
document.addEventListener("keydown", (e) => {
  if ($("#q-flash").classList.contains("hidden") || !$("#page-quiz").classList.contains("active")) return;
  if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  if (e.key === "ArrowRight") fcMove(1);
  else if (e.key === "ArrowLeft") fcMove(-1);
  else if (e.key === " ") { e.preventDefault(); flip(); }
});

// ================= ATC & COMMS =================
function renderAtcSteps() {
  $("#atcSteps").innerHTML = ATC_UNITS.map((u, i) =>
    `<button class="atc-step ${i === 0 ? "active" : ""}" data-i="${i}"><span class="atc-ico">${u.icon}</span><span>${esc(u.name)}</span></button>`).join("");
  const show = (i) => {
    const u = ATC_UNITS[i];
    $$(".atc-step").forEach((b) => b.classList.toggle("active", +b.dataset.i === i));
    $("#atcDetail").innerHTML = `
      <div class="atc-head"><b>${u.icon} ${esc(u.name)}</b><span class="freq">${esc(u.freq)} MHz</span></div>
      <p>${esc(u.role)}</p>
      <div class="ex">${esc(u.call)}</div>
      <div class="row">
        ${"speechSynthesis" in window ? `<button class="btn ghost small" id="atcListen">🔊 Listen</button>` : ""}
        ${i < ATC_UNITS.length - 1 ? `<button class="btn small" id="atcNext">Next: ${esc(ATC_UNITS[i + 1].name)} →</button>` : `<span class="sub">…and on arrival the order reverses: Approach → Tower → Ground.</span>`}
      </div>`;
    const l = $("#atcListen"); if (l) l.onclick = () => speak(u.call.replace(/["…]/g, ""));
    const n = $("#atcNext"); if (n) n.onclick = () => show(i + 1);
  };
  $("#atcSteps").onclick = (e) => { const b = e.target.closest(".atc-step"); if (b) show(+b.dataset.i); };
  show(0);
}

const sim = { i: 0, score: 0, order: [] };
function startRadioSim() { Object.assign(sim, { i: 0, score: 0, order: shuffle(RADIO_SCENARIOS) }); renderRadioSim(); }
function renderRadioSim() {
  const root = $("#radioSim");
  if (sim.i >= sim.order.length) {
    root.innerHTML = `<div class="q-done"><div class="big">${sim.score}/${sim.order.length}</div>
      <p>${sim.score === sim.order.length ? "Perfect radio discipline! 🎧" : "Good practice — readbacks become automatic with time."}</p>
      <button class="btn" id="simAgain">Practise again</button></div>`;
    $("#simAgain").onclick = startRadioSim;
    return;
  }
  const s = sim.order[sim.i];
  root.innerHTML = `
    <div class="sim-meta">Call ${sim.i + 1} of ${sim.order.length} · Score ${sim.score}</div>
    <p class="sub">${esc(s.ctx)}</p>
    <div class="bubble atc">📻 <b>ATC:</b> ${esc(s.atc)}</div>
    <div class="q-opts">${s.o.map((o, j) => `<button class="q-opt" data-j="${j}">🎙 ${esc(o)}</button>`).join("")}</div>
    <div class="q-feedback"></div>`;
  $$(".q-opt", root).forEach((b) => b.onclick = () => {
    const ok = +b.dataset.j === s.a;
    $$(".q-opt", root).forEach((x) => { x.disabled = true; if (+x.dataset.j === s.a) x.classList.add("right"); });
    if (!ok) b.classList.add("wrong");
    if (ok) { sim.score++; addXP(5); }
    $(".q-feedback", root).innerHTML = `<p>${ok ? "✅ Good readback!" : "❌ Not quite."} ${esc(s.why)}</p><button class="btn" id="simNext">Next call →</button>`;
    $("#simNext").onclick = () => { sim.i++; renderRadioSim(); };
  });
}

// ================= AIRCRAFT LIBRARY =================
const fmt = {
  speed: (v) => (v ? `${v.toLocaleString()} kt` : "—"),
  range: (v) => (v ? `${v.toLocaleString()} NM` : "—"),
  seats: (v) => (v ? v.toLocaleString() : "—"),
  span: (v) => (v ? `${v} m` : "—"),
  mtow: (v) => (v >= 10000 ? `${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t` : `${v.toLocaleString()} kg`),
};
const acState = { cat: "all" };
function renderAcFilters() {
  $("#acFilters").innerHTML = [["all", "All"], ...Object.entries(AC_CATS)]
    .map(([k, v]) => `<button class="chip ${acState.cat === k ? "active" : ""}" data-cat="${k}">${esc(v)}</button>`).join("");
  $$("#acFilters .chip").forEach((b) => b.onclick = () => { acState.cat = b.dataset.cat; renderAcFilters(); renderAircraft(); });
}
function renderAircraft() {
  const q = $("#acSearch").value.trim().toLowerCase();
  const key = $("#acSort").value;
  const list = AIRCRAFT.filter((a) => (acState.cat === "all" || a.cat === acState.cat) &&
    (!q || `${a.name} ${a.maker} ${AC_CATS[a.cat]}`.toLowerCase().includes(q)));
  list.sort((a, b) => key === "name" ? a.name.localeCompare(b.name) : key === "year" ? a.year - b.year : (b[key] || 0) - (a[key] || 0));
  $("#acList").innerHTML = list.length ? list.map((a) => `
    <div class="card ac-card" data-ac="${a.id}">
      <div class="ac-top"><span class="ac-ico">${AC_ICON[a.cat]}</span><span class="badge">${esc(AC_CATS[a.cat])}</span></div>
      <h3>${esc(a.name)}</h3>
      <div class="ac-maker">${esc(a.maker)} · first flight ${a.year}</div>
      <div class="ac-stats">
        <div><small>Cruise</small><b>${fmt.speed(a.speed)}</b></div>
        <div><small>Range</small><b>${fmt.range(a.range)}</b></div>
        <div><small>Seats</small><b>${fmt.seats(a.seats)}</b></div>
        <div><small>Max weight</small><b>${fmt.mtow(a.mtow)}</b></div>
      </div>
    </div>`).join("") : `<div class="empty">No aircraft match "${esc(q)}".</div>`;
}
function openAircraft(id) {
  const a = AIRCRAFT.find((x) => x.id === id);
  if (!a) return;
  $("#modalBody").innerHTML = `
    <h2>${AC_ICON[a.cat]} ${esc(a.name)}</h2>
    <div class="full">${esc(a.maker)} · first flight ${a.year}</div>
    <span class="badge">${esc(AC_CATS[a.cat])}</span>
    <table class="spec-table">
      <tr><th>Engines</th><td>${esc(a.engines)}</td></tr>
      <tr><th>Typical cruise speed</th><td>${fmt.speed(a.speed)}</td></tr>
      <tr><th>Range</th><td>${fmt.range(a.range)}</td></tr>
      <tr><th>Seats / occupants</th><td>${fmt.seats(a.seats)}</td></tr>
      <tr><th>${a.cat === "rotor" ? "Rotor diameter" : "Wingspan"}</th><td>${fmt.span(a.span)}</td></tr>
      <tr><th>Max take-off weight</th><td>${fmt.mtow(a.mtow)}</td></tr>
    </table>
    <p>${esc(a.fact)}</p>
    <p class="sub small">Figures are approximate and vary by version and configuration.</p>
    <div class="row"><button class="btn small" id="acCmp">⚖ Compare this aircraft</button></div>`;
  $("#modal").classList.remove("hidden");
  $("#acCmp").onclick = () => {
    $("#acA").value = a.id; if ($("#acB").value === a.id) $("#acB").value = AIRCRAFT.find((x) => x.id !== a.id).id;
    renderCompare(); closeModal(); location.hash = "aircraft";
    setTimeout(() => $("#acCompare").scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };
}
function renderCompare() {
  const A = AIRCRAFT.find((x) => x.id === $("#acA").value), B = AIRCRAFT.find((x) => x.id === $("#acB").value);
  const metrics = [["Cruise speed", "speed"], ["Range", "range"], ["Seats", "seats"], ["Wingspan", "span"], ["Max take-off weight", "mtow"]];
  $("#acCompare").innerHTML = `<div class="cmp-legend"><span class="sw a"></span>${esc(A.name)} <span class="sw b"></span>${esc(B.name)}</div>` +
    metrics.map(([label, k]) => {
      const max = Math.max(A[k] || 0, B[k] || 0) || 1;
      const bar = (x, cls) => `<div class="cmp-row"><div class="cmp-bar ${cls}" style="width:${((x[k] || 0) / max) * 100}%"></div><span>${fmt[k](x[k])}</span></div>`;
      return `<div class="cmp-metric"><div class="cmp-label">${label}</div>${bar(A, "a")}${bar(B, "b")}</div>`;
    }).join("") +
    `<p class="sub small">First flights: ${esc(A.name)} in ${A.year}, ${esc(B.name)} in ${B.year}${A.year !== B.year ? ` — ${Math.abs(A.year - B.year)} years apart` : ""}.</p>`;
}
function initAircraft() {
  renderAcFilters(); renderAircraft();
  $("#acSearch").addEventListener("input", renderAircraft);
  $("#acSort").addEventListener("change", renderAircraft);
  const opts = AIRCRAFT.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("");
  $("#acA").innerHTML = opts; $("#acB").innerHTML = opts;
  $("#acA").value = "a320neo"; $("#acB").value = "b789";
  $("#acA").onchange = $("#acB").onchange = renderCompare;
  renderCompare();
}

// ================= COMMUNITY =================
// NOTE (README): posts are stored in localStorage, so each visitor only sees their own browser's posts.
// To make the community shared, replace loadPosts()/savePosts() with calls to an online database
// (e.g. Supabase, Firebase/Firestore, or your own API) and add sign-in + moderation.
const C_TAGS = ["General", "Radio & ATC", "Aircraft", "Training", "Weather"];
const SEED_POSTS = [
  { id: "ex1", example: true, name: "AeroLearn team", tag: "Radio & ATC", title: "What's the difference between VHF and PMR?", ts: Date.now() - 3 * 864e5, votes: 12,
    body: "I have PMR walkie-talkies at home. Can I use them to listen to or talk to pilots?",
    replies: [{ name: "AeroLearn team", ts: Date.now() - 2.9 * 864e5, body: "No — PMR446 is a licence-free UHF FM band (446 MHz) for the public. Aviation voice uses AM on the VHF airband (118–137 MHz). You can listen to airband with a scanner where that's legal, but transmitting needs a licensed aviation radio and an operator certificate. See 'PMR' and 'VHF' in the Dictionary." }] },
  { id: "ex2", example: true, name: "AeroLearn team", tag: "Training", title: "How long does it take to get a private pilot licence?", ts: Date.now() - 6 * 864e5, votes: 8,
    body: "Thinking about starting flying lessons. What's involved?",
    replies: [{ name: "AeroLearn team", ts: Date.now() - 5.8 * 864e5, body: "A PPL typically needs at least 45 flight hours (country rules vary), theory exams on topics like air law, meteorology and navigation, a medical certificate, and a skills test. Many people take 6–12 months flying weekly." }] },
  { id: "ex3", example: true, name: "AeroLearn team", tag: "Aircraft", title: "Why do airliners cruise so high?", ts: Date.now() - 9 * 864e5, votes: 5,
    body: "Why 35,000 ft and not 10,000 ft?", replies: [] },
];
const loadPosts = () => store.get("posts", null) ?? SEED_POSTS;
const isMine = (p) => (p.author ? p.author === CURRENT : !!p.mine && CURRENT === "guest");
const defaultName = () => (CURRENT === "guest" ? store.get("cname", "") : currentProfile().name);
const savePosts = (p) => store.set("posts", p);
const cState = { tag: "all" };
const timeAgo = (ts) => {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return `${Math.floor(s / 86400)} d ago`;
};
function renderCommunityFilters() {
  $("#cFilters").innerHTML = [["all", "All"], ...C_TAGS.map((t) => [t, t])]
    .map(([k, v]) => `<button class="chip ${cState.tag === k ? "active" : ""}" data-tag="${esc(k)}">${esc(v)}</button>`).join("");
  $$("#cFilters .chip").forEach((b) => b.onclick = () => { cState.tag = b.dataset.tag; renderCommunityFilters(); renderPosts(); });
}
function renderPosts() {
  const q = $("#cSearch").value.trim().toLowerCase();
  const voted = store.get("voted", []);
  const sort = $("#cSort").value;
  const list = loadPosts().filter((p) => (cState.tag === "all" || p.tag === cState.tag) &&
    (!q || `${p.title} ${p.body} ${p.replies.map((r) => r.body).join(" ")}`.toLowerCase().includes(q)));
  list.sort((a, b) => sort === "top" ? b.votes - a.votes : sort === "open" ? (a.replies.length > 0) - (b.replies.length > 0) || b.ts - a.ts : b.ts - a.ts);
  $("#cList").innerHTML = list.length ? list.map((p) => `
    <div class="card c-post" data-id="${esc(p.id)}">
      <button class="vote ${voted.includes(p.id) ? "on" : ""}" data-vote="${esc(p.id)}" title="Upvote">▲<b>${p.votes}</b></button>
      <div class="c-main">
        <h3>${esc(p.title)}</h3>
        <div class="c-meta"><span class="badge">${esc(p.tag)}</span>${p.example ? `<span class="badge custom">Example</span>` : ""}
          <span>${esc(p.name)} · ${timeAgo(p.ts)}</span>
          <span class="${p.replies.length ? "answered" : "open"}">${p.replies.length ? `✓ ${p.replies.length} repl${p.replies.length === 1 ? "y" : "ies"}` : "Unanswered"}</span></div>
      </div>
    </div>`).join("") : `<div class="empty">No discussions found. Be the first to ask!</div>`;
}
function vote(id) {
  let voted = store.get("voted", []);
  const posts = loadPosts(); const p = posts.find((x) => x.id === id); if (!p) return;
  if (voted.includes(id)) { voted = voted.filter((v) => v !== id); p.votes--; } else { voted.push(id); p.votes++; }
  store.set("voted", voted); savePosts(posts); renderPosts();
}
function openThread(id) {
  const p = loadPosts().find((x) => x.id === id); if (!p) return;
  $("#modalBody").innerHTML = `
    <div class="c-meta"><span class="badge">${esc(p.tag)}</span>${p.example ? `<span class="badge custom">Example</span>` : ""}<span>${esc(p.name)} · ${timeAgo(p.ts)}</span></div>
    <h2 style="margin-top:.5rem">${esc(p.title)}</h2>
    <p class="c-body">${esc(p.body)}</p>
    <div class="label">${p.replies.length} repl${p.replies.length === 1 ? "y" : "ies"}</div>
    <div class="c-replies">${p.replies.map((r) => `<div class="c-reply"><div class="c-meta"><b>${esc(r.name)}</b> · ${timeAgo(r.ts)}</div><p>${esc(r.body)}</p></div>`).join("") || `<p class="sub">No replies yet — share what you know!</p>`}</div>
    <form id="replyForm" class="c-reply-form" autocomplete="off">
      <input name="name" placeholder="Your display name" maxlength="30" required value="${esc(defaultName())}">
      <textarea name="body" rows="3" placeholder="Write a reply…" maxlength="2000" required></textarea>
      <div class="row end">${isMine(p) ? `<button type="button" class="btn ghost small" id="delPost">🗑 Delete my question</button>` : ""}<button class="btn small">Reply</button></div>
    </form>`;
  $("#modal").classList.remove("hidden");
  $("#replyForm").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target), name = fd.get("name").trim(), body = fd.get("body").trim();
    if (!name || !body) return;
    store.set("cname", name);
    const posts = loadPosts(); const t = posts.find((x) => x.id === id);
    t.replies.push({ name, body, ts: Date.now(), author: CURRENT }); savePosts(posts);
    addXP(5, "Reply posted"); renderPosts(); openThread(id);
  };
  const del = $("#delPost");
  if (del) del.onclick = () => { savePosts(loadPosts().filter((x) => x.id !== id)); closeModal(); renderPosts(); toast("Question deleted"); };
}
function initCommunity() {
  const f = $("#cForm");
  $("[name=tag]", f).innerHTML = C_TAGS.map((t) => `<option>${esc(t)}</option>`).join("");
  $("[name=name]", f).value = defaultName();
  f.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const post = { id: "p" + Date.now().toString(36), author: CURRENT, name: fd.get("name").trim(), tag: fd.get("tag"),
      title: fd.get("title").trim(), body: fd.get("body").trim(), ts: Date.now(), votes: 0, replies: [] };
    if (!post.name || !post.title || !post.body) return;
    store.set("cname", post.name);
    savePosts([post, ...loadPosts()]);
    f.elements.title.value = ""; f.elements.body.value = "";
    addXP(10, "Question posted"); cState.tag = "all"; renderCommunityFilters(); renderPosts();
  };
  $("#cSearch").addEventListener("input", renderPosts);
  $("#cSort").addEventListener("change", renderPosts);
  $("#cList").addEventListener("click", (e) => {
    const v = e.target.closest("[data-vote]");
    if (v) { vote(v.dataset.vote); return; }
    const c = e.target.closest(".c-post"); if (c) openThread(c.dataset.id);
  });
  renderCommunityFilters(); renderPosts();
}

// ================= INTERACTIVE ATC SIMULATOR =================
const SIM_START = [420, 40, 0];
const SIM_UNITS = { "127.250": "ATIS", "121.800": "GROUND", "118.700": "TOWER" };
const S = { i: 0, score: 0, tries: 0, mode: "choose", active: "127.250", logged: -1, heading: 0, timers: [] };
const normRadio = (s) => s.toLowerCase().replace(/take[\s-]?off/g, "take off")
  .replace(/(\d)\.(\d*?)0+(?!\d)/g, (m, a, b) => (b ? `${a}.${b}` : a))
  .replace(/[^a-z0-9. ]/g, " ").replace(/\s+/g, " ").trim();
const fmtFreq = (v) => {
  const m = String(v).trim().match(/^(1[1-3]\d)(?:[.,](\d{0,3}))?$/);
  return m ? `${m[1]}.${(m[2] || "").padEnd(3, "0")}` : null;
};
function placePlane([x, y, h], instant) {
  const p = $("#simPlane");
  S.heading += ((h - S.heading) % 360 + 540) % 360 - 180; // turn the short way round
  p.style.transition = instant ? "none" : "";
  p.style.transform = `translate(${x}px, ${y}px) rotate(${S.heading}deg)`;
}
function flyPath(wps) {
  wps.forEach((wp, k) => S.timers.push(setTimeout(() => placePlane(wp), k * 1100)));
}
function simLog(who, text, unit) {
  const d = document.createElement("div");
  d.className = `bubble ${who}`;
  d.innerHTML = who === "atc" ? `📻 <b>${esc(unit)}:</b> ${esc(text)}` : `🎙 <b>You:</b> ${esc(text)}`;
  $("#simLog").appendChild(d);
  $("#simLog").scrollTop = $("#simLog").scrollHeight;
}
function updateRadio() {
  $("#rpActive").textContent = S.active;
  $("#rpUnit").textContent = SIM_UNITS[S.active] || "—";
}
function resetSim() {
  S.timers.forEach(clearTimeout);
  Object.assign(S, { i: 0, score: 0, tries: 0, active: "127.250", logged: -1, heading: 0, timers: [] });
  $("#rpStby").value = "121.800";
  $("#simLog").innerHTML = `<div class="sub small">— Radio transcript —</div>`;
  updateRadio();
  placePlane(SIM_START, true);
  renderSimTask();
}
function renderSimTask() {
  const task = $("#simTask");
  $("#simScore").textContent = S.score;
  if (S.i >= SIM_STEPS.length) {
    const best = Math.max(store.get("simBest", 0), S.score);
    store.set("simBest", best); store.set("simDone", true);
    $("#simStepLbl").textContent = "Flight complete";
    task.innerHTML = `<div class="q-done"><div class="big">${S.score}/${SIM_STEPS.length}</div>
      <p>Engine shut down at the apron. ${S.score === SIM_STEPS.length ? "Flawless radio work, captain! 🎉" : S.score >= 10 ? "Nice flying — a few calls to polish." : "Every pilot sounds nervous on the radio at first. Fly it again!"}</p>
      <p class="sub small">Best score: ${best}/${SIM_STEPS.length} · Try "Type replies" mode for extra XP.</p>
      <button class="btn" id="simAgain">✈ Fly again</button></div>`;
    $("#simAgain").onclick = resetSim;
    return;
  }
  const st = SIM_STEPS[S.i];
  $("#simStepLbl").textContent = `Step ${S.i + 1} of ${SIM_STEPS.length} · ${st.unit}`;
  const onFreq = S.active === st.freq;
  if (st.atc && onFreq && S.logged !== S.i) {
    S.logged = S.i; simLog("atc", st.atc, st.unit);
    if ($("#simVoice").checked) speak(st.atc);
  }
  let html = `<p class="sim-prompt">${esc(st.prompt)}</p>`;
  if (!onFreq) html += `<div class="sim-warn">📻 You're on the wrong frequency. Tune <b>${st.freq}</b> (${esc(st.unit)}): type it in STANDBY and press ⇄.</div>`;
  else if (S.mode === "type" && !st.quiz) html += `<textarea id="simText" rows="2" placeholder="Type your radio call… e.g. 'Runway 27, cleared for take-off, Golf Charlie Delta'"></textarea>
      <div class="row"><button class="btn" id="simTx">🎙 Transmit</button><button class="btn ghost small" id="simHint">💡 Hint</button></div>`;
  else html += `<div class="q-opts">${st.o.map((o, j) => `<button class="q-opt" data-j="${j}">${st.quiz ? "" : "🎙 "}${esc(o)}</button>`).join("")}</div>`;
  task.innerHTML = html + `<div class="sim-fb" id="simFb"></div>`;

  $$(".q-opt", task).forEach((b) => b.onclick = () => {
    const ok = +b.dataset.j === st.a;
    if (!ok) { b.classList.add("wrong"); b.disabled = true; }
    simResult(ok, st.o[st.a]);
  });
  const tx = $("#simTx");
  if (tx) {
    const send = () => {
      const said = $("#simText").value.trim();
      if (!said) return;
      const n = normRadio(said);
      const missing = st.keys.filter((g) => !g.some((alt) => n.includes(normRadio(alt))));
      if (missing.length) {
        S.tries++;
        $("#simFb").innerHTML = `❌ Not quite — your call is missing: <b>${missing.map((g) => esc(g[0])).join(", ")}</b>. Try again, or use a hint.`;
      } else simResult(true, said);
    };
    tx.onclick = send;
    $("#simText").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    $("#simHint").onclick = () => { S.tries++; $("#simFb").innerHTML = `💡 Expected something like: <i>${esc(st.o[st.a])}</i>`; };
    $("#simText").focus();
  }
}
function simResult(ok, said) {
  const st = SIM_STEPS[S.i];
  if (!ok) { S.tries++; $("#simFb").innerHTML = `❌ ${esc(st.why)}<br><span class="sub small">Try again.</span>`; return; }
  if (S.tries === 0) { S.score++; addXP(S.mode === "type" && !st.quiz ? 8 : 5); }
  $("#simScore").textContent = S.score;
  if (!st.quiz) simLog("you", said);
  $$("#simTask .q-opt, #simTask textarea, #simTask button").forEach((x) => (x.disabled = true));
  $$("#simTask .q-opt").forEach((x) => { if (+x.dataset.j === st.a) x.classList.add("right"); });
  $("#simFb").innerHTML = `✅ ${S.tries === 0 ? "" : "(after a retry) "}${esc(st.why)}<div class="row"><button class="btn" id="simNext">Continue →</button></div>`;
  if (st.pos) flyPath(st.pos);
  $("#simNext").onclick = () => { S.i++; S.tries = 0; renderSimTask(); };
  $("#simNext").focus({ preventScroll: true });
}
function initSim() {
  $("#rpSwap").onclick = () => {
    const f = fmtFreq($("#rpStby").value);
    if (!f) { toast("Enter a frequency like 118.700"); return; }
    $("#rpStby").value = S.active; S.active = f; updateRadio(); renderSimTask();
  };
  $("#rpStby").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#rpSwap").click(); });
  $("#simMode").onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    S.mode = b.dataset.mode;
    $$("#simMode button").forEach((x) => x.classList.toggle("active", x === b));
    renderSimTask();
  };
  $("#simRestart").onclick = resetSim;
  resetSim();
}

// ================= AIRCRAFT EXPLORER =================
const EX = { mode: "learn", sel: null, game: null };
function buildExplorer() {
  const P = (pts) => pts.map((p) => p.map((n) => +n.toFixed(1)).join(",")).join(" ");
  const band = (f, t0, t1, d0, d1) => { const a = f(t0), b = f(t1); return P([[a[0], a[1] + d0], [b[0], b[1] + d0], [b[0], b[1] + d1], [a[0], a[1] + d1]]); };
  const lead = (t) => [282 - 212 * t, 165 + 80 * t];   // left wing leading edge, root → tip
  const trail = (t) => [282 - 212 * t, 232 + 30 * t];  // left wing trailing edge, root → tip
  const stabTrail = (t) => [285 - 90 * t, 362 + 20 * t];
  const half = `
    <polygon class="part" data-part="wing" points="${P([[282, 165], [70, 245], [70, 262], [282, 232]])}"/>
    <polygon class="part ctl" data-part="slats" points="${band(lead, 0.08, 0.92, 1, 7)}"/>
    <polygon class="part" data-part="spoilers" points="${band(trail, 0.45, 0.85, -24, -16)}"/>
    <polygon class="part ctl" data-part="flaps" points="${band(trail, 0.38, 0.92, -10, 0)}"/>
    <polygon class="part ctl" data-part="aileron" points="${band(trail, 0.06, 0.32, -10, 0)}"/>
    <rect class="part" data-part="winglet" x="63" y="240" width="7" height="23" rx="2"/>
    <rect class="part" data-part="engine" x="189" y="176" width="24" height="52" rx="10"/>
    <polygon class="part" data-part="hstab" points="${P([[285, 330], [195, 372], [195, 382], [285, 362]])}"/>
    <polygon class="part ctl" data-part="elevator" points="${band(stabTrail, 0.05, 0.95, -7, 0)}"/>
    <rect class="part" data-part="pitot" x="272" y="60" width="9" height="3"/><circle class="hit" data-part="pitot" cx="276" cy="61" r="8"/>`;
  $("#exSvg").innerHTML = `
    <rect x="0" y="0" width="600" height="420" rx="14" class="ex-bg"/>
    ${half}<g transform="translate(600 0) scale(-1 1)">${half}</g>
    <path class="part" data-part="fuselage" d="M300 22 C318 22 322 50 322 80 L322 360 C322 380 310 398 300 402 C290 398 278 380 278 360 L278 80 C278 50 282 22 300 22 Z"/>
    <polygon class="part" data-part="cockpit" points="289,44 311,44 315,57 285,57"/>
    <rect class="part" data-part="vstab" x="296" y="316" width="8" height="60" rx="3"/>
    <rect class="part ctl" data-part="rudder" x="296" y="374" width="8" height="22" rx="2"/>
    <circle class="part" data-part="apu" cx="300" cy="404" r="5"/>
    <circle class="part gear" data-part="gear" cx="300" cy="96" r="7"/><circle class="part gear" data-part="gear" cx="284" cy="238" r="8"/><circle class="part gear" data-part="gear" cx="316" cy="238" r="8"/>
    <circle class="part light red" data-part="navlights" cx="66" cy="252" r="4"/><circle class="part light green" data-part="navlights" cx="534" cy="252" r="4"/><circle class="part light white" data-part="navlights" cx="300" cy="413" r="3"/>
    <circle class="hit" data-part="navlights" cx="66" cy="252" r="9"/><circle class="hit" data-part="navlights" cx="534" cy="252" r="9"/>
    <text x="300" y="14" class="ex-dir">▲ NOSE</text>`;
  $$("#exSvg [data-part]").forEach((el) => {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
    t.textContent = EX.mode === "game" ? "?" : PARTS[el.dataset.part].name;
    el.appendChild(t);
  });
}
function exSelect(key) {
  EX.sel = key;
  $$("#exSvg [data-part]").forEach((el) => el.classList.toggle("sel", el.dataset.part === key));
  const found = store.get("partsFound", []);
  if (!found.includes(key)) { found.push(key); store.set("partsFound", found); addXP(2); }
  renderExInfo();
}
function renderExInfo() {
  const box = $("#exInfo");
  const found = store.get("partsFound", []);
  const total = Object.keys(PARTS).length;
  const chips = `<div class="chips">${Object.entries(PARTS).map(([k, v]) => `<button class="chip ${EX.sel === k ? "active" : ""}" data-pick="${k}">${found.includes(k) ? "✓ " : ""}${esc(v.name)}</button>`).join("")}</div>`;
  if (EX.mode === "game") {
    const g = EX.game;
    if (g.i >= g.order.length) {
      const best = Math.max(store.get("exBest", 0), g.score); store.set("exBest", best);
      box.innerHTML = `<div class="q-done"><div class="big">${g.score}/${g.order.length}</div><p>${g.score === g.order.length ? "You know your aircraft inside out! 🛩" : "Switch to Explore mode to review, then try again."}</p><p class="sub small">Best: ${best}/${g.order.length}</p><button class="btn" id="exAgain">Play again</button></div>`;
      $("#exAgain").onclick = startExGame;
      return;
    }
    box.innerHTML = `<div class="sim-meta">Round ${g.i + 1} of ${g.order.length} · Score ${g.score}</div>
      <div class="ex-target">Find the<br><b>${esc(PARTS[g.order[g.i]].name)}</b></div>
      <div class="sim-fb" id="exFb">${g.msg || ""}</div>`;
    return;
  }
  if (!EX.sel) {
    box.innerHTML = `<h3>Click any part of the aircraft</h3><p class="sub">Hover to see names. Dashed circles are parts underneath (landing gear). Orange-outlined parts are control surfaces that move.</p>
      <div class="progress-wrap"><span class="pw-label">Discovered</span><div class="progress"><div class="bar" style="width:${found.length / total * 100}%"></div></div><span>${found.length}/${total}</span></div>${chips}`;
    return;
  }
  const p = PARTS[EX.sel];
  box.innerHTML = `<h3>${esc(p.name)}</h3>
    ${p.ctl ? `<div class="ctl-tag">⟲ Control surface — moves to control <b>${p.ctl}</b></div>` : ""}
    <p>${esc(p.d)}</p>
    ${p.term ? `<p><a class="term-link" data-term="${esc(p.term)}">📖 Related dictionary entry: ${esc(p.term)}</a></p>` : ""}
    <div class="progress-wrap"><span class="pw-label">Discovered</span><div class="progress"><div class="bar" style="width:${found.length / total * 100}%"></div></div><span>${found.length}/${total}</span></div>${chips}`;
}
function startExGame() {
  EX.game = { order: shuffle(Object.keys(PARTS)).slice(0, 8), i: 0, score: 0, tries: 0, msg: "" };
  EX.sel = null;
  $$("#exSvg [data-part]").forEach((el) => el.classList.remove("sel"));
  renderExInfo();
}
function initExplorer() {
  buildExplorer();
  $("#exSvg").addEventListener("click", (e) => {
    const el = e.target.closest("[data-part]"); if (!el) return;
    const key = el.dataset.part;
    if (EX.mode === "learn") { exSelect(key); return; }
    const g = EX.game; if (!g || g.i >= g.order.length) return;
    if (key === g.order[g.i]) {
      if (g.tries === 0) { g.score++; addXP(3); }
      $$("#exSvg [data-part]").forEach((x) => x.classList.toggle("sel", x.dataset.part === key));
      g.i++; g.tries = 0; g.msg = `✅ Yes — that's the ${esc(PARTS[key].name)}.`;
    } else {
      g.tries++; g.msg = `❌ That's the <b>${esc(PARTS[key].name)}</b>. Keep looking!`;
      el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 400);
    }
    renderExInfo();
  });
  $("#exInfo").addEventListener("click", (e) => { const c = e.target.closest("[data-pick]"); if (c) exSelect(c.dataset.pick); });
  $("#exMode").onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    EX.mode = b.dataset.mode;
    $$("#exMode button").forEach((x) => x.classList.toggle("active", x === b));
    buildExplorer();
    if (EX.mode === "game") startExGame(); else { EX.sel = null; renderExInfo(); }
  };
  renderExInfo();
}

// ================= DASHBOARD =================
const METAR_OF_DAY = [
  "EGLL 061150Z 24012KT 9999 FEW030 SCT045 14/08 Q1018",
  "KJFK 061751Z 31008KT 10SM FEW050 SCT250 18/04 A3012",
  "LFPG 060900Z VRB02KT 0300 R27L/0550N FG VV001 08/08 Q1022 NOSIG",
  "KMIA 061553Z 18022G35KT 2SM +TSRA BKN015CB OVC040 27/24 A2981",
  "LSZH 061420Z 05006KT CAVOK 21/09 Q1019 NOSIG",
  "EDDF 060820Z 23018G30KT 4000 -SHRA BKN008 OVC015 09/07 Q0998",
];
const dayIndex = () => Math.floor(Date.now() / 864e5);
function lessonProgress() {
  const d = store.get("lessons", []);
  const pct = (list) => Math.round(list.filter((l) => d.includes(l.title)).length / list.length * 100);
  const next = [...ACADEMY_LESSONS.map((l) => ["academy", l]), ...ATC_LESSONS.map((l) => ["atc", l])].find(([, l]) => !d.includes(l.title));
  return { academy: pct(ACADEMY_LESSONS), atc: pct(ATC_LESSONS), done: d.length, next };
}
function xpBar(xp) {
  const r = rankFor(xp);
  const pct = r.next ? ((xp - r.floor) / (r.next[0] - r.floor)) * 100 : 100;
  return `<div class="rank"><b>${esc(r.name)}</b><span class="sub small">${r.next ? `${r.next[0] - xp} XP to ${esc(r.next[1])}` : "Top rank reached!"}</span></div>
    <div class="progress"><div class="bar" style="width:${pct}%"></div></div>`;
}
function renderDashboard() {
  const prof = currentProfile(), xp = store.get("xp", 0), lp = lessonProgress();
  $("#dWelcome").innerHTML = `
    <div class="label">Welcome back</div>
    <div class="welcome-row"><span class="big-avatar">${prof.avatar}</span><div><h3>${esc(prof.name)}</h3>${xpBar(xp)}</div></div>
    <div class="mini-stats">
      <div><small>Academy</small><b>${lp.academy}%</b></div><div><small>ATC & Comms</small><b>${lp.atc}%</b></div>
      <div><small>Saved words</small><b>${store.get("fav", []).length}</b></div><div><small>Quiz best</small><b>${store.get("best", 0)}/10</b></div>
    </div>
    ${lp.next ? `<a class="btn small" href="#${lp.next[0]}">▶ Continue: ${esc(lp.next[1].title)}</a>` : `<p>🎉 All lessons complete!</p>`}
    ${CURRENT === "guest" ? `<p class="sub small">You're learning as a guest. <a href="#profile">Create a profile</a> to keep your own progress.</p>` : ""}`;

  const showTerm = (x, label) => {
    $("#dTerm").innerHTML = `<div class="label">${label}</div><h3 class="term-title">${esc(x.t)}</h3><div class="full">${esc(x.f || "")}</div><p>${esc(x.d)}</p>
      <div class="row"><button class="btn ghost small" id="dTermRnd">🎲 Random term</button><a class="term-link" data-term="${esc(x.t)}">Open in dictionary →</a></div>`;
    $("#dTermRnd").onclick = () => showTerm(shuffle(GLOSSARY)[0], "Random term");
  };
  showTerm(GLOSSARY[(dayIndex() * 7) % GLOSSARY.length], "Flight terminology · term of the day");

  const showAc = (a, label) => {
    $("#dAircraft").innerHTML = `<div class="label">${label}</div>
      <div class="ac-top"><span class="ac-ico">${AC_ICON[a.cat]}</span><span class="badge">${esc(AC_CATS[a.cat])}</span></div>
      <h3 class="term-title">${esc(a.name)}</h3><div class="ac-maker">${esc(a.maker)} · first flight ${a.year}</div>
      <div class="ac-stats"><div><small>Cruise</small><b>${fmt.speed(a.speed)}</b></div><div><small>Range</small><b>${fmt.range(a.range)}</b></div>
        <div><small>Seats</small><b>${fmt.seats(a.seats)}</b></div><div><small>Max weight</small><b>${fmt.mtow(a.mtow)}</b></div></div>
      <p class="small">${esc(a.fact)}</p>
      <div class="row"><button class="btn ghost small" id="dAcRnd">🎲 Another aircraft</button><a class="term-link" data-ac="${a.id}">Full profile →</a></div>`;
    $("#dAcRnd").onclick = () => showAc(shuffle(AIRCRAFT.filter((x) => x.id !== a.id))[0], "Aircraft profile");
  };
  showAc(AIRCRAFT[dayIndex() % AIRCRAFT.length], "Aircraft profile of the day");

  renderAirports();
  if (!$("#apCard").innerHTML) showAirport(AIRPORTS[dayIndex() % AIRPORTS.length]);

  $("#dOktas").innerHTML = [["SKC", "Clear", 0], ["FEW", "1–2 oktas", 2], ["SCT", "3–4 oktas", 4], ["BKN", "5–7 oktas", 6], ["OVC", "8 oktas", 8]]
    .map(([c, l, n]) => `<div class="okta"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15.915" class="ok-bg"/>
      <circle cx="20" cy="20" r="15.915" class="ok-fill" stroke-dasharray="${n / 8 * 100} 100" transform="rotate(-90 20 20)"/></svg><b>${c}</b><small>${l}</small></div>`).join("");

  const m = METAR_OF_DAY[dayIndex() % METAR_OF_DAY.length];
  const r = decodeMetar(m);
  $("#dMetar").innerHTML = `<div class="metar-raw">${esc(m)}</div>
    ${r.cat ? `<p><span class="cat-flag" style="background:${r.cat[1]};color:#fff">${r.cat[0]}</span>${esc(r.cat[2])}</p>` : ""}
    <ul class="small">${r.rows.slice(0, 7).map((x) => `<li><code>${esc(x.code)}</code> — ${esc(x.text)}</li>`).join("")}</ul>
    <a href="#academy" data-open-tool="metar" data-metar="${esc(m)}">Decode it fully in the Academy →</a>`;
}
function showAirport(a) {
  $("#apCard").innerHTML = `<div class="ap-card">
    <div class="ap-codes"><span title="ICAO code">${a.icao}</span><span title="IATA code">${a.iata}</span></div>
    <h3>${esc(a.name)}</h3><div class="sub small">${esc(a.city)}</div>
    <table class="spec-table"><tr><th>ICAO / IATA</th><td>${a.icao} / ${a.iata}</td></tr>
      <tr><th>Elevation (approx.)</th><td>${a.elev.toLocaleString()} ft (${Math.round(a.elev * 0.3048).toLocaleString()} m)</td></tr>
      <tr><th>Runways</th><td>${esc(a.rwy)}</td></tr></table>
    <p class="small">💡 ${esc(a.fact)}</p></div>`;
  $$("#apChips .chip").forEach((c) => c.classList.toggle("active", c.dataset.ap === a.icao));
}
function renderAirports() {
  const q = $("#apSearch").value.trim().toLowerCase();
  const list = AIRPORTS.filter((a) => !q || `${a.icao} ${a.iata} ${a.name} ${a.city}`.toLowerCase().includes(q));
  $("#apChips").innerHTML = list.map((a) => `<button class="chip" data-ap="${a.icao}">${a.icao}</button>`).join("") || `<span class="sub small">No airport found in this list.</span>`;
  if (q && list.length === 1) showAirport(list[0]);
}
function initDashboard() {
  $("#apSearch").addEventListener("input", renderAirports);
  $("#apChips").addEventListener("click", (e) => { const c = e.target.closest("[data-ap]"); if (c) showAirport(AIRPORTS.find((a) => a.icao === c.dataset.ap)); });
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-metar]"); if (a) { $("#metarIn").value = a.dataset.metar; renderMetar(); } });
  const tick = () => {
    const d = new Date();
    $("#dZulu").textContent = d.toISOString().slice(11, 19) + "Z";
    $("#dLocal").textContent = `Your local time: ${d.toLocaleTimeString()} · UTC date ${d.toISOString().slice(0, 10)}`;
  };
  tick(); setInterval(tick, 1000);
}

// ================= LEARNING ACCOUNTS (PROFILES) =================
// Profiles live on this device only (localStorage). Real online accounts would need a server with
// authentication — see the Community README note above for the same upgrade path.
const GOALS = ["Just curious", "Future student pilot", "Student pilot", "Aviation enthusiast", "Future air traffic controller", "Cabin crew / airline staff"];
function profileStats() {
  const lp = lessonProgress(), posts = loadPosts();
  return {
    ...lp, xp: store.get("xp", 0), best: store.get("best", 0), fav: store.get("fav", []).length, viewed: store.get("viewed", []).length,
    parts: store.get("partsFound", []).length, simBest: store.get("simBest", 0), simDone: store.get("simDone", false), exBest: store.get("exBest", 0),
    quizzes: store.get("quizHistory", []).length,
    posts: posts.filter(isMine).length,
    replies: posts.reduce((n, p) => n + p.replies.filter((r) => r.author === CURRENT).length, 0),
  };
}
const BADGES = [
  ["🎓", "First lesson", "Complete any lesson", (s) => s.done >= 1],
  ["🏫", "Academy graduate", "Complete every Academy lesson", (s) => s.academy === 100],
  ["🎧", "Radio ready", "Complete every ATC & Comms lesson", (s) => s.atc === 100],
  ["🗼", "Tower talk", "Finish the ATC simulator", (s) => s.simDone],
  ["🏆", "Quiz ace", "Score 10/10 in a quiz", (s) => s.best >= 10],
  ["📚", "Word collector", "Save 10 words", (s) => s.fav >= 10],
  ["🔎", "Curious mind", "Open 25 dictionary terms", (s) => s.viewed >= 25],
  ["🛩", "Plane spotter", "Discover every aircraft part", (s) => s.parts >= Object.keys(PARTS).length],
  ["💬", "Community voice", "Post a question or reply", (s) => s.posts + s.replies >= 1],
];
function switchProfile(id) { rawSet("sky_current", id); location.hash = "profile"; location.reload(); }
function renderProfile() {
  const prof = currentProfile(), s = profileStats(), profiles = store.get("profiles", []);
  const favs = store.get("fav", []);
  const hist = store.get("quizHistory", []).slice(-8).reverse();
  const myPosts = loadPosts().filter(isMine);
  const others = profiles.filter((p) => p.id !== CURRENT);

  const header = CURRENT === "guest" ? `
    <div class="card">
      <div class="label">Learning accounts</div>
      <h2 style="margin-top:0">Create your learning profile</h2>
      <p class="sub">Profiles keep your own progress, saved vocabulary, badges and community posts. They're stored on <b>this device</b> — use Export below to move your progress to another device.</p>
      <form id="pfCreate" class="pf-form" autocomplete="off">
        <input name="name" placeholder="Display name" maxlength="24" required>
        <select name="goal">${GOALS.map((g) => `<option>${esc(g)}</option>`).join("")}</select>
        <div class="avatar-pick">${AVATARS.map((a, i) => `<label><input type="radio" name="avatar" value="${a}" ${i === 0 ? "checked" : ""}><span>${a}</span></label>`).join("")}</div>
        <label class="toggle"><input type="checkbox" name="copy" ${s.xp > 0 || s.done > 0 ? "checked" : ""}> Copy my current guest progress into the new profile</label>
        <button class="btn">Create profile</button>
      </form>
    </div>` : `
    <div class="card pf-head">
      <span class="pf-avatar">${prof.avatar}</span>
      <div class="pf-main">
        <div class="label">Learning profile</div>
        <h2 style="margin:0">${esc(prof.name)}</h2>
        <div class="sub small">${esc(prof.goal || "")} · member since ${new Date(prof.created).toLocaleDateString()}</div>
        ${xpBar(s.xp)}
      </div>
      <div class="pf-actions">
        <button class="btn ghost small" id="pfRename">✎ Rename</button>
        <button class="btn ghost small" id="pfGuest">↩ Switch to guest</button>
        <button class="btn ghost small" id="pfDelete">🗑 Delete profile</button>
      </div>
    </div>`;

  $("#profileRoot").innerHTML = `${header}
    ${others.length ? `<div class="card mt"><div class="label">Profiles on this device</div><div class="chips">${others.map((p) => `<button class="chip" data-switch="${esc(p.id)}">${p.avatar} ${esc(p.name)}</button>`).join("")}</div></div>` : ""}
    <div class="grid pf-grid mt">
      <div class="card">
        <div class="label">Learning progress${CURRENT === "guest" ? " (guest)" : ""}</div>
        ${[["Academy lessons", s.academy, `${s.academy}%`], ["ATC & Comms lessons", s.atc, `${s.atc}%`],
           ["Dictionary terms opened", s.viewed / GLOSSARY.length * 100, `${s.viewed}/${GLOSSARY.length}`],
           ["Aircraft parts discovered", s.parts / Object.keys(PARTS).length * 100, `${s.parts}/${Object.keys(PARTS).length}`],
           ["ATC simulator best", s.simBest / SIM_STEPS.length * 100, `${s.simBest}/${SIM_STEPS.length}`],
           ["Quiz best", s.best * 10, `${s.best}/10`]].map(([l, p, v]) =>
           `<div class="progress-wrap"><span class="pw-label pf-l">${l}</span><div class="progress"><div class="bar" style="width:${Math.min(p, 100)}%"></div></div><span>${v}</span></div>`).join("")}
        ${s.next ? `<a class="btn small" href="#${s.next[0]}">▶ Next: ${esc(s.next[1].title)}</a>` : ""}
      </div>
      <div class="card">
        <div class="label">Badges · ${BADGES.filter((b) => b[3](s)).length}/${BADGES.length}</div>
        <div class="badges">${BADGES.map(([i, n, d, f]) => `<div class="badge-tile ${f(s) ? "earned" : ""}" title="${esc(d)}"><span>${i}</span><b>${esc(n)}</b><small>${esc(d)}</small></div>`).join("")}</div>
      </div>
      <div class="card">
        <div class="label">Saved vocabulary · ${favs.length}</div>
        ${favs.length ? `<div class="chips">${favs.map((t) => `<span class="chip vocab"><a class="term-link" data-term="${esc(t)}">${esc(t)}</a><button data-unfav="${esc(t)}" title="Remove">✕</button></span>`).join("")}</div>
          <button class="btn small" id="pfFlash">🃏 Practise saved words as flashcards</button>`
          : `<p class="sub">No saved words yet. Tap ☆ on any term in the <a href="#dictionary">Dictionary</a> to save it here.</p>`}
      </div>
      <div class="card">
        <div class="label">Recent quizzes · ${s.quizzes} taken</div>
        ${hist.length ? `<div class="quiz-hist">${hist.map((h) => `<div><b>${h.score}/${h.total}</b><small>${timeAgo(h.ts)}</small></div>`).join("")}</div>` : `<p class="sub">No quizzes yet — <a href="#quiz">take your first Knowledge Check</a>.</p>`}
      </div>
      <div class="card">
        <div class="label">Community discussions · ${s.posts} questions · ${s.replies} replies</div>
        ${myPosts.length ? `<ul class="pf-posts">${myPosts.map((p) => `<li><a class="term-link" data-thread="${esc(p.id)}">${esc(p.title)}</a> <span class="sub small">· ${p.replies.length} repl${p.replies.length === 1 ? "y" : "ies"}</span></li>`).join("")}</ul>` : `<p class="sub">You haven't asked anything yet. <a href="#community">Visit the Community</a>.</p>`}
      </div>
      <div class="card">
        <div class="label">Your data</div>
        <p class="sub small">Download your progress as a file, or load it on another device or browser.</p>
        <div class="row"><button class="btn ghost small" id="pfExport">⬇ Export progress</button>
          <label class="btn ghost small file-btn">⬆ Import progress<input type="file" id="pfImport" accept=".json,application/json" hidden></label></div>
      </div>
    </div>`;

  const create = $("#pfCreate");
  if (create) create.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(create), name = fd.get("name").trim();
    if (!name) return;
    const id = "u" + Date.now().toString(36);
    rawSet("sky_profiles", [...profiles, { id, name, avatar: fd.get("avatar"), goal: fd.get("goal"), created: Date.now() }]);
    if (fd.get("copy")) USER_KEYS.forEach((k) => { const v = rawGet(keyFor(k, "guest"), null); if (v !== null) rawSet(keyFor(k, id), v); });
    switchProfile(id);
  };
  $$("[data-switch]").forEach((b) => b.onclick = () => switchProfile(b.dataset.switch));
  const g = $("#pfGuest"); if (g) g.onclick = () => switchProfile("guest");
  const rn = $("#pfRename");
  if (rn) rn.onclick = () => {
    const name = prompt("New display name:", prof.name);
    if (!name || !name.trim()) return;
    rawSet("sky_profiles", profiles.map((p) => (p.id === CURRENT ? { ...p, name: name.trim().slice(0, 24) } : p)));
    location.reload();
  };
  const del = $("#pfDelete");
  if (del) del.onclick = () => {
    if (!confirm(`Delete the profile "${prof.name}" and all its progress on this device? This can't be undone.`)) return;
    USER_KEYS.forEach((k) => localStorage.removeItem(keyFor(k)));
    rawSet("sky_profiles", profiles.filter((p) => p.id !== CURRENT));
    switchProfile("guest");
  };
  $$("[data-unfav]").forEach((b) => b.onclick = () => { toggleFav(b.dataset.unfav); renderProfile(); });
  $$("[data-thread]").forEach((a) => a.onclick = (e) => { e.preventDefault(); openThread(a.dataset.thread); });
  const fl = $("#pfFlash");
  if (fl) fl.onclick = () => { fc.cat = "fav"; renderFlashFilters(); buildDeck(); location.hash = "quiz"; $('#quizTabs [data-q="flash"]').click(); };
  $("#pfExport").onclick = () => {
    const data = { app: "AeroLearn", version: 1, exported: new Date().toISOString(), profile: prof, data: Object.fromEntries(USER_KEYS.map((k) => [k, store.get(k, null)])) };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `aerolearn-progress-${prof.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "guest"}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Progress exported");
  };
  $("#pfImport").onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const j = JSON.parse(await file.text());
      if (j.app !== "AeroLearn" || typeof j.data !== "object") throw new Error("not an AeroLearn file");
      if (!confirm(`Replace ${prof.name}'s progress with the data from "${file.name}"?`)) return;
      USER_KEYS.forEach((k) => { if (k in j.data && j.data[k] !== null) store.set(k, j.data[k]); });
      location.reload();
    } catch (err) { toast("Couldn't import: " + err.message); }
  };
}
// keep the account chip highlighted on the profile page
window.addEventListener("hashchange", () => $(".account-chip").classList.toggle("active", location.hash === "#profile"));

// ================= Cockpit animation (heading tape + attitude indicator) =================
function initCockpit() {
  const PX = 4; // pixels per degree on the heading tape
  const track = $("#hdgTrack");
  let html = "";
  for (let d = 0; d <= 1080; d += 5) {
    const deg = d % 360;
    html += `<div class="hdg-tick ${deg % 10 === 0 ? "major" : ""}" style="left:${d * PX}px"></div>`;
    if (deg % 30 === 0) {
      const lbl = { 0: "N", 90: "E", 180: "S", 270: "W" }[deg] ?? String(deg / 10).padStart(2, "0");
      html += `<div class="hdg-num ${"NESW".includes(lbl) ? "cardinal" : ""}" style="left:${d * PX}px">${lbl}</div>`;
    }
  }
  track.innerHTML = html;

  const els = { roll: $("#aiRoll"), pitch: $("#aiPitch"), ias: $("#roIas"), alt: $("#roAlt"), vs: $("#roVs"), read: $("#hdgRead"), tape: $(".hdg-tape") };
  let hdg = 350, last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const t = now / 1000;
    const bank = 18 * Math.sin(t * 0.35);
    const pitch = 4 * Math.sin(t * 0.5 + 1);
    hdg = (hdg + bank * 0.25 * dt + 360) % 360;
    els.roll.setAttribute("transform", `rotate(${-bank})`);
    els.pitch.setAttribute("transform", `translate(0 ${pitch * 2})`);
    els.ias.textContent = Math.round(250 + 4 * Math.sin(t * 0.3));
    els.alt.textContent = Math.round(35000 + 120 * Math.sin(t * 0.2));
    els.vs.textContent = Math.round((1440 * Math.cos(t * 0.2)) / 10) * 10;
    els.read.textContent = String(Math.round(hdg) % 360).padStart(3, "0");
    track.style.transform = `translateX(${els.tape.clientWidth / 2 - (hdg + 360) * PX}px)`;
    if (!reduce) requestAnimationFrame(frame);
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(frame);
}

// ================= Init =================
initCockpit();
renderHome();
renderLessons("#academyLessons", ACADEMY_LESSONS, "academy");
renderLessons("#atcLessons", ATC_LESSONS, "atc");
renderAtcSteps();
startRadioSim();
initAircraft();
initCommunity();
initSim();
initExplorer();
initDashboard();
$(".account-chip").classList.toggle("active", location.hash === "#profile");
renderGlossaryFilters();
renderGlossary();
renderPhonetic();
renderMetar();
renderSpectrum();
updateAxes();
renderConverter();
renderSquawk();
startQuiz();
renderFlashFilters();
buildDeck();
initTheme();
route();

// ---- Day / night theme (choice stored in localStorage as "sky_theme") ----
function initTheme() {
  const btn = document.getElementById("themeToggle");
  const sync = () => {
    const night = document.documentElement.dataset.theme === "night";
    btn.textContent = night ? "☀️" : "🌙";
    btn.title = btn.ariaLabel = night ? "Switch to day mode" : "Switch to night mode";
  };
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "night" ? "day" : "night";
    document.documentElement.dataset.theme = next;
    rawSet("sky_theme", next);
    sync();
  });
  sync();
}

// ================= Cockpit Instrument Lab =================
// Four of the "six pack" instruments drawn as SVG. Controls set the aircraft state directly;
// "Fly" links them: bank turns the aircraft (standard rate-of-turn formula) and pitch climbs/descends.
const LAB_INFO = {
  asi: {
    name: "Airspeed indicator", term: "ASI",
    shows: "How fast the aircraft is moving through the air, in knots (indicated airspeed).",
    works: "Compares ram-air pressure from the {{Pitot tube|pitot tube}} with still air pressure from the {{Static port|static ports}}. The faster you fly, the bigger the difference.",
    read: "Read the number the needle points at. The coloured arcs matter more than the exact number: <b>white</b> = flaps may be used, <b>green</b> = normal operating range, <b>yellow</b> = caution (smooth air only), <b>red line</b> = never exceed.",
    watch: "If the pitot tube ices up, the airspeed can freeze or behave like an altimeter. That's why it's heated.",
  },
  ai: {
    name: "Attitude indicator", term: "Attitude indicator", aka: "Artificial horizon",
    shows: "The aircraft's pitch (nose up or down) and bank (wings tilted left or right) compared with the real horizon.",
    works: "A spinning gyroscope (or electronic sensors in modern aircraft) keeps the horizon card level while the aircraft moves around it.",
    read: "The small aircraft symbol is <b>you</b> and it never moves. Blue is sky, the other colour is ground. If the symbol is above the horizon line, the nose is up. The pointer at the top shows bank against marks at 10°, 20°, 30°, 45° and 60°.",
    watch: "It's the most important instrument in cloud. Pilots scan it constantly and cross-check everything else against it.",
  },
  alt: {
    name: "Altimeter", term: "Altimeter",
    shows: "Height above sea level in feet, as long as the correct pressure (QNH) is set in the little window.",
    works: "It's a barometer. Air pressure drops as you climb, and the altimeter turns that pressure into feet using the {{Static port|static ports}}.",
    read: "Like a clock: the <b>long thin hand</b> counts hundreds of feet (one lap = 1,000 ft), the <b>short wide hand</b> counts thousands, and the small triangle at the rim counts ten-thousands. Read the short hand first, then the long hand.",
    watch: "Mixing up the hands means a 1,000 ft mistake, one of the classic reading errors. Always check the pressure setting too.",
  },
  hdg: {
    name: "Heading indicator", term: "Heading indicator", aka: "Directional gyro",
    shows: "Which way the nose is pointing, in degrees (000–359). 090 is east, 180 south, 270 west, 360 north.",
    works: "A gyroscope keeps the compass card steady, so unlike the magnetic compass it doesn't swing during turns or speed changes.",
    read: "Read the number under the line at the top. Numbers are shown in tens without the last zero: <b>3</b> means 030°, <b>24</b> means 240°.",
    watch: "Gyros slowly drift, so pilots line it up with the magnetic compass every 15 minutes or so in steady flight.",
  },
};
const lab = { pitch: 0, bank: 0, spd: 110, alt: 3000, hdg: 0, flying: false, last: 0, sel: "ai", q: null, score: 0, asked: 0 };
const labPolar = (r, a) => [+(r * Math.sin(a * Math.PI / 180)).toFixed(2), +(-r * Math.cos(a * Math.PI / 180)).toFixed(2)];
const labArc = (r, a1, a2) => { const [x1, y1] = labPolar(r, a1), [x2, y2] = labPolar(r, a2); return `M${x1} ${y1} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
const labLine = (r1, r2, a, cls) => { const [x1, y1] = labPolar(r1, a), [x2, y2] = labPolar(r2, a); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`; };
const labTicks = (n, step, r1, r2Fn, cls) => Array.from({ length: n }, (_, i) => labLine(r1, r2Fn(i), i * step, cls)).join("");
const asiAngle = (v) => Math.max(0, Math.min(v, 200)) * 1.6;
const labVS = () => Math.round(lab.spd * 101.27 * Math.sin(lab.pitch * Math.PI / 180) * 0.5);
const labTurn = () => lab.spd < 20 ? 0 : 1091 * Math.tan(lab.bank * Math.PI / 180) / Math.max(lab.spd, 40);
const fmtHdg = (h) => String(Math.round(h) % 360 || 360).padStart(3, "0");

function buildLabPanel() {
  const bezel = `<circle r="97" class="li-bezel"/><circle r="86" class="li-face"/>`;
  // Airspeed indicator (0–200 kt over 320°)
  const asiNums = Array.from({ length: 10 }, (_, i) => { const v = i * 20, [x, y] = labPolar(60, asiAngle(v)); return v ? `<text x="${x}" y="${y}" class="li-num">${v}</text>` : ""; }).join("");
  const asi = `<svg viewBox="-100 -100 200 200">${bezel}
    <path d="${labArc(74, asiAngle(40), asiAngle(85))}" class="li-arc white"/>
    <path d="${labArc(80, asiAngle(50), asiAngle(129))}" class="li-arc green"/>
    <path d="${labArc(80, asiAngle(129), asiAngle(163))}" class="li-arc yellow"/>
    ${labLine(70, 86, asiAngle(163), "li-redline")}
    ${labTicks(21, 16, 86, (i) => (i % 2 ? 79 : 74), "li-tick")}${asiNums}
    <text y="-30" class="li-cap">AIRSPEED</text><text y="-19" class="li-cap">KNOTS</text>
    <g id="labAsiNeedle"><path d="M-3 12 L0 -78 L3 12 Z" class="li-needle"/></g><circle r="6" class="li-hub"/></svg>`;
  // Attitude indicator (2.6 px per degree of pitch)
  const k = 2.6, ladder = [5, 10, 15, 20].flatMap((d) => [d, -d]).map((d) => {
    const w = d % 10 ? 12 : 24, y = -d * k;
    return `<line x1="${-w}" y1="${y}" x2="${w}" y2="${y}"/>${d % 10 ? "" : `<text x="${w + 9}" y="${y + 3}">${Math.abs(d)}</text><text x="${-w - 9}" y="${y + 3}">${Math.abs(d)}</text>`}`; }).join("");
  const bankMarks = [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60].map((a) => labLine(78, a % 30 ? 84 : 88, a, "li-tick")).join("");
  const ai = `<svg viewBox="-100 -100 200 200">${bezel}
    <defs><clipPath id="labAiClip"><circle r="86"/></clipPath></defs>
    <g clip-path="url(#labAiClip)"><g id="labAiRoll"><g id="labAiPitch">
      <rect x="-250" y="-400" width="500" height="400" class="li-sky"/><rect x="-250" y="0" width="500" height="400" class="li-ground"/>
      <line x1="-250" y1="0" x2="250" y2="0" class="li-horizon"/><g class="li-ladder">${ladder}</g></g>
      <path d="M0 -76 L-6 -66 L6 -66 Z" class="li-bankptr"/></g></g>
    ${bankMarks}<path d="M0 -78 L-6 -90 L6 -90 Z" class="li-index"/>
    <path d="M-52 0 H-18 L-9 9 M52 0 H18 L9 9" class="li-plane"/><circle r="3.5" class="li-plane-dot"/></svg>`;
  // Altimeter
  const altNums = Array.from({ length: 10 }, (_, i) => { const [x, y] = labPolar(62, i * 36); return `<text x="${x}" y="${y}" class="li-num big">${i}</text>`; }).join("");
  const alt = `<svg viewBox="-100 -100 200 200">${bezel}
    ${labTicks(50, 7.2, 86, (i) => (i % 5 ? 80 : 74), "li-tick")}${altNums}
    <text y="-26" class="li-cap">ALT</text><text y="-15" class="li-cap">100 FEET</text>
    <rect x="22" y="-8" width="40" height="16" rx="2" class="li-window"/><text x="42" y="0" class="li-wintext">1013</text><text x="42" y="18" class="li-cap small">hPa</text>
    <g id="labAlt10k"><path d="M0 -86 L-5 -74 L5 -74 Z" class="li-needle"/></g>
    <g id="labAlt1k"><path d="M-6 6 L-5 -38 L0 -48 L5 -38 L6 6 Z" class="li-needle wide"/></g>
    <g id="labAlt100"><path d="M-2.5 14 L0 -80 L2.5 14 Z" class="li-needle"/></g><circle r="6" class="li-hub"/></svg>`;
  // Heading indicator (rotating card)
  const card = labTicks(72, 5, 86, (i) => (i % 2 ? 80 : 74), "li-tick") + "N 3 6 E 12 15 S 21 24 W 30 33".split(" ").map((t, i) =>
    `<text transform="rotate(${i * 30}) translate(0 -60)" class="li-num${i % 3 ? "" : " big cardinal"}">${t}</text>`).join("");
  const hdg = `<svg viewBox="-100 -100 200 200">${bezel}
    <g id="labHdgCard">${card}</g>
    ${[45, 135, 225, 315].map((a) => `<path transform="rotate(${a})" d="M0 -87 L-4 -94 L4 -94 Z" class="li-index soft"/>`).join("")}
    <path d="M0 -84 L-6 -95 L6 -95 Z" class="li-index"/><line x1="0" y1="-86" x2="0" y2="-70" class="li-lubber"/>
    <path d="M0 -26 C3 -26 3 -20 3 -14 L3 -6 L28 4 L28 9 L3 4 L3 18 L11 24 L11 28 L0 25 L-11 28 L-11 24 L-3 18 L-3 4 L-28 9 L-28 4 L-3 -6 L-3 -14 C-3 -20 -3 -26 0 -26 Z" class="li-planeicon"/></svg>`;
  const insts = { asi, ai, alt, hdg };
  $("#labPanel").innerHTML = ["asi", "ai", "alt", "hdg"].map((key) =>
    `<button type="button" class="lab-inst" data-inst="${key}" aria-label="${LAB_INFO[key].name}">${insts[key]}<span>${LAB_INFO[key].name}</span></button>`).join("") +
    `<div class="readouts lab-readouts"><div class="readout"><small>V/S FPM</small><b id="labVS">0</b></div><div class="readout"><small>TURN °/S</small><b id="labTR">0.0</b></div><div class="readout"><small>STATUS</small><b id="labStat" class="pink">OK</b></div></div>`;
}

function renderLab() {
  const s = lab;
  $("#labAsiNeedle").setAttribute("transform", `rotate(${asiAngle(s.spd)})`);
  $("#labAiRoll").setAttribute("transform", `rotate(${-s.bank})`);
  $("#labAiPitch").setAttribute("transform", `translate(0 ${s.pitch * 2.6})`);
  $("#labAlt100").setAttribute("transform", `rotate(${(s.alt % 1000) * 0.36})`);
  $("#labAlt1k").setAttribute("transform", `rotate(${(s.alt % 10000) * 0.036})`);
  $("#labAlt10k").setAttribute("transform", `rotate(${s.alt * 0.0036})`);
  $("#labHdgCard").setAttribute("transform", `rotate(${-s.hdg})`);
  const vs = labVS(), tr = labTurn();
  $("#labVS").textContent = (vs > 0 ? "+" : "") + (Math.round(vs / 10) * 10);
  $("#labTR").textContent = Math.abs(tr).toFixed(1) + (tr > 0.05 ? " R" : tr < -0.05 ? " L" : "");
  const stall = s.spd < 52 && s.alt > 0, fast = s.spd > 163;
  $("#labStat").textContent = stall ? "STALL" : fast ? "VNE!" : s.alt <= 0 ? "GROUND" : "OK";
  $("#labStat").parentElement.classList.toggle("warn", stall || fast);
  // Keep the sliders in step with the state (they move by themselves while flying)
  const set = (id, v, txt) => { $("#" + id).value = v; $("#" + id + "V").textContent = txt; };
  set("labPitch", s.pitch, (s.pitch > 0 ? "+" : "") + s.pitch + "°");
  set("labBank", s.bank, s.bank ? `${Math.abs(s.bank)}° ${s.bank < 0 ? "L" : "R"}` : "0°");
  set("labSpd", Math.round(s.spd), Math.round(s.spd) + " kt");
  set("labAlt", Math.round(s.alt), Math.round(s.alt).toLocaleString("en-US") + " ft");
  set("labHdg", Math.round(s.hdg) % 360, fmtHdg(s.hdg) + "°");
  if (!s.q) renderLabInfo(); // don't give away quiz answers
}

function labNow(key) {
  const s = lab, a = Math.round(s.alt);
  if (key === "asi") {
    const v = Math.round(s.spd), band = v >= 163 ? "past the red line, faster than the aircraft is ever allowed to fly" : v >= 129 ? "in the yellow arc: caution, smooth air only" : v >= 50 ? "in the green arc, the normal operating range" : v >= 40 ? "in the white arc only, below normal flying speed with flaps up" : "below the arcs, too slow to fly";
    return `${v} kt, ${band}.`;
  }
  if (key === "ai") {
    const p = s.pitch > 1 ? `nose ${s.pitch}° up` : s.pitch < -1 ? `nose ${-s.pitch}° down` : "nose level";
    const b = Math.abs(s.bank) > 2 ? `banked ${Math.abs(s.bank)}° ${s.bank < 0 ? "left" : "right"}` : "wings level";
    return `${p}, ${b}.`;
  }
  if (key === "alt") return `${a.toLocaleString("en-US")} ft: short hand at ${(a % 10000 / 1000).toFixed(1)} (thousands), long hand at ${(a % 1000 / 100).toFixed(1)} (hundreds).`;
  return `${fmtHdg(s.hdg)}°, roughly ${["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(s.hdg / 45) % 8]}.`;
}
// Turn {{Term|label}} into dictionary links (same markup the lessons use).
const labTerms = (html) => html.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (_, t, label) => `<a class="term-link" data-term="${esc(t)}">${esc(label || t)}</a>`);

function renderLabInfo() {
  const key = lab.sel, d = LAB_INFO[key];
  $$(".lab-inst").forEach((b) => b.classList.toggle("sel", b.dataset.inst === key));
  $("#labInfo").innerHTML = `<div class="label">${esc(d.name)}${d.aka ? ` · ${esc(d.aka)}` : ""}</div>
    ${lab.q && !lab.q.done ? "" : `<p class="lab-now"><b>Right now:</b> ${esc(labNow(key))}</p>`}
    <div class="lab-facts"><div><h5>What it shows</h5><p>${d.shows}</p></div><div><h5>How it works</h5><p>${labTerms(d.works)}</p></div>
    <div><h5>How to read it</h5><p>${d.read}</p></div><div><h5>Watch out</h5><p>${d.watch}</p></div></div>
    <a class="term-link" data-term="${esc(d.term)}">Open "${esc(d.term)}" in the dictionary →</a>`;
}

function labLoop(t) {
  if (!lab.flying) return;
  if (!$("#labPanel").offsetParent) { labStop(); return; } // tool hidden or page changed
  const dt = Math.min((t - (lab.last || t)) / 1000, 0.1); lab.last = t;
  lab.hdg = (lab.hdg + labTurn() * dt + 360) % 360;
  lab.alt = Math.max(0, Math.min(12000, lab.alt + labVS() / 60 * dt));
  const target = Math.max(0, 115 - lab.pitch * 4 - Math.abs(lab.bank) * 0.3); // nose up bleeds speed, nose down gains it
  lab.spd += (target - lab.spd) * Math.min(1, 0.3 * dt);
  renderLab();
  requestAnimationFrame(labLoop);
}
function labStop() { lab.flying = false; $("#labFly").textContent = "▶ Fly"; $("#labFly").classList.remove("on"); }

// ---- "Read the instruments" practice ----
const LAB_Q = ["alt", "hdg", "asi", "ai"];
function labNewQuestion() {
  labStop();
  const type = LAB_Q[lab.asked % 4], r = (lo, hi, step) => lo + step * Math.floor(Math.random() * ((hi - lo) / step + 1));
  const uniq = (v, i, arr) => arr.indexOf(v) === i;
  let answer, opts, prompt, why;
  if (type === "alt") {
    lab.alt = r(1050, 9850, 50); lab.pitch = 0; lab.bank = 0;
    const a = lab.alt, th = Math.floor(a / 1000), hu = a % 1000, swapped = Math.floor(hu / 100) * 1000 + th * 100 + (a % 100);
    opts = [a, swapped, a + 1000, a - 500, a - 1000, a + 500].filter((v) => v > 0).filter(uniq).slice(0, 4).map((v) => [v, v.toLocaleString("en-US") + " ft"]);
    answer = a; prompt = "What altitude is the <b>altimeter</b> showing?";
    why = `Short hand past ${th} → ${th},000 ft. Long hand at ${(hu / 100).toFixed(1)} → ${hu} ft. Total ${a.toLocaleString("en-US")} ft.`;
  } else if (type === "hdg") {
    lab.hdg = r(10, 350, 10); lab.bank = 0;
    const h = lab.hdg; answer = h;
    opts = [h, (h + 180) % 360, (h + 30) % 360, (360 - h) % 360, (h + 330) % 360].filter(uniq).slice(0, 4).map((v) => [v, fmtHdg(v) + "°"]);
    prompt = "What heading is the <b>heading indicator</b> showing?";
    why = `The number under the top line is ${fmtHdg(h)}°. ${h % 30 ? "It sits between two numbers, so count the long ticks (10° each) from the nearest one." : `The card shows "${h / 10}", which means ${fmtHdg(h)}° (the last zero is left off).`}`;
  } else if (type === "asi") {
    lab.spd = r(45, 175, 5); lab.pitch = 0; lab.bank = 0;
    const v = lab.spd; answer = v;
    opts = [v, ...shuffle([v + 10, v - 10, v + 20, v - 20].filter((x) => x > 0)).slice(0, 3)].map((x) => [x, x + " kt"]);
    prompt = "What is the <b>indicated airspeed</b>?";
    why = `The needle points at ${v} kt, ${labNow("asi").replace(/^\d+ kt, /, "")}`;
  } else {
    const ps = [-8, 0, 10], bs = [-30, 0, 30];
    const words = (p, b) => `${p > 0 ? "Nose up" : p < 0 ? "Nose down" : "Nose level"}, ${b < 0 ? "banked left" : b > 0 ? "banked right" : "wings level"}`;
    do { lab.pitch = ps[Math.random() * 3 | 0]; lab.bank = bs[Math.random() * 3 | 0]; } while (!lab.pitch && !lab.bank);
    answer = words(lab.pitch, lab.bank);
    opts = [answer, ...shuffle(ps.flatMap((p) => bs.map((b) => words(p, b))).filter((w) => w !== answer)).slice(0, 3)].map((w) => [w, w]);
    prompt = "What is the aircraft doing, according to the <b>attitude indicator</b>?";
    why = "The little aircraft symbol above the horizon line means nose up, below means nose down. The horizon tilts the opposite way to the bank, so if its right side is lower you're banked left. The pointer at the top shows the same thing.";
  }
  lab.sel = type;
  lab.q = { answer, why, tried: false, done: false };
  lab.asked++;
  renderLab(); renderLabInfo();
  $("#labQuiz").innerHTML = `<p>${prompt}</p><div class="q-opts lab-opts">${shuffle(opts).map(([v, label]) => `<button type="button" class="q-opt" data-v="${esc(v)}">${esc(label)}</button>`).join("")}</div>
    <p class="tip hidden" id="labWhy"></p><div class="row"><span class="lab-score">Score ${lab.score} / ${lab.asked - 1}</span><button class="btn ghost" id="labNext" type="button">Skip →</button></div>`;
  $("#labPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function labAnswer(btn) {
  const q = lab.q; if (!q || q.done) return;
  const ok = btn.dataset.v === String(q.answer);
  btn.classList.add(ok ? "right" : "wrong");
  const why = $("#labWhy"); why.classList.remove("hidden");
  if (ok) {
    q.done = true;
    if (!q.tried) { lab.score++; addXP(3, "Instrument read"); }
    why.textContent = "✅ " + q.why;
    $(".lab-score").textContent = `Score ${lab.score} / ${lab.asked}`;
    $("#labNext").textContent = "Next question →";
    renderLabInfo();
  } else {
    q.tried = true;
    why.textContent = "Not quite. Look again, and check the reading tips below the instruments.";
  }
}

function initInstrumentLab() {
  buildLabPanel();
  $("#labPanel").addEventListener("click", (e) => { const b = e.target.closest(".lab-inst"); if (b) { lab.sel = b.dataset.inst; renderLabInfo(); } });
  const bind = (id, key) => $("#" + id).addEventListener("input", (e) => { lab[key] = +e.target.value; lab.q = null; renderLab(); });
  bind("labPitch", "pitch"); bind("labBank", "bank"); bind("labSpd", "spd"); bind("labAlt", "alt"); bind("labHdg", "hdg");
  $("#labFly").onclick = () => {
    if (lab.flying) { labStop(); return; }
    lab.flying = true; lab.last = 0; lab.q = null;
    $("#labFly").textContent = "⏸ Pause"; $("#labFly").classList.add("on");
    requestAnimationFrame(labLoop);
  };
  const PRESETS = { cruise: [0, 0, 115], climb: [8, 0, 85], descent: [-5, 0, 135], left: [1, -25, 105], right: [1, 25, 105], slow: [12, 0, 55] };
  $("#labPreset").onchange = (e) => {
    const p = PRESETS[e.target.value]; if (!p) return;
    [lab.pitch, lab.bank, lab.spd] = p; lab.q = null; e.target.value = "";
    renderLab();
  };
  $("#labQuiz").addEventListener("click", (e) => {
    const o = e.target.closest(".q-opt"); if (o) { labAnswer(o); return; }
    if (e.target.id === "labNext" || e.target.id === "labStart") labNewQuestion();
  });
  $("#labQuiz").innerHTML = `<p class="sub">The lab sets the instruments to a random reading and you say what they show. 3 XP for each one you get right first time.</p><button class="btn" id="labStart" type="button">Start reading practice</button>`;
  renderLab();
}
initInstrumentLab(); // after the lab constants above are defined

// ================= Interactive Aviation Laboratory =================
// Shared helpers for the Lab page experiments (Four Forces, Aerodynamics, Engines).
const SVGNS = "http://www.w3.org/2000/svg";
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Piecewise-linear lookup in [[x, value], ...] (sorted by x).
const pw = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
};
// One-time XP per profile for each experiment milestone.
function labAward(key, msg) {
  const done = store.get("labDone", []);
  if (done.includes(key)) return;
  done.push(key); store.set("labDone", done); addXP(5, msg);
}
const isNight = () => document.documentElement.dataset.theme === "night";

// ---------- Four Forces Simulator ----------
// Two modes: "direct" sets the four forces straight from the sliders; "real" sets throttle, angle of attack and weight,
// and lift/drag come from speed² × coefficient, so the aircraft settles where the forces balance.
const FF = { mode: "direct", L: 60, D: 30, T: 30, W: 60, thr: 52, aoa: 4, spd: 100, vs: 0, alt: 3000, scroll: 0 };
const FF_SLIDERS = {
  direct: [["L", "Lift", 0, 100], ["W", "Weight", 20, 100], ["T", "Thrust", 0, 100], ["D", "Drag", 0, 100]],
  real: [["thr", "Throttle (thrust)", 0, 100, "%"], ["aoa", "Angle of attack", -4, 20, "°"], ["W", "Weight (load)", 30, 90]],
};
const FF_PRESETS = {
  direct: [
    ["Steady cruise", { L: 60, W: 60, T: 30, D: 30 }], ["Climb", { L: 72, W: 60, T: 45, D: 30 }], ["Descend", { L: 48, W: 60, T: 25, D: 30 }],
    ["Speed up", { L: 60, W: 60, T: 55, D: 30 }], ["Engine off", { L: 56, W: 60, T: 0, D: 25 }], ["Overloaded", { L: 60, W: 95, T: 30, D: 30 }],
  ],
  real: [
    ["Steady cruise", { thr: 52, aoa: 4, W: 60 }, { spd: 100, alt: 3000, vs: 0 }], ["Takeoff", { thr: 100, aoa: 8, W: 60 }, { spd: 0, alt: 0, vs: 0 }],
    ["Full power climb", { thr: 95, aoa: 6, W: 60 }], ["Engine off (glide)", { thr: 0, aoa: 4, W: 60 }],
    ["Stall", { thr: 35, aoa: 17, W: 60 }, { spd: 75 }], ["Heavy load", { thr: 52, aoa: 4, W: 85 }],
  ],
};
const ffCL = (a) => (a <= 15 ? 0.2 + 0.1 * a : Math.max(0.6, 1.7 - 0.12 * (a - 15)));
function ffForces() {
  if (FF.mode !== "real") return;
  const cl = ffCL(FF.aoa), cd = 0.03 + 0.06 * cl * cl + (FF.aoa > 15 ? 0.15 : 0), q = FF.spd * FF.spd;
  FF.T = 0.6 * FF.thr; FF.L = 0.01 * q * cl; FF.D = 0.06 * q * cd;
}
function ffStep(dt) {
  ffForces();
  // Speed: thrust minus drag accelerates; climbing trades speed for height (and diving the reverse).
  FF.spd = clamp(FF.spd + ((FF.T - FF.D) / FF.W * 25 - FF.vs * 0.003) * dt, 0, 250);
  const target = clamp((FF.L - FF.W) / FF.W * 4000, -3000, 3000);
  FF.vs += (target - FF.vs) * Math.min(1, 1.5 * dt);
  FF.alt += FF.vs / 60 * dt * 3; // sped up ×3 so height changes are easy to see
  if (FF.alt <= 0) { FF.alt = 0; FF.vs = Math.max(FF.vs, 0); }
  if (FF.alt >= 9000) { FF.alt = 9000; FF.vs = Math.min(FF.vs, 0); }
  FF.scroll += FF.spd * dt * 1.4;
  ffRender();
}
function ffBuildScene() {
  const clouds = (n, y0, s) => Array.from({ length: n }, (_, i) => {
    const x = i * (1280 / n) + (i % 2) * 70, y = y0 + (i % 3) * 22;
    return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="34" ry="13"/><ellipse cx="-20" cy="5" rx="22" ry="10"/><ellipse cx="22" cy="5" rx="24" ry="10"/></g>`; }).join("");
  const arrow = (id, cls) => `<g id="${id}" class="ff-arrow ${cls}"><line/><polygon/><text/></g>`;
  $("#ffScene").innerHTML = `
    <defs><linearGradient id="ffSkyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ff-sky1"/><stop offset="1" class="ff-sky2"/></linearGradient></defs>
    <rect width="640" height="320" fill="url(#ffSkyG)"/>
    <g id="ffClouds2" class="ff-clouds far">${clouds(6, 40, 0.7)}</g>
    <g id="ffClouds1" class="ff-clouds">${clouds(5, 230, 1)}</g>
    <g id="ffGround"><rect x="0" y="0" width="640" height="400" class="ff-ground"/><rect x="0" y="0" width="640" height="16" class="ff-runway"/><line x1="0" y1="8" x2="640" y2="8" id="ffDash" class="ff-dash"/></g>
    <g id="ffPlane" class="ff-plane">
      <path d="M-62 -4 Q-60 -12 -40 -12 L40 -10 Q62 -8 66 0 Q62 8 40 8 L-40 8 Q-58 8 -62 4 Z" class="ff-body"/>
      <path d="M-58 -8 L-72 -34 L-60 -34 L-40 -10 Z" class="ff-tail"/><path d="M-66 -1 L-40 -1 L-40 3 L-66 3 Z" class="ff-tail"/>
      <path d="M-14 -2 L22 -2 L18 3 L-18 3 Z" class="ff-wing"/>
      <path d="M8 -10 Q20 -18 34 -10 Z" class="ff-window"/>
      <line x1="0" y1="8" x2="-4" y2="22" class="ff-gear"/><circle cx="-4" cy="22" r="4" class="ff-wheel"/><line x1="44" y1="6" x2="46" y2="22" class="ff-gear"/><circle cx="46" cy="22" r="3.5" class="ff-wheel"/>
      <ellipse id="ffProp" cx="68" cy="0" rx="3" ry="22" class="ff-prop"/>
    </g>
    ${arrow("ffArrL", "lift")}${arrow("ffArrW", "weight")}${arrow("ffArrT", "thrust")}${arrow("ffArrD", "drag")}${arrow("ffArrN", "net")}`;
}
function ffArrow(id, x1, y1, x2, y2, label, lx, ly) {
  const g = $("#" + id), len = Math.hypot(x2 - x1, y2 - y1);
  g.style.display = len < 3 ? "none" : "";
  if (len < 3) return;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len, hx = x2 - ux * 10, hy = y2 - uy * 10;
  const ln = $("line", g); ln.setAttribute("x1", x1); ln.setAttribute("y1", y1); ln.setAttribute("x2", hx); ln.setAttribute("y2", hy);
  $("polygon", g).setAttribute("points", `${x2},${y2} ${hx - uy * 7},${hy + ux * 7} ${hx + uy * 7},${hy - ux * 7}`);
  const t = $("text", g); t.setAttribute("x", lx ?? x2); t.setAttribute("y", ly ?? y2); t.textContent = label;
}
function ffRender() {
  const cx = 320, cy = 150, s = 1.1, f = FF;
  const gamma = Math.atan2(f.vs / 101.27, Math.max(f.spd, 1)) * 180 / Math.PI;
  const pitch = clamp(gamma + (f.mode === "real" ? f.aoa : 2), -30, 30);
  $("#ffPlane").setAttribute("transform", `translate(${cx} ${cy}) rotate(${-pitch})`);
  $("#ffProp").style.opacity = f.T > 1 ? 0.35 + f.T / 150 : 0.9;
  $("#ffProp").setAttribute("ry", f.T > 1 ? 22 : 4);
  $("#ffGround").setAttribute("transform", `translate(0 ${cy + 26 + f.alt * 0.06})`);
  $("#ffDash").style.strokeDashoffset = f.scroll % 60;
  $("#ffClouds1").setAttribute("transform", `translate(${-(f.scroll % 640)} ${(f.alt - 3000) * 0.05})`);
  $("#ffClouds2").setAttribute("transform", `translate(${-((f.scroll * 0.4) % 640)} ${(f.alt - 3000) * 0.025})`);
  const r = (v) => Math.round(v);
  ffArrow("ffArrL", cx, cy - 14, cx, cy - 14 - f.L * s, `Lift ${r(f.L)}`, cx + 10, cy - 18 - f.L * s);
  ffArrow("ffArrW", cx, cy + 14, cx, cy + 14 + f.W * s, `Weight ${r(f.W)}`, cx + 10, cy + 26 + f.W * s);
  ffArrow("ffArrT", cx + 72, cy, cx + 72 + f.T * s * 1.4, cy, `Thrust ${r(f.T)}`, cx + 76 + f.T * s * 1.4, cy - 8);
  ffArrow("ffArrD", cx - 72, cy, cx - 72 - f.D * s * 1.4, cy, `Drag ${r(f.D)}`, cx - 76 - f.D * s * 1.4, cy - 8);
  const nx = (f.T - f.D) * 2, ny = -(f.L - f.W) * 2;
  ffArrow("ffArrN", cx, cy, cx + clamp(nx, -150, 150), cy + clamp(ny, -120, 120), "Net force", cx + clamp(nx, -150, 150) + 8, cy + clamp(ny, -120, 120) + 14);
  $("#ffSpd").textContent = r(f.spd) + " kt";
  $("#ffVS").textContent = (f.vs > 20 ? "+" : "") + Math.round(f.vs / 10) * 10;
  $("#ffAlt").textContent = r(f.alt).toLocaleString("en-US") + " ft";
  ffTip();
}
function ffTip() {
  const f = FF, h = f.T - f.D, v = f.L - f.W, near = (x) => Math.abs(x) < 2;
  let msg;
  if (f.mode === "real" && f.aoa > 15) msg = "⚠ <b>Stall!</b> Past about 15° the air can't follow the top of the wing any more. Lift collapses and drag shoots up. Recovery: lower the nose (less angle of attack) and add power.";
  else if (f.alt <= 0 && v <= 0) msg = f.mode === "real" ? `On the ground. Lift (${Math.round(f.L)}) is still less than weight (${Math.round(f.W)}). Lift grows with speed², so keep accelerating and the wheels will lift off.` : "On the ground. Lift is smaller than weight, so the aircraft can't get airborne. Increase lift above weight to take off.";
  else if (near(h) && near(v)) msg = "✅ <b>Balanced:</b> lift = weight and thrust = drag. Nothing changes: constant speed, constant height. This is steady cruise. (Balanced forces don't mean stopped; they mean <em>not changing</em>.)";
  else {
    const accel = h / f.W * 25 - f.vs * 0.003; // same formula as ffStep
    const hz = near(h) ? "Thrust equals drag, so the speed holds steady"
      : Math.abs(accel) < 0.6 ? (h > 0 ? "Thrust is bigger than drag, but the extra is all going into the climb, so the speed holds steady" : "Drag is bigger than thrust, but gravity is helping on the way down, so the speed holds steady")
      : accel > 0 ? "The aircraft <b>speeds up</b>" + (h > 0 ? " because thrust is bigger than drag" : " because it's diving and gravity is pulling it along")
      : "The aircraft <b>slows down</b>" + (h < 0 ? " because drag is bigger than thrust" : " because climbing uses up its energy");
    const vt = near(v) ? "lift equals weight, so it holds its height" : v > 0 ? "lift is bigger than weight, so it <b>climbs</b>" : "weight is bigger than lift, so it <b>sinks</b>";
    msg = `${hz}, and ${vt}. The dashed arrow shows the net (leftover) force.`;
    if (f.mode === "real") msg += f.thr === 0 ? " With the engine off it glides: gravity pulls it down a slope to keep the air flowing over the wings." : " Watch how speed changes lift and drag until they balance again.";
  }
  $("#ffTip").innerHTML = msg;
}
function ffBuildControls() {
  $("#ffSliders").innerHTML = FF_SLIDERS[FF.mode].map(([k, name, lo, hi, unit = ""]) =>
    `<label class="aero-ctl ff-ctl ff-${k}">${name} <span id="ffV${k}">${FF[k]}${unit}</span><input type="range" data-k="${k}" min="${lo}" max="${hi}" value="${FF[k]}"></label>`).join("");
  $("#ffPresets").innerHTML = FF_PRESETS[FF.mode].map(([n], i) => `<button type="button" class="chip" data-i="${i}">${n}</button>`).join("");
  $("#ffModeHint").textContent = FF.mode === "real"
    ? "Like a real aircraft: you set the throttle, angle of attack and load. Lift and drag change with airspeed."
    : "Drag the four sliders. Lift and drag are set directly, so you can explore each force on its own.";
  $$("#ffMode button").forEach((b) => b.classList.toggle("active", b.dataset.mode === FF.mode));
}
function ffSyncSliders() {
  FF_SLIDERS[FF.mode].forEach(([k, , , , unit = ""]) => { const i = $(`#ffSliders input[data-k="${k}"]`); i.value = FF[k]; $("#ffV" + k).textContent = FF[k] + unit; });
}
function ffReset() {
  Object.assign(FF, FF.mode === "real" ? { thr: 52, aoa: 4, W: 60 } : { L: 60, W: 60, T: 30, D: 30 }, { spd: 100, alt: 3000, vs: 0 });
  ffForces(); ffSyncSliders(); ffRender();
}
function initForces() {
  ffBuildScene(); ffBuildControls(); ffForces(); ffRender();
  $("#ffSliders").addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return;
    FF[k] = +e.target.value; ffSyncSliders(); ffForces(); ffRender(); labAward("forces", "Four forces experiment");
  });
  $("#ffMode").addEventListener("click", (e) => { const b = e.target.closest("button[data-mode]"); if (!b || b.dataset.mode === FF.mode) return; FF.mode = b.dataset.mode; ffBuildControls(); ffReset(); });
  $("#ffPresets").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]"); if (!b) return;
    const [, set, state] = FF_PRESETS[FF.mode][+b.dataset.i];
    // each scenario starts in the air unless it says otherwise
    Object.assign(FF, { spd: 100, alt: 3000, vs: 0 }, set, state || {}); ffForces(); ffSyncSliders(); ffRender(); labAward("forces", "Four forces experiment");
  });
  $("#ffReset").onclick = ffReset;
}

// ---------- Aerodynamics Lab ----------
// Real 2D potential flow around a Joukowski airfoil (a circle mapped to a wing shape), with the Kutta condition
// setting the circulation. Beyond the stall angle a turbulent wake is faked on the upper surface.
const AIRFOILS = [
  { key: "camber", name: "Cambered", t: 0.1, m: 0.08, stall: 15, d: "Curved on top, flatter underneath. Makes lift even at 0°. The everyday wing of light aircraft and trainers." },
  { key: "sym", name: "Symmetric", t: 0.1, m: 0, stall: 15, d: "Same shape top and bottom. No lift at 0°, and it flies just as well upside down, so aerobatic aircraft and tail fins use it." },
  { key: "thin", name: "Thin (high-speed)", t: 0.03, m: 0.02, stall: 10, d: "Thin and nearly flat. Low drag at high speed, but the sharp nose stalls early. Found on fast jets and fighters." },
  { key: "flaps", name: "High-lift (flaps down)", t: 0.12, m: 0.17, stall: 12, d: "Lots of camber, like a wing with its flaps lowered. Huge lift at low speed for takeoff and landing, but stalls sooner and adds drag." },
];
const AE = { aoa: 5, spd: 100, foil: AIRFOILS[0], parts: [], stalled: false, ctx: null, w: 760, h: 380, k: 88, ox: 330, oy: 190 };
// tiny complex-number helpers: [re, im]
const cx_ = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
  div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1] || 1e-12; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
  sqrt: (a) => { const r = Math.hypot(a[0], a[1]), re = Math.sqrt((r + a[0]) / 2), im = Math.sign(a[1] || 1) * Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, im]; },
  exp: (t) => [Math.cos(t), Math.sin(t)], abs: (a) => Math.hypot(a[0], a[1]),
};
function aeroGeom() {
  const f = AE.foil, c = 1, mu = [-f.t * c, f.m * c], te = cx_.sub([c, 0], mu);
  const a = cx_.abs(te), beta = Math.atan2(f.m, 1 + f.t);
  const aoaR = AE.aoa * Math.PI / 180, effA = Math.min(AE.aoa, f.stall) * Math.PI / 180;
  let gam = 4 * Math.PI * a * Math.sin(effA + beta);
  if (AE.aoa > f.stall) gam *= Math.max(0.55, 1 - 0.06 * (AE.aoa - f.stall));
  return { c, mu, a, beta, aoaR, gam };
}
function aeroCL(aoa, f = AE.foil) {
  const a = Math.hypot(1 + f.t, f.m), beta = Math.atan2(f.m, 1 + f.t), slope = 2 * Math.PI * a / 1;
  const clAt = (al) => slope * Math.sin(al * Math.PI / 180 + beta) / 2; // per unit chord ≈ 4c ⇒ /2 keeps realistic magnitudes
  if (aoa <= f.stall) return clAt(aoa);
  return clAt(f.stall) * Math.max(0.55, 1 - 0.05 * (aoa - f.stall));
}
// Velocity (display frame, freestream = +x, magnitude 1) at display point p.
function aeroVel(p, G) {
  const zeta = cx_.mul(p, cx_.exp(G.aoaR)); // to airfoil frame
  const disc = cx_.sqrt(cx_.sub(cx_.mul(zeta, zeta), [4 * G.c * G.c, 0]));
  let z = cx_.mul(cx_.add(zeta, disc), [0.5, 0]);
  const z2 = cx_.mul(cx_.sub(zeta, disc), [0.5, 0]);
  if (cx_.abs(cx_.sub(z2, G.mu)) > cx_.abs(cx_.sub(z, G.mu))) z = z2;
  const zp = cx_.sub(z, G.mu);
  if (cx_.abs(zp) < G.a * 1.005) return null; // inside the wing
  const zp2 = cx_.mul(zp, zp);
  let W = cx_.sub(cx_.exp(-G.aoaR), cx_.div(cx_.mul([G.a * G.a, 0], cx_.exp(G.aoaR)), zp2));
  W = cx_.add(W, cx_.div([0, G.gam / (2 * Math.PI)], zp));
  const J = cx_.sub([1, 0], cx_.div([G.c * G.c, 0], cx_.mul(z, z)));
  if (cx_.abs(J) < 0.04) return [1, 0];
  const w = cx_.div(W, J), V = [w[0], -w[1]];
  const out = cx_.mul(V, cx_.exp(-G.aoaR));
  const m = cx_.abs(out); return m > 3 ? [out[0] * 3 / m, out[1] * 3 / m] : out;
}
function aeroOutline(G) {
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const z = cx_.add(G.mu, cx_.mul([G.a, 0], cx_.exp(i / 120 * 2 * Math.PI)));
    const zeta = cx_.add(z, cx_.div([G.c * G.c, 0], z));
    pts.push(cx_.mul(zeta, cx_.exp(-G.aoaR)));
  }
  return pts;
}
const aeroToScreen = (p) => [AE.ox + p[0] * AE.k, AE.oy - p[1] * AE.k];
function aeroSpawn(pt, anywhere) {
  pt.x = anywhere ? -4 + Math.random() * 9.3 : -4 - Math.random() * 0.4;
  pt.y = (Math.random() * 2 - 1) * 2.4; pt.age = 0; pt.px = pt.x; pt.py = pt.y; pt.turb = 0;
}
function aeroStep(dt) {
  const ctx = AE.ctx, G = AE.G, night = isNight(), U = 2.2 * AE.spd / 100;
  ctx.fillStyle = night ? "rgba(6,12,30,0.22)" : "rgba(236,243,255,0.25)";
  ctx.fillRect(0, 0, AE.w, AE.h);
  const outline = AE.outline, le = AE.le, te = AE.te, stallDepth = AE.stalled ? 0.5 + (AE.aoa - AE.foil.stall) * 0.09 : 0;
  ctx.lineWidth = 1.6; ctx.lineCap = "round";
  for (const pt of AE.parts) {
    let v = aeroVel([pt.x, pt.y], G);
    if (!v) { aeroSpawn(pt); continue; }
    let speed = Math.hypot(v[0], v[1]);
    if (stallDepth) { // separated, swirling flow above the rear of the wing
      const t = (pt.x - le[0]) / (te[0] - le[0]), chordY = le[1] + (te[1] - le[1]) * clamp(t, 0, 1);
      if (t > 0.25 && pt.y > chordY - 0.05 && pt.y < chordY + stallDepth * clamp(t * 1.4, 0.3, 2.2)) {
        pt.turb = 1;
      } else pt.turb = Math.max(0, pt.turb - dt * 0.6);
      if (pt.turb > 0) {
        const j = pt.turb;
        v = [v[0] * (1 - 0.75 * j) + (Math.random() - 0.5) * 2.4 * j, v[1] * (1 - 0.75 * j) + (Math.random() - 0.5) * 2.4 * j];
        speed = Math.hypot(v[0], v[1]) * (1 - 0.5 * j);
      }
    }
    pt.px = pt.x; pt.py = pt.y;
    pt.x += v[0] * U * dt; pt.y += v[1] * U * dt; pt.age += dt;
    if (pt.x > 5.4 || Math.abs(pt.y) > 2.7 || pt.age > 14) { aeroSpawn(pt); continue; }
    const [x1, y1] = aeroToScreen([pt.px, pt.py]), [x2, y2] = aeroToScreen([pt.x, pt.y]);
    // colour: blue (slow, high pressure) → white → pink (fast, low pressure); grey when turbulent
    const r = clamp((speed - 0.6) / 0.9, 0, 1);
    const hue = r < 0.5 ? 215 : 330, sat = pt.turb > 0.3 ? 8 : Math.round(Math.abs(r - 0.5) * 2 * 85 + 10);
    const light = night ? 62 + (1 - Math.abs(r - 0.5) * 2) * 22 : 52 - Math.abs(r - 0.5) * 8;
    ctx.strokeStyle = `hsl(${hue} ${sat}% ${light}%)`;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // wing
  ctx.beginPath(); outline.forEach((p, i) => { const [x, y] = aeroToScreen(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
  ctx.fillStyle = night ? "#cbd5e1" : "#1e3a8a"; ctx.fill();
  // lift arrow from the quarter-chord, perpendicular to the oncoming air
  const qc = aeroToScreen([le[0] + (te[0] - le[0]) * 0.25, le[1] + (te[1] - le[1]) * 0.25]);
  const len = clamp(aeroCL(AE.aoa) * (AE.spd / 100) ** 2 * 80, -90, 160);
  if (Math.abs(len) > 4) {
    ctx.strokeStyle = ctx.fillStyle = night ? "#f9a8d4" : "#db2777"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(qc[0], qc[1]); ctx.lineTo(qc[0], qc[1] - len); ctx.stroke();
    const dir = Math.sign(len);
    ctx.beginPath(); ctx.moveTo(qc[0], qc[1] - len - dir * 10); ctx.lineTo(qc[0] - 8, qc[1] - len + dir * 2); ctx.lineTo(qc[0] + 8, qc[1] - len + dir * 2); ctx.fill();
    ctx.font = "700 13px Bahnschrift, Segoe UI, sans-serif"; ctx.fillText("LIFT", qc[0] + 12, qc[1] - len / 2);
  }
  // freestream label
  ctx.fillStyle = night ? "rgba(203,213,225,.75)" : "rgba(15,31,69,.55)"; ctx.font = "600 12px Bahnschrift, Segoe UI, sans-serif";
  ctx.fillText(`RELATIVE WIND ${AE.spd} kt  →`, 14, 22);
}
function aeroUpdate() {
  AE.G = aeroGeom(); AE.outline = aeroOutline(AE.G);
  const xs = AE.outline.map((p) => p[0]); const iL = xs.indexOf(Math.min(...xs)), iT = xs.indexOf(Math.max(...xs));
  AE.le = AE.outline[iL]; AE.te = AE.outline[iT];
  AE.stalled = AE.aoa > AE.foil.stall;
  const cl = aeroCL(AE.aoa), lift = cl * (AE.spd / 100) ** 2 / aeroCL(5, AIRFOILS[0]) * 100;
  $("#aeroAoaV").textContent = AE.aoa + "°"; $("#aeroSpdV").textContent = AE.spd + " kt";
  $("#aeroCL").textContent = cl.toFixed(2); $("#aeroLift").textContent = Math.round(lift) + "%";
  const st = $("#aeroState"); st.textContent = AE.stalled ? "STALLED" : AE.aoa > AE.foil.stall - 3 ? "NEAR STALL" : cl < 0 ? "NEG. LIFT" : "FLYING";
  st.parentElement.classList.toggle("warn", AE.stalled);
  if (AE.stalled) labAward("stall", "Discovered the stall");
  aeroChart(); aeroTip(cl, lift);
}
function aeroTip(cl, lift) {
  const f = AE.foil, a = AE.aoa;
  let t;
  if (AE.stalled) t = `⚠ <b>Stalled at ${a}°.</b> This wing's critical angle is about ${f.stall}°. Past it the air breaks away from the top surface into a turbulent wake (grey). Lift drops and drag soars. A stall depends on <em>angle</em>, not speed. To recover, lower the nose.`;
  else if (a > f.stall - 3) t = `Close to the critical angle (${f.stall}°). Lift is near its maximum, but a little more and the airflow will separate. Real aircraft sound a stall-warning horn here.`;
  else if (f.m === 0 && a === 0) t = "A symmetric wing at 0° makes <b>no lift</b>. The flow over the top and bottom is a mirror image, so the pressures cancel out.";
  else if (cl < 0) t = `At ${a}° the wing pushes <b>down</b>. The fast, low-pressure air (pink) is now underneath.`;
  else if (a <= 0) t = `Even at ${a}°, this ${f.name.toLowerCase()} wing still makes some lift because of its curved shape (camber).`;
  else t = `At ${a}°, air over the top speeds up (pink, lower pressure) and air underneath slows down (blue, higher pressure). Notice the air leaving the trailing edge is turned <b>downward</b>: that's the downwash.`;
  t += ` <br><small>Lift grows with speed squared: at ${AE.spd} kt this wing makes ${Math.round(lift)}% of the lift of a cambered wing at 5° and 100 kt. Double the speed for 4× the lift.</small>`;
  $("#aeroTip").innerHTML = t;
}
function aeroChart() {
  const X = (a) => 30 + (a + 5) / 27 * 220, Y = (cl) => 125 - cl * 55;
  const line = (f) => Array.from({ length: 55 }, (_, i) => { const a = -5 + i * 0.5; return `${X(a).toFixed(1)},${Y(aeroCL(a, f)).toFixed(1)}`; }).join(" ");
  const f = AE.foil, cl = aeroCL(AE.aoa);
  $("#aeroChart").innerHTML = `<line x1="30" y1="${Y(0)}" x2="250" y2="${Y(0)}" class="ac-axis"/><line x1="${X(0)}" y1="8" x2="${X(0)}" y2="140" class="ac-axis"/>
    <text x="250" y="${Y(0) + 12}" class="ac-lbl end">angle →</text><text x="${X(0) + 4}" y="14" class="ac-lbl">lift coeff.</text>
    ${AIRFOILS.filter((o) => o !== f).map((o) => `<polyline points="${line(o)}" class="ac-other"/>`).join("")}
    <line x1="${X(f.stall)}" y1="8" x2="${X(f.stall)}" y2="140" class="ac-stall"/><text x="${X(f.stall) + 3}" y="24" class="ac-lbl warn">stall ${f.stall}°</text>
    <polyline points="${line(f)}" class="ac-line"/><circle cx="${X(AE.aoa)}" cy="${Y(cl)}" r="5" class="ac-dot"/>`;
}
const WINGS = [
  { key: "rect", name: "Rectangular", path: "M-150 30 L150 30 L150 62 L-150 62 Z", ar: "≈ 7", good: "Cheap and easy to build. Gentle stall that starts near the fuselage, so the ailerons keep working.", bad: "More drag from wingtip vortices than tapered wings.", seen: "Many light trainers and homebuilt aircraft" },
  { key: "taper", name: "Tapered", path: "M-150 38 L-20 22 L20 22 L150 38 L150 54 L20 68 L-20 68 L-150 54 Z", ar: "≈ 8–9", good: "Lighter and lower drag than rectangular. Close to the ideal lift spread.", bad: "Tips can stall first unless the wing is twisted (washout).", seen: "Most light aircraft and business jets" },
  { key: "ellip", name: "Elliptical", path: "M-150 44 C-150 18 -60 14 0 14 C60 14 150 18 150 44 C150 60 60 72 0 72 C-60 72 -150 60 -150 44 Z", ar: "≈ 6", good: "In theory the most efficient wing: the lowest drag for the lift it makes.", bad: "Curved everywhere, so it's hard and expensive to build.", seen: "Supermarine Spitfire" },
  { key: "swept", name: "Swept", path: "M-150 96 L-20 18 L20 18 L150 96 L150 108 L20 62 L-20 62 L-150 108 Z", ar: "≈ 9", good: "Delays shock waves near the speed of sound, so jets can cruise at around Mach 0.8.", bad: "Worse at low speed, so it needs flaps and slats for landing. Tends to stall at the tips.", seen: "Airliners such as the Boeing 737 and Airbus A320" },
  { key: "delta", name: "Delta", path: "M0 0 L120 110 L-120 110 Z", ar: "≈ 2", good: "Very strong, lots of room for fuel, great at supersonic speed and keeps lifting to high angles.", bad: "High drag at low speed. Lands fast and nose-high.", seen: "Concorde and many fighters" },
  { key: "glider", name: "High aspect ratio", path: "M-158 40 L-10 32 L10 32 L158 40 L158 47 L10 54 L-10 54 L-158 47 Z", ar: "≈ 20–30", good: "Long and slender, with very little induced drag, so it glides a long way for each metre it drops.", bad: "Heavy, flexible structure. Slow to roll and not built for speed.", seen: "Gliders and high-altitude aircraft" },
];
function renderWing(key) {
  const w = WINGS.find((x) => x.key === key);
  $$("#wingSeg button").forEach((b) => b.classList.toggle("active", b.dataset.k === key));
  $("#wingSvg").innerHTML = `<path d="${w.path}" class="wing-shape"/><rect x="-9" y="-12" width="18" height="140" rx="9" class="wing-fuse"/><text x="0" y="-6" class="wing-lbl">▲ direction of flight</text>`;
  $("#wingInfo").innerHTML = `<div class="label">${esc(w.name)}</div><p><b>Aspect ratio:</b> ${w.ar} <small>(span² ÷ wing area: long and thin = high)</small></p><p><b>👍 Good at:</b> ${w.good}</p><p><b>👎 Trade-off:</b> ${w.bad}</p><p><b>✈ Seen on:</b> ${w.seen}</p>`;
}
function initAero() {
  const cv = $("#aeroCanvas"); AE.ctx = cv.getContext("2d");
  AE.parts = Array.from({ length: 520 }, () => { const p = {}; aeroSpawn(p, true); return p; });
  $("#aeroShapes").innerHTML = AIRFOILS.map((f) => `<button type="button" class="chip${f === AE.foil ? " active" : ""}" data-k="${f.key}" title="${esc(f.d)}">${f.name}</button>`).join("");
  $("#aeroShapes").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-k]"); if (!b) return;
    AE.foil = AIRFOILS.find((f) => f.key === b.dataset.k);
    $$("#aeroShapes .chip").forEach((c) => c.classList.toggle("active", c === b));
    aeroUpdate(); toast(AE.foil.d.split(".")[0] + ".");
  });
  $("#aeroAoa").addEventListener("input", (e) => { AE.aoa = +e.target.value; aeroUpdate(); });
  $("#aeroSpd").addEventListener("input", (e) => { AE.spd = +e.target.value; aeroUpdate(); });
  $("#wingSeg").innerHTML = WINGS.map((w) => `<button type="button" data-k="${w.key}">${w.name}</button>`).join("");
  $("#wingSeg").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) renderWing(b.dataset.k); });
  renderWing("rect"); aeroUpdate();
}

// ---------- Engine Explorer ----------
const CY = 130; // engine centre line
const ENGINES = {
  turbofan: {
    name: "Turbofan", steps: ["Suck · fan & intake", "Squeeze · compressor", "Bang · combustor", "Blow · turbine & exhaust"],
    core: [[30, 46], [90, 46], [250, 28], [320, 32], [390, 40], [540, 24], [640, 24]], hub: [[20, 0], [55, 20], [390, 14], [460, 0]],
    temp: [[30, 0], [90, 0.05], [250, 0.4], [262, 1], [320, 1], [390, 0.6], [540, 0.45], [640, 0.35]], speed: [[30, 150], [90, 120], [250, 100], [320, 150], [390, 230], [640, 300]],
    coreFrom: 30, casing: [90, 390], nacelle: [[25, 112], [60, 114], [360, 108], [400, 100]],
    bypassIn: [[30, 48], [90, 54], [250, 36], [390, 48], [640, 50]], bypassOut: [[30, 104], [360, 100], [400, 92], [640, 90]],
    fan: { x: [52, 66], r: 108 }, comp: [105, 125, 145, 165, 185, 205, 225, 242], turb: [330, 345, 360, 375], burner: [252, 318],
    parts: {
      fan: { name: "Fan", x: [30, 90], step: 0, d: "The giant fan at the front. In a modern airliner engine it moves about 9–12 times more air <b>around</b> the core than through it, and makes most of the thrust (around 80%)." },
      bypass: { name: "Bypass duct", x: [90, 400], r: [50, 112], step: 3, d: "The cool air from the fan rushes through this ring-shaped duct and out the back. Moving lots of air fairly slowly is efficient and much quieter than a pure jet." },
      comp: { name: "Compressor", x: [90, 250], r: [0, 50], step: 1, d: "Rows of spinning blades squeeze the core air to around 40 times outside pressure. Squeezed air burns far more efficiently." },
      burner: { name: "Combustion chamber", x: [250, 320], r: [0, 50], step: 2, d: "Fuel is sprayed into the squeezed air and burns continuously at roughly 1,500 °C+. No spark plugs needed once it's running." },
      turb: { name: "Turbine", x: [320, 390], r: [0, 50], step: 3, d: "The hot gas spins the turbine like wind on a windmill. Shafts carry that power forward to turn the compressor and the big fan." },
      nozzle: { name: "Core exhaust", x: [390, 545], r: [0, 50], step: 3, d: "The remaining hot gas leaves through the nozzle and adds the rest of the thrust." },
    },
    facts: { how: "A big fan pushes most of the air around the engine core (bypass), and the hot core jet adds the rest.", speed: "Mach 0.75–0.85 (airliner cruise)", good: "Efficient and quiet at airliner speeds", bad: "Big and heavy. Inefficient at very low or supersonic speeds", seen: "Almost every airliner: Boeing 737, Airbus A320, Boeing 787", out: [120, "kN thrust"], rpm: [20, 100, "% N1"] },
  },
  turbojet: {
    name: "Turbojet", steps: ["Suck · intake", "Squeeze · compressor", "Bang · combustor", "Blow · turbine & nozzle"],
    core: [[20, 64], [90, 60], [260, 36], [340, 40], [410, 46], [590, 30], [640, 30]], hub: [[20, 0], [80, 16], [410, 16], [480, 0]],
    temp: [[20, 0], [90, 0.05], [260, 0.38], [275, 1], [340, 1], [410, 0.7], [590, 0.55], [640, 0.5]], speed: [[20, 140], [90, 120], [260, 100], [340, 150], [410, 240], [640, 340]],
    coreFrom: 20, casing: [20, 590], comp: [100, 122, 144, 166, 188, 210, 232, 252], turb: [355, 375, 395], burner: [262, 338],
    parts: {
      intake: { name: "Intake", x: [20, 90], step: 0, d: "Smoothly slows the incoming air and feeds it evenly into the compressor. On supersonic jets the intake also slows the air below the speed of sound." },
      comp: { name: "Compressor", x: [90, 260], step: 1, d: "Stage after stage of spinning blades (and fixed vanes between them) squeeze the air before it's burned." },
      burner: { name: "Combustion chamber", x: [260, 340], step: 2, d: "Fuel burns continuously in the squeezed air, making very hot, high-pressure gas." },
      turb: { name: "Turbine", x: [340, 410], step: 3, d: "Takes just enough energy from the hot gas to drive the compressor through a shaft. The rest is left for thrust." },
      nozzle: { name: "Nozzle", x: [410, 600], step: 3, d: "Accelerates the gas into a fast, hot jet. <b>All</b> the thrust comes from this jet: that's why turbojets are loud and thirsty at low speed. Some add an afterburner here." },
    },
    facts: { how: "All the air goes through the core and leaves as one very fast, hot jet.", speed: "Best above Mach 1 (often with an afterburner)", good: "Simple and powerful at very high speed", bad: "Very noisy and uses a lot of fuel at low speeds", seen: "Early jets, Concorde, older fighters and missiles", out: [60, "kN thrust"], rpm: [55, 100, "% RPM"] },
  },
  turboprop: {
    name: "Turboprop", steps: ["Suck · intake", "Squeeze · compressor", "Bang · combustor", "Blow · turbine → propeller"],
    core: [[110, 40], [150, 40], [280, 24], [340, 28], [420, 36], [500, 36], [640, 36]], hub: [[60, 0], [70, 22], [110, 22], [420, 12], [440, 0]],
    temp: [[110, 0], [280, 0.35], [292, 1], [340, 1], [420, 0.55], [640, 0.4]], speed: [[110, 110], [280, 95], [340, 140], [420, 180], [640, 200]],
    coreFrom: 110, casing: [110, 500], nacelleBody: [[50, 26], [110, 50], [420, 50], [500, 42]], prop: { x: 42, r: 112 }, gears: true, wash: true,
    comp: [160, 178, 196, 214, 232, 250, 268], turb: [350, 368, 386, 404], burner: [282, 338],
    parts: {
      prop: { name: "Propeller", lbl: "Prop", x: [20, 60], step: 3, d: "Makes about 90% of the thrust by pushing a large mass of air backwards. Its blades can twist (change pitch) to suit the speed." },
      gear: { name: "Reduction gearbox", lbl: "Gearbox", x: [60, 110], step: 3, d: "The turbine spins very fast (tens of thousands of RPM) but a propeller can't, or its tips would go supersonic. The gearbox slows it down to around 1,000–2,000 RPM." },
      comp: { name: "Compressor", x: [110, 280], step: 1, d: "Squeezes the air before burning, just like in a jet." },
      burner: { name: "Combustion chamber", x: [280, 340], step: 2, d: "Fuel burns continuously in the compressed air." },
      turb: { name: "Turbines", x: [340, 420], step: 3, d: "Extract almost all the energy from the gas. One turbine runs the compressor, and a <b>power turbine</b> turns the propeller through a long shaft." },
      nozzle: { name: "Exhaust", x: [420, 510], step: 3, d: "Only a little thrust comes from the exhaust. Most of the gas's energy was already taken by the turbines to spin the propeller." },
    },
    facts: { how: "A gas turbine spins a propeller through a gearbox. The propeller makes about 90% of the thrust.", speed: "250–350 kt", good: "The most fuel-efficient choice for short regional flights. Good on short runways", bad: "Slower than jets, and the propeller limits top speed", seen: "Regional airliners like the ATR 72 and Dash 8, King Air, C-130", out: [2000, "shp"], rpm: [70, 100, "% prop RPM"] },
  },
  piston: {
    name: "Piston", steps: ["Intake", "Compression", "Power", "Exhaust"], piston: true,
    parts: {
      prop: { name: "Propeller", box: [40, 140, 140, 260], d: "Bolted straight onto the crankshaft, so it turns at engine speed (about 2,000–2,700 RPM in cruise) and pulls the aircraft forward." },
      intake: { name: "Intake valve", box: [285, 10, 372, 62], step: 0, d: "Opens on the <b>intake</b> stroke to let the fuel–air mixture in as the piston moves down." },
      exhaust: { name: "Exhaust valve", box: [390, 10, 482, 62], step: 3, d: "Opens on the <b>exhaust</b> stroke so the rising piston can push the burnt gas out." },
      spark: { name: "Spark plugs", box: [372, 0, 390, 46], step: 2, d: "Fire just before the top of the compression stroke to ignite the mixture. Aircraft engines have <b>two</b> per cylinder, each powered by its own magneto, for safety." },
      cyl: { name: "Cylinder", box: [330, 46, 346, 178], d: "The tube the piston slides in. Light aircraft usually have 4 or 6 cylinders, laid out flat and cooled by air." },
      piston: { name: "Piston", box: [346, 62, 414, 175], step: 2, d: "Squeezes the mixture, then gets shoved down hard when it burns. This is the <b>power</b> stroke." },
      crank: { name: "Crankshaft & connecting rod", box: [346, 175, 414, 250], step: 2, d: "The connecting rod turns the piston's up-and-down motion into rotation, just like your legs turning bicycle pedals." },
    },
    facts: { how: "Pistons and a crankshaft (like a car engine) turn a propeller directly.", speed: "Up to about 200 kt", good: "Cheap, simple and efficient at low speed and low altitude", bad: "Loses power as the air thins at altitude. Limited speed and power", seen: "Training and light aircraft: Cessna 172, Piper Cherokee, Diamond DA40", out: [180, "hp"], rpm: [700, 2700, " RPM"] },
  },
};
const ENG_ORDER = ["turbofan", "turboprop", "piston", "turbojet"];
const EN = { key: "turbofan", thr: 0.6, phase: 0, theta: 0, parts: [], part: null, seen: new Set() };
// cool air = blue, squeezed air = paler, burning/hot gas = orange → red
const engTempColor = (t) => t < 0.4 ? `hsl(210 ${Math.round(80 - t / 0.4 * 55)}% ${Math.round(60 + t / 0.4 * 18)}%)` : `hsl(${Math.round(40 - (t - 0.4) / 0.6 * 35)} 95% 56%)`;
function engBuild() {
  const e = ENGINES[EN.key], svg = $("#engSvg");
  let h = "";
  const band = (pts, from, to, off, cls) => {
    const xs = []; for (let x = from; x <= to; x += 5) xs.push(x);
    const top = xs.map((x) => `${x},${CY - pw(pts, x) - off}`).concat(xs.slice().reverse().map((x) => `${x},${CY - pw(pts, x)}`));
    const bot = xs.map((x) => `${x},${CY + pw(pts, x) + off}`).concat(xs.slice().reverse().map((x) => `${x},${CY + pw(pts, x)}`));
    return `<polygon points="${top.join(" ")}" class="${cls}"/><polygon points="${bot.join(" ")}" class="${cls}"/>`;
  };
  if (e.piston) {
    h = `<line x1="95" y1="210" x2="380" y2="210" class="eng-shaft"/>
      <rect x="282" y="26" width="72" height="12" class="eng-pipe in"/><rect x="406" y="26" width="76" height="12" class="eng-pipe out"/>
      <text x="286" y="20" class="eng-small">fuel + air in</text><text x="420" y="20" class="eng-small">exhaust out</text>
      <rect x="334" y="22" width="92" height="28" rx="3" class="eng-casing"/>
      <rect x="376" y="0" width="8" height="34" rx="2" class="eng-plug"/><circle id="engSpark" cx="380" cy="54" r="9" class="eng-spark"/>
      <rect x="330" y="50" width="14" height="128" class="eng-casing"/><rect x="416" y="50" width="14" height="128" class="eng-casing"/>
      <rect id="engGas" x="344" y="50" width="72" height="40" class="eng-gas"/>
      <g id="engValveI"><line x1="360" y1="14" x2="360" y2="50" class="eng-stem"/><rect x="350" y="47" width="20" height="5" rx="2" class="eng-valve"/></g>
      <g id="engValveE"><line x1="400" y1="14" x2="400" y2="50" class="eng-stem"/><rect x="390" y="47" width="20" height="5" rx="2" class="eng-valve"/></g>
      <rect id="engPiston" x="346" y="96" width="68" height="28" rx="3" class="eng-piston"/>
      <circle cx="380" cy="210" r="36" class="eng-crankcase"/>
      <line id="engRod" class="eng-rod"/><line id="engArm" class="eng-arm"/><circle id="engPin" r="5" class="eng-hub"/><circle cx="380" cy="210" r="7" class="eng-hub"/>
      <g id="engPropG"></g>
      <text x="462" y="104" class="eng-stroke" id="engStroke">INTAKE</text><text x="462" y="126" class="eng-small" id="engStrokeD1"></text><text x="462" y="140" class="eng-small" id="engStrokeD2"></text>`;
  } else {
    if (e.nacelle) h += band(e.nacelle, 25, 400, 10, "eng-nacelle");
    if (e.wash) h += `<g id="engWash"></g>`;
    h += `<g id="engBypass"></g>`;
    if (e.nacelleBody) h += band(e.nacelleBody, 50, 500, 0, "eng-nacelle");
    h += band(e.core, e.casing[0], e.casing[1], 8, "eng-casing");
    // hub / spool
    const hx = []; for (let x = e.hub[0][0]; x <= e.hub[e.hub.length - 1][0]; x += 5) hx.push(x);
    h += `<polygon points="${hx.map((x) => `${x},${CY - pw(e.hub, x)}`).concat(hx.slice().reverse().map((x) => `${x},${CY + pw(e.hub, x)}`)).join(" ")}" class="eng-hubbody"/>`;
    h += `<g id="engFlame">${[0, 1, 2].map((i) => `<ellipse cx="${(e.burner[0] + e.burner[1]) / 2}" cy="${CY + (i - 1) * 0}" rx="${(e.burner[1] - e.burner[0]) / 2 - 4}" ry="${pw(e.core, e.burner[0]) - 6 - i * 7}" class="eng-flame f${i}"/>`).join("")}</g>`;
    h += `<g id="engCore"></g>`;
    const stage = (x, r0, r1, cls) => `<line x1="${x}" y1="${CY - r0}" x2="${x}" y2="${CY - r1}" class="${cls}"/><line x1="${x}" y1="${CY + r0}" x2="${x}" y2="${CY + r1}" class="${cls}"/>`;
    h += `<g id="engBlades">${e.comp.map((x) => stage(x, pw(e.hub, x) + 1, pw(e.core, x) - 1, "eng-blade comp")).join("")}${e.turb.map((x) => stage(x, pw(e.hub, x) + 1, pw(e.core, x) - 1, "eng-blade turb")).join("")}
      ${e.fan ? e.fan.x.map((x) => stage(x, pw(e.hub, x) + 1, e.fan.r - 4, "eng-blade fan")).join("") : ""}</g>`;
    if (e.gears) h += `<circle cx="86" cy="${CY - 11}" r="10" class="eng-gear"/><circle cx="86" cy="${CY + 11}" r="10" class="eng-gear b"/>`;
    if (e.prop) h += `<g id="engPropG"></g>`;
  }
  // hit areas
  h += Object.entries(e.parts).map(([k, p]) => {
    if (p.box) { const [x0, y0, x1, y1] = p.box; return `<rect class="eng-hit" data-part="${k}" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"><title>${p.name}</title></rect>`; }
    const [r0, r1] = p.r || [0, 118];
    return r0 === 0 ? `<rect class="eng-hit" data-part="${k}" x="${p.x[0]}" y="${CY - r1}" width="${p.x[1] - p.x[0]}" height="${2 * r1}"><title>${p.name}</title></rect>`
      : `<rect class="eng-hit" data-part="${k}" x="${p.x[0]}" y="${CY - r1}" width="${p.x[1] - p.x[0]}" height="${r1 - r0}"><title>${p.name}</title></rect><rect class="eng-hit" data-part="${k}" x="${p.x[0]}" y="${CY + r0}" width="${p.x[1] - p.x[0]}" height="${r1 - r0}"><title>${p.name}</title></rect>`;
  }).join("");
  if (!e.piston) h += Object.entries(e.parts).map(([k, p]) => `<text x="${p.r ? 150 : (p.x[0] + p.x[1]) / 2}" y="${p.r ? CY - 74 : 274}" class="eng-lbl" data-part="${k}">${p.lbl || p.name.replace(/ (chamber|duct)$/i, "")}</text>`).join("");
  svg.innerHTML = h;
  // particles
  EN.parts = [];
  const add = (kind, n, g) => { for (let i = 0; i < n; i++) { const c = document.createElementNS(SVGNS, "circle"); c.setAttribute("r", kind === "core" ? 2.4 : 2.2); c.setAttribute("class", "eng-pt " + kind); g.appendChild(c); EN.parts.push({ kind, el: c, x: Math.random() * 640, yn: Math.random() * 2 - 1 }); } };
  if (!e.piston) {
    add("core", 90, $("#engCore"));
    if (e.bypassIn) add("bypass", 80, $("#engBypass"));
    if (e.wash) add("wash", 70, $("#engWash"));
  }
  $("#engSteps").innerHTML = e.steps.map((s, i) => `<span data-i="${i}">${i + 1}. ${s}</span>`).join("");
  const f = e.facts;
  $("#engFacts").innerHTML = `<div class="readouts eng-readouts"><div class="readout"><small>${f.rpm[2].includes("%") ? f.rpm[2].replace("% ", "").toUpperCase() + " %" : "ENGINE RPM"}</small><b id="engRpm">0</b></div><div class="readout"><small>OUTPUT</small><b id="engOut" class="pink">0</b></div></div>
    <p><b>How it makes thrust:</b> ${f.how}</p><p><b>Best speed:</b> ${f.speed}</p><p><b>👍</b> ${f.good}</p><p><b>👎</b> ${f.bad}</p><p><b>✈ Found on:</b> ${f.seen}</p>`;
  engSelectPart(null);
  engReadouts();
  $$("#engSeg button").forEach((b) => b.classList.toggle("active", b.dataset.k === EN.key));
  EN.seen.add(EN.key);
  if (EN.seen.size === ENG_ORDER.length) labAward("engines", "Explored every engine");
}
function engSelectPart(k) {
  const e = ENGINES[EN.key], p = k && e.parts[k];
  EN.part = k;
  $$("#engSvg .eng-hit").forEach((r) => r.classList.toggle("sel", r.dataset.part === k));
  $$("#engSvg .eng-lbl").forEach((r) => r.classList.toggle("sel", r.dataset.part === k));
  $("#engPart").innerHTML = p ? `<div class="label">${esc(p.name)}</div><p>${p.d}</p>` : `<div class="label">${esc(e.name)} engine</div><p class="sub">👆 Click a part of the engine to see what it does.</p>`;
  if (!e.piston) $$("#engSteps span").forEach((s) => s.classList.toggle("on", !!p && +s.dataset.i === p.step));
}
function engReadouts() {
  const f = ENGINES[EN.key].facts, t = EN.thr;
  const rpm = f.rpm[0] + (f.rpm[1] - f.rpm[0]) * t, out = f.out[0] * (0.05 + 0.95 * t ** 1.6);
  $("#engRpm").textContent = Math.round(rpm).toLocaleString("en-US");
  $("#engOut").textContent = (out >= 100 ? Math.round(out).toLocaleString("en-US") : out.toFixed(1)) + " " + f.out[1];
}
function engDrawProp(cx, cy, r, ang, spin) {
  const g = $("#engPropG"); if (!g) return;
  const c1 = Math.cos(ang), c2 = Math.cos(ang + Math.PI);
  const blur = clamp((spin - 4) / 20, 0, 0.55);
  g.innerHTML = `<ellipse cx="${cx}" cy="${cy}" rx="7" ry="${r}" class="eng-disc" style="opacity:${blur}"/>
    <line x1="${cx}" y1="${cy}" x2="${cx + Math.sin(ang) * 4}" y2="${cy - c1 * r}" class="eng-blade-prop" style="opacity:${1 - blur * 1.3}"/>
    <line x1="${cx}" y1="${cy}" x2="${cx + Math.sin(ang + Math.PI) * 4}" y2="${cy - c2 * r}" class="eng-blade-prop" style="opacity:${1 - blur * 1.3}"/>
    <path d="M${cx - 2} ${cy - 13} Q${cx - 26} ${cy} ${cx - 2} ${cy + 13} Z" class="eng-spinner"/>`;
}
function engStep(dt) {
  const e = ENGINES[EN.key], t = EN.thr, idle = 0.12 + 0.88 * t;
  if (e.piston) {
    const revPerSec = 0.25 + 1.6 * t; // slowed down so you can follow the strokes
    EN.theta = (EN.theta + 360 * revPerSec * dt) % 720;
    const th = EN.theta * Math.PI / 180, cx = 380, cy = 210, r = 24, L = 76;
    const pinY = cy - (r * Math.cos(th) + Math.sqrt(L * L - (r * Math.sin(th)) ** 2)), top = pinY - 14;
    const crankX = cx + r * Math.sin(th), crankY = cy - r * Math.cos(th);
    $("#engPiston").setAttribute("y", top);
    $("#engGas").setAttribute("height", Math.max(0, top - 50));
    const rod = $("#engRod"); rod.setAttribute("x1", cx); rod.setAttribute("y1", pinY); rod.setAttribute("x2", crankX); rod.setAttribute("y2", crankY);
    const arm = $("#engArm"); arm.setAttribute("x1", cx); arm.setAttribute("y1", cy); arm.setAttribute("x2", crankX); arm.setAttribute("y2", crankY);
    $("#engPin").setAttribute("cx", crankX); $("#engPin").setAttribute("cy", crankY);
    const ph = EN.theta, stroke = Math.floor(ph / 180);
    const openI = ph < 190 ? Math.sin(Math.min(ph, 180) / 180 * Math.PI) : 0, openE = ph > 530 ? Math.sin((Math.min(ph, 710) - 530) / 180 * Math.PI) : 0;
    $("#engValveI").setAttribute("transform", `translate(0 ${openI * 8})`);
    $("#engValveE").setAttribute("transform", `translate(0 ${openE * 8})`);
    $("#engSpark").style.opacity = ph > 350 && ph < 378 ? 1 : 0;
    const gas = $("#engGas"), k = (ph % 180) / 180;
    gas.style.fill = ["hsl(205 80% 70%)", `hsl(215 80% ${66 - k * 14}%)`, `hsl(${40 - k * 35} 95% ${58 - k * 12}%)`, `hsl(220 8% ${55 + k * 10}%)`][stroke];
    gas.style.opacity = [0.55, 0.75, 0.9, 0.55][stroke];
    $(".eng-pipe.in").classList.toggle("flow", stroke === 0); $(".eng-pipe.out").classList.toggle("flow", stroke === 3);
    const names = ["INTAKE", "COMPRESSION", "POWER", "EXHAUST"], what = [["Piston moves down,", "sucking in fuel and air"], ["Valves shut and the piston", "squeezes the mixture"], ["The spark fires and burning", "gas shoves the piston down"], ["The piston rises and", "pushes burnt gas out"]];
    $("#engStroke").textContent = `${stroke + 1}. ${names[stroke]}`; $("#engStrokeD1").textContent = what[stroke][0]; $("#engStrokeD2").textContent = what[stroke][1];
    $$("#engSteps span").forEach((s) => s.classList.toggle("on", +s.dataset.i === stroke));
    engDrawProp(90, 210, 46, th, revPerSec * 2);
    return;
  }
  EN.phase += dt * (6 + 70 * t);
  $$("#engBlades .eng-blade").forEach((b) => (b.style.strokeDashoffset = -EN.phase * (b.classList.contains("fan") ? 0.6 : 1)));
  const fl = $("#engFlame"); fl.style.opacity = 0.25 + 0.75 * t * (0.85 + Math.random() * 0.15);
  if (e.prop) engDrawProp(e.prop.x, CY, e.prop.r, EN.phase * 0.05, 2 + t * 30);
  for (const p of EN.parts) {
    let v, inner, outer, temp;
    if (p.kind === "core") { v = pw(e.speed, p.x); temp = pw(e.temp, p.x); inner = pw(e.hub, p.x); outer = pw(e.core, p.x); }
    else if (p.kind === "bypass") { v = 210; temp = 0.03; inner = pw(e.bypassIn, p.x); outer = pw(e.bypassOut, p.x); }
    else { v = 230; temp = 0.02; inner = 54; outer = 114; } // propeller wash
    p.x += v * idle * dt;
    const start = p.kind === "core" ? e.coreFrom : p.kind === "bypass" ? 30 : 0;
    if (p.x > 640) { p.x = start - Math.random() * 30; p.yn = Math.random() * 2 - 1; }
    const y = CY + Math.sign(p.yn || 1) * (inner + 2 + Math.abs(p.yn) * Math.max(0, outer - inner - 4));
    p.el.setAttribute("cx", p.x.toFixed(1)); p.el.setAttribute("cy", y.toFixed(1));
    p.el.style.fill = engTempColor(temp); p.el.style.opacity = p.x < start ? 0 : 0.9;
  }
}
function initEngines() {
  $("#engSeg").innerHTML = ENG_ORDER.map((k) => `<button type="button" data-k="${k}">${ENGINES[k].name}</button>`).join("");
  $("#engSeg").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) { EN.key = b.dataset.k; EN.theta = 0; engBuild(); } });
  $("#engSvg").addEventListener("click", (e) => { const h = e.target.closest("[data-part]"); engSelectPart(h ? h.dataset.part : null); });
  $("#engThr").addEventListener("input", (e) => { EN.thr = e.target.value / 100; $("#engThrV").textContent = e.target.value + "%"; engReadouts(); });
  const rows = [["How it makes thrust", "how"], ["Best speed", "speed"], ["Strength", "good"], ["Weakness", "bad"], ["Found on", "seen"]];
  $("#engTable").innerHTML = `<tr><th></th>${ENG_ORDER.map((k) => `<th>${ENGINES[k].name}</th>`).join("")}</tr>` +
    rows.map(([lbl, key]) => `<tr><td><b>${lbl}</b></td>${ENG_ORDER.map((k) => `<td>${ENGINES[k].facts[key]}</td>`).join("")}</tr>`).join("");
  engBuild();
}

// ---------- One animation loop for every Lab experiment (only animates what's on screen) ----------
let labLast = 0;
function labTick(t) {
  const dt = Math.min((t - (labLast || t)) / 1000, 0.05); labLast = t;
  if ($("#page-lab").classList.contains("active")) {
    if ($("#tool-forces").offsetParent) ffStep(dt);
    if ($("#tool-aero").offsetParent) aeroStep(dt);
    if ($("#tool-engines").offsetParent) engStep(dt);
  }
  requestAnimationFrame(labTick);
}
initForces(); initAero(); initEngines();
requestAnimationFrame(labTick);

// ================= Flight Operations & Airport Management =================

// ---------- Airport Builder ----------
// A 20×12 tile grid. Runways are straight lines of ≥6 runway tiles and are numbered from their direction;
// a breadth-first search through taxiway tiles checks the runway is connected to the apron (and drives the test flight).
const AB_COLS = 20, AB_ROWS = 12, AB_T = 32;
const AB_TILES = {
  runway: { name: "Runway", icon: "🛬", d: "Where aircraft take off and land. Paint a <b>straight line at least 6 squares long</b>. It gets numbered automatically from the direction it points: east–west is 09/27, north–south is 18/36." },
  taxiway: { name: "Taxiway", icon: "🟨", d: "The 'roads' aircraft use between the runway and the apron. Real taxiways have yellow centrelines and blue edge lights. Join one side to the runway and the other to the apron." },
  apron: { name: "Apron", icon: "⬛", d: "The parking area (also called the ramp) where aircraft load, unload, and refuel next to the terminal." },
  terminal: { name: "Terminal", icon: "🏢", d: "The building for check-in, security, shops, and gates. It must touch the apron so passengers can reach the aircraft." },
  hangar: { name: "Hangar", icon: "🔧", d: "A giant garage where aircraft are maintained and stored. It needs taxiway or apron access so aircraft can be towed in." },
  tower: { name: "Control tower", icon: "🗼", d: "Air traffic controllers need a clear view of every runway and taxiway, so towers are tall and sit near the middle of the airfield." },
  fuel: { name: "Fuel farm", icon: "⛽", d: "Big tanks of jet fuel. Fuel trucks (or underground 'hydrant' pipes) carry it to the aircraft. Kept well away from the terminal for safety." },
  grass: { name: "Eraser (grass)", icon: "🌱", d: "Clears a square back to grass. Real runways have a wide grass strip on each side, kept clear of obstacles in case an aircraft runs off the edge." },
};
const AB = { grid: Array(AB_COLS * AB_ROWS).fill("grass"), tool: "runway", painting: false, raf: 0 };
const abIdx = (r, c) => r * AB_COLS + c;
const abAt = (r, c) => (r < 0 || c < 0 || r >= AB_ROWS || c >= AB_COLS ? null : AB.grid[abIdx(r, c)]);
const AB_N4 = [[0, 1], [1, 0], [0, -1], [-1, 0]];
function abRunways() {
  const runs = [];
  for (let r = 0; r < AB_ROWS; r++) for (let c = 0; c < AB_COLS; c++) {
    if (abAt(r, c) !== "runway") continue;
    if (abAt(r, c - 1) !== "runway") { let n = 0; while (abAt(r, c + n) === "runway") n++; if (n >= 6) runs.push({ dir: "h", r, c, n }); }
    if (abAt(r - 1, c) !== "runway") { let n = 0; while (abAt(r + n, c) === "runway") n++; if (n >= 6) runs.push({ dir: "v", r, c, n }); }
  }
  return runs;
}
const abRunTiles = (run) => Array.from({ length: run.n }, (_, i) => (run.dir === "h" ? [run.r, run.c + i] : [run.r + i, run.c]));
// Shortest path runway → taxiways → apron (or null).
function abRoute() {
  const runs = abRunways(); if (!runs.length) return null;
  const prev = new Map(), q = [];
  runs.forEach((run) => abRunTiles(run).forEach(([r, c]) => { const k = abIdx(r, c); if (!prev.has(k)) { prev.set(k, -1); q.push([r, c]); } }));
  while (q.length) {
    const [r, c] = q.shift(), here = abAt(r, c);
    for (const [dr, dc] of AB_N4) {
      const nr = r + dr, nc = c + dc, t = abAt(nr, nc);
      if (!t) continue;
      const k = abIdx(nr, nc);
      if (prev.has(k)) continue;
      if (t === "apron" && here === "taxiway") {
        prev.set(k, abIdx(r, c));
        const path = []; for (let x = k; x !== -1; x = prev.get(x)) path.unshift([Math.floor(x / AB_COLS), x % AB_COLS]);
        const run = runs.find((rn) => abRunTiles(rn).some(([a, b]) => a === path[0][0] && b === path[0][1]));
        return { path, run };
      }
      if (t === "taxiway") { prev.set(k, abIdx(r, c)); q.push([nr, nc]); }
    }
  }
  return null;
}
function abChecks() {
  const g = AB.grid, has = (t) => g.includes(t);
  const touches = (type, others) => g.some((t, i) => t === type && AB_N4.some(([dr, dc]) => others.includes(abAt(Math.floor(i / AB_COLS) + dr, i % AB_COLS + dc))));
  const runs = abRunways();
  return [
    ["Runway at least 6 squares long", runs.length > 0],
    ["Taxiway joining the runway to the apron", !!abRoute()],
    ["Terminal touching the apron", touches("terminal", ["apron"])],
    ["Hangar next to a taxiway or the apron", touches("hangar", ["apron", "taxiway"])],
    ["Control tower", has("tower")],
    ["Fuel farm", has("fuel")],
    ["Bonus: a second runway pointing another way (a crosswind runway)", new Set(runs.map((r) => r.dir)).size > 1, true],
  ];
}
const abNum = (run, atStart) => (run.dir === "h" ? (atStart ? "09" : "27") : (atStart ? "18" : "36"));
function abBuild() {
  let h = "";
  for (let r = 0; r < AB_ROWS; r++) for (let c = 0; c < AB_COLS; c++) h += `<rect x="${c * AB_T}" y="${r * AB_T}" width="${AB_T}" height="${AB_T}" class="ab-t" id="abT${abIdx(r, c)}"/>`;
  $("#abGrid").innerHTML = `<g>${h}</g><g id="abDeco"></g><g id="abPlane" style="display:none"><ellipse class="ab-shadow" rx="9" ry="4" cy="10"/><path class="ab-plane" d="M12 0 L-4 -2 L-6 -11 L-9 -11 L-9 -2 L-13 -2 L-15 -6 L-17 -6 L-16 0 L-17 6 L-15 6 L-13 2 L-9 2 L-9 11 L-6 11 L-4 2 Z"/></g>`;
}
function abRender() {
  AB.grid.forEach((t, i) => { $("#abT" + i).setAttribute("class", "ab-t ab-" + t); });
  const T = AB_T, ctr = (r, c) => [c * T + T / 2, r * T + T / 2];
  let d = "";
  // taxiway centrelines joining neighbours
  AB.grid.forEach((t, i) => {
    if (t !== "taxiway") return;
    const r = Math.floor(i / AB_COLS), c = i % AB_COLS, [x, y] = ctr(r, c);
    AB_N4.forEach(([dr, dc]) => { const n = abAt(r + dr, c + dc); if (n === "taxiway" || n === "runway" || n === "apron") d += `<line x1="${x}" y1="${y}" x2="${x + dc * T / 2}" y2="${y + dr * T / 2}" class="ab-twyline"/>`; });
    d += `<circle cx="${x}" cy="${y}" r="1.6" class="ab-twydot"/>`;
  });
  // runways: centreline + numbers
  abRunways().forEach((run) => {
    const t = abRunTiles(run), [x1, y1] = ctr(...t[0]), [x2, y2] = ctr(...t[t.length - 1]);
    const ux = run.dir === "h" ? 1 : 0, uy = run.dir === "v" ? 1 : 0;
    d += `<line x1="${x1 + ux * 24}" y1="${y1 + uy * 24}" x2="${x2 - ux * 24}" y2="${y2 - uy * 24}" class="ab-cl"/>`;
    d += `<text x="${x1 + ux * 8}" y="${y1 + uy * 8}" class="ab-num" transform="rotate(${run.dir === "h" ? 90 : 180} ${x1 + ux * 8} ${y1 + uy * 8})">${abNum(run, true)}</text>`;
    d += `<text x="${x2 - ux * 8}" y="${y2 - uy * 8}" class="ab-num" transform="rotate(${run.dir === "h" ? -90 : 0} ${x2 - ux * 8} ${y2 - uy * 8})">${abNum(run, false)}</text>`;
  });
  AB.grid.forEach((t, i) => {
    if (!["terminal", "hangar", "tower", "fuel"].includes(t)) return;
    const [x, y] = ctr(Math.floor(i / AB_COLS), i % AB_COLS);
    d += `<text x="${x}" y="${y}" class="ab-icon">${AB_TILES[t].icon}</text>`;
  });
  $("#abDeco").innerHTML = d;
  const checks = abChecks();
  $("#abCheck").innerHTML = checks.map(([txt, ok, bonus]) => `<li class="${ok ? "ok" : ""}${bonus ? " bonus" : ""}">${ok ? "✅" : bonus ? "⭐" : "⬜"} ${txt}</li>`).join("");
  const stray = AB.grid.includes("runway") && !abRunways().length;
  $("#abHint").textContent = stray ? "Runways must be straight lines at least 6 squares long." : "";
}
function abPalette() {
  $("#abPalette").innerHTML = Object.entries(AB_TILES).map(([k, t]) => `<button type="button" class="chip${k === AB.tool ? " active" : ""}" data-k="${k}"><span class="ab-sw ab-${k}"></span>${t.icon} ${t.name}</button>`).join("");
  const t = AB_TILES[AB.tool];
  $("#abInfo").innerHTML = `<div class="label">${t.icon} ${esc(t.name)}</div><p>${t.d}</p>`;
}
function abCell(e) {
  const rect = $("#abGrid").getBoundingClientRect();
  const c = Math.floor((e.clientX - rect.left) / rect.width * AB_COLS), r = Math.floor((e.clientY - rect.top) / rect.height * AB_ROWS);
  return r < 0 || c < 0 || r >= AB_ROWS || c >= AB_COLS ? null : abIdx(r, c);
}
// Paints the cell under the pointer, filling in any cells skipped since the last event (fast drags).
function abPaint(e) {
  const i = abCell(e); if (i === null) return;
  const from = AB.last ?? i, r0 = Math.floor(from / AB_COLS), c0 = from % AB_COLS, r1 = Math.floor(i / AB_COLS), c1 = i % AB_COLS;
  const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  let changed = false;
  for (let k = 0; k <= n; k++) {
    const j = abIdx(Math.round(r0 + (r1 - r0) * k / (n || 1)), Math.round(c0 + (c1 - c0) * k / (n || 1)));
    if (AB.grid[j] !== AB.tool) { AB.grid[j] = AB.tool; changed = true; }
  }
  AB.last = i;
  if (changed) abRender();
}
function abSave() { store.set("airportMap", AB.grid); }
function abExample() {
  AB.grid.fill("grass");
  const set = (r, c, t) => { AB.grid[abIdx(r, c)] = t; };
  for (let c = 2; c <= 17; c++) set(2, c, "runway");
  for (let c = 3; c <= 16; c++) set(4, c, "taxiway");
  set(3, 4, "taxiway"); set(3, 15, "taxiway");
  for (let r = 5; r <= 7; r++) for (let c = 6; c <= 13; c++) set(r, c, "apron");
  for (let c = 7; c <= 12; c++) set(8, c, "terminal");
  set(5, 15, "hangar"); set(5, 16, "hangar"); set(5, 3, "tower"); set(9, 2, "fuel");
  abRender(); abSave();
}
function abTest() {
  cancelAnimationFrame(AB.raf);
  const res = abRoute();
  if (!res) { $("#abHint").textContent = "To test, you need a runway with a taxiway leading to the apron."; return; }
  const T = AB_T, ctr = ([r, c]) => [c * T + T / 2, r * T + T / 2];
  const tiles = abRunTiles(res.run), entry = res.path[0];
  const iE = tiles.findIndex(([r, c]) => r === entry[0] && c === entry[1]);
  const ordered = iE >= tiles.length / 2 ? tiles : tiles.slice().reverse(); // land from the far end so there's room to slow down
  const p0 = ctr(ordered[0]), p1 = ctr(ordered[1]), ux = (p1[0] - p0[0]) / T, uy = (p1[1] - p0[1]) / T;
  const num = res.run.dir === "h" ? (ux > 0 ? "09" : "27") : (uy > 0 ? "18" : "36");
  // keyframes: [x, y, scale, speed(px/s) for the segment that ends here]
  const pts = [[p0[0] - ux * 150, p0[1] - uy * 150, 1.9, 0], [p0[0] + ux * 12, p0[1] + uy * 12, 1, 170], [...ctr(entry), 1, 110], ...res.path.slice(1).map((p) => [...ctr(p), 1, 55])];
  const plane = $("#abPlane"); plane.style.display = "";
  let seg = 1, prog = 0, last = 0;
  $("#abHint").textContent = `✈ Arriving on runway ${num}…`;
  const step = (t) => {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0; last = t;
    const a = pts[seg - 1], b = pts[seg], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    prog += (b[3] * dt) / len;
    if (prog >= 1) { prog = 0; seg++; if (seg >= pts.length) {
      $("#abHint").textContent = `✅ Landed on runway ${num} and taxied to the apron. Your airport is open!`;
      if (abChecks().slice(0, 6).every(([, ok]) => ok)) labAward("airport", "Opened your own airport");
      return; } }
    const A = pts[seg - 1], B = pts[seg], x = A[0] + (B[0] - A[0]) * prog, y = A[1] + (B[1] - A[1]) * prog, s = A[2] + (B[2] - A[2]) * prog;
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI;
    plane.setAttribute("transform", `translate(${x} ${y}) rotate(${ang}) scale(${s})`);
    $(".ab-shadow", plane).setAttribute("cy", 10 + (s - 1) * 30);
    AB.raf = requestAnimationFrame(step);
  };
  AB.raf = requestAnimationFrame(step);
}
function initBuilder() {
  const saved = store.get("airportMap", null);
  if (Array.isArray(saved) && saved.length === AB.grid.length) AB.grid = saved.map((t) => (AB_TILES[t] ? t : "grass"));
  abBuild(); abPalette(); abRender();
  $("#abPalette").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) { AB.tool = b.dataset.k; abPalette(); } });
  const svg = $("#abGrid");
  svg.addEventListener("pointerdown", (e) => { AB.painting = true; AB.last = null; svg.setPointerCapture(e.pointerId); $("#abPlane").style.display = "none"; cancelAnimationFrame(AB.raf); abPaint(e); });
  svg.addEventListener("pointermove", (e) => { if (AB.painting) abPaint(e); });
  const stop = () => { if (AB.painting) { AB.painting = false; abSave(); } };
  svg.addEventListener("pointerup", stop); svg.addEventListener("pointercancel", stop);
  $("#abTest").onclick = abTest;
  $("#abExample").onclick = () => { $("#abPlane").style.display = "none"; abExample(); };
  $("#abClear").onclick = () => { $("#abPlane").style.display = "none"; AB.grid.fill("grass"); abRender(); abSave(); };
}

// ---------- Runway Explorer ----------
const RW_INFO = {
  thr: ["Threshold markings ('piano keys')", "White stripes across the start of the usable runway. The number of stripes tells you how wide the runway is: 8 stripes means 30 m, 12 means 45 m."],
  num: ["Runway number (designation)", "The runway's magnetic direction divided by 10 and rounded. This end is <b>09</b> because you land heading about 090° (east). The far end is <b>27</b> (270°, west). The two numbers always differ by 18."],
  cl: ["Centreline", "A dashed white line down the middle. Pilots keep the nose wheel on it during takeoff and landing."],
  tdz: ["Touchdown zone markings", "Groups of white bars every 150 m (500 ft) from the threshold, in sets of 3, then 2, then 1. They show how far down the runway you are, so you know you've touched down in time."],
  aim: ["Aiming point", "The two big white blocks about 300 m (1,000 ft) from the threshold. This is where the glide path meets the runway, so it's the spot pilots aim for."],
  edge: ["Runway side stripes", "Solid white lines mark the edges of the full-strength runway surface."],
  hold: ["Runway holding position", "Two solid and two dashed yellow lines across the taxiway. Arriving from the <b>solid</b> side, you must stop here until ATC clears you onto the runway. It's one of the most important markings at any airport."],
  twy: ["Taxiway centreline", "The yellow line aircraft follow while taxiing. The rule of thumb: runway markings are <b>white</b>, taxiway markings are <b>yellow</b>."],
  signs: ["Airport signs", "<b>Red signs</b> with white writing are mandatory: '09-27' means a runway is just ahead. <b>Black signs</b> with yellow letters ('B') tell you which taxiway you're on. <b>Yellow signs</b> with black letters point the way to other taxiways."],
  als: ["Approach lights", "A line of very bright lights reaching out into the approach (up to about 900 m), with crossbars. In fog they lead pilots to the runway. Many have 'rabbit' strobes that flash in sequence towards the runway."],
  thrl: ["Threshold lights (green)", "A row of green lights across the start of the runway, meaning 'the runway starts here'."],
  endl: ["Runway end lights (red)", "Red lights across the far end: the runway ends here. Each end really has both: green facing aircraft about to land, red facing aircraft rolling down the runway."],
  edgel: ["Runway edge lights", "White lights along both edges. On instrument runways the last 600 m (2,000 ft) are <b>yellow</b>: a warning that the end is coming up."],
  cll: ["Centreline lights", "Set into the runway surface itself. White at first, then alternating <b>red and white</b> for the last 900 m, and all <b>red</b> for the final 300 m."],
  papi: ["PAPI", "Precision Approach Path Indicator: four lights beside the aiming point. <b>Two white and two red</b> means you're on the correct glide path (usually 3°). Try the PAPI simulator below."],
  twyl: ["Taxiway lights", "Taxiway edges have <b>blue</b> lights, and many taxiways also have <b>green</b> centreline lights. Blue means taxiway, white means runway."],
};
const RW = { night: false, sel: null, papi: 3 };
function rwBuild() {
  const g = (k, cls, inner, hit) => `<g class="rw-el ${cls}" data-k="${k}">${inner}${hit ? `<rect class="rw-hit" x="${hit[0]}" y="${hit[1]}" width="${hit[2]}" height="${hit[3]}"/>` : ""}</g>`;
  const bars = (x, w, ys) => ys.map((y) => `<rect x="${x}" y="${y}" width="${w}" height="5"/>`).join("");
  const keysY = [104, 113, 122, 131, 164, 173, 182, 191];
  const dots = (pts, cls) => pts.map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3.2" class="rw-l ${c || cls}"/>`).join("");
  const range = (a, b, s) => { const o = []; for (let v = a; v <= b; v += s) o.push(v); return o; };
  let h = `<rect width="1000" height="300" class="rw-grass"/>
    <path d="M640 300 L640 222 Q640 205 622 205 L708 205 Q690 205 690 222 L690 300 Z" class="rw-asphalt twy"/>
    <rect x="80" y="95" width="840" height="110" class="rw-asphalt"/>`;
  h += g("edge", "rw-paint", `<line x1="80" y1="99" x2="920" y2="99" class="rw-white"/><line x1="80" y1="201" x2="920" y2="201" class="rw-white"/>`, [80, 95, 840, 8]);
  h += g("thr", "rw-paint", `<g class="rw-fill">${bars(86, 40, keysY)}${bars(874, 40, keysY)}</g>`, [84, 100, 46, 100]);
  h += g("num", "rw-paint", `<text x="160" y="150" class="rw-num" transform="rotate(90 160 150)">09</text><text x="840" y="150" class="rw-num" transform="rotate(-90 840 150)">27</text>`, [140, 120, 40, 60]);
  h += g("cl", "rw-paint", `<line x1="200" y1="150" x2="800" y2="150" class="rw-cl"/>`, [300, 144, 360, 12]);
  h += g("aim", "rw-paint", `<g class="rw-fill"><rect x="250" y="106" width="44" height="14"/><rect x="250" y="180" width="44" height="14"/><rect x="706" y="106" width="44" height="14"/><rect x="706" y="180" width="44" height="14"/></g>`, [248, 104, 48, 92]);
  const tdz = (x, n) => bars(x, 22, [108, 115, 122].slice(0, n)) + bars(x, 22, [184, 177, 170].slice(0, n));
  h += g("tdz", "rw-paint", `<g class="rw-fill">${tdz(200, 3)}${tdz(340, 2)}${tdz(400, 1)}${tdz(778, 3)}${tdz(638, 2)}${tdz(578, 1)}</g>`, [196, 104, 230, 22]);
  h += g("twy", "rw-paint", `<path d="M665 300 L665 222 Q665 152 600 152" class="rw-yellow"/>`, [655, 255, 20, 45]);
  h += g("hold", "rw-paint", `<line x1="640" y1="232" x2="690" y2="232" class="rw-yellow dash"/><line x1="640" y1="237" x2="690" y2="237" class="rw-yellow dash"/><line x1="640" y1="243" x2="690" y2="243" class="rw-yellow"/><line x1="640" y1="248" x2="690" y2="248" class="rw-yellow"/>`, [638, 228, 54, 24]);
  h += g("signs", "rw-paint", `<rect x="586" y="232" width="46" height="18" rx="2" class="rw-sign-red"/><text x="609" y="241" class="rw-signtxt">09-27</text><rect x="697" y="232" width="18" height="18" rx="2" class="rw-sign-loc"/><text x="706" y="241" class="rw-signtxt loc">B</text>`, [584, 230, 134, 22]);
  // lights
  h += g("als", "rw-light", dots([...range(6, 70, 8).map((x) => [x, 150]), ...range(122, 178, 8).map((y) => [38, y]), ...range(132, 168, 9).map((y) => [14, y])], "white"), [0, 118, 76, 64]);
  h += g("thrl", "rw-light", dots(range(100, 200, 10).map((y) => [80, y]), "green"), [74, 96, 12, 108]);
  h += g("endl", "rw-light", dots(range(100, 200, 10).map((y) => [920, y]), "red"), [914, 96, 12, 108]);
  h += g("edgel", "rw-light", dots(range(100, 900, 40).flatMap((x) => [[x, 91, x > 780 ? "yellow" : "white"], [x, 209, x > 780 ? "yellow" : "white"]]), "white"), [96, 86, 812, 10]);
  h += g("cll", "rw-light", dots(range(110, 900, 20).map((x, i) => [x, 156, x > 860 ? "red" : x > 760 && i % 2 ? "red" : "white"]), "white"), [100, 151, 810, 10]);
  h += `<g class="rw-el rw-light rw-papi-g" data-k="papi">${[0, 1, 2, 3].map((i) => `<circle cx="272" cy="${84 - i * 9}" r="4" class="rw-l papi" id="rwPapiL${i}"/>`).join("")}<rect class="rw-hit" x="262" y="50" width="20" height="42"/></g>`;
  h += g("twyl", "rw-light", dots([...range(216, 296, 20).flatMap((y) => [[636, y, "blue"], [694, y, "blue"]]), ...range(258, 296, 12).map((y) => [665, y, "green"])], "blue"), [632, 212, 66, 88]);
  h += `<text x="12" y="20" class="rw-cap">← landing direction for runway 09 (east)  →</text><text x="988" y="20" class="rw-cap end">PAPI = the column of 4 lights above the aiming point ↓</text>`;
  $("#rwSvg").innerHTML = h;
}
function rwRender() {
  $("#rwSvg").classList.toggle("night", RW.night);
  $$("#rwMode button").forEach((b) => b.classList.toggle("active", (b.dataset.m === "night") === RW.night));
  $$("#rwSvg .rw-el").forEach((el) => el.classList.toggle("sel", el.dataset.k === RW.sel));
  const it = RW_INFO[RW.sel];
  $("#rwInfo").innerHTML = it ? `<div class="label">${esc(it[0])}</div><p>${it[1]}</p>`
    : `<p class="sub">👆 ${RW.night ? "It's night: click any group of lights to find out what it tells pilots." : "Click any marking on the runway or taxiway. Switch to night to explore the lights."}</p>`;
}
function rwPapi() {
  const a = RW.papi, angles = [2.5, 2.83, 3.17, 3.5]; // light nearest the runway has the highest setting
  const white = angles.map((x) => a > x);
  // lights 0 = outermost … 3 = nearest runway; in the runway picture nearest runway is drawn lowest (i = 0 → y 84)
  [0, 1, 2, 3].forEach((i) => { const el = $("#rwPapiL" + i); if (el) el.setAttribute("class", "rw-l papi " + (white[3 - i] ? "white" : "red")); });
  const n = white.filter(Boolean).length;
  const k = 6, gy = 125, tx = 300, px = 140, py = gy - (tx - px) * Math.tan(a * Math.PI / 180) * k / 2.2;
  const ideal = gy - (tx - 20) * Math.tan(3 * Math.PI / 180) * k / 2.2;
  $("#rwPapiSvg").innerHTML = `<g>${white.map((w, i) => `<circle cx="${28 + i * 30}" cy="26" r="11" class="papi-lamp ${w ? "white" : "red"}"/>`).join("")}<text x="73" y="54" class="papi-cap">outside ⟵ ⟶ runway</text></g>
    <line x1="10" y1="${gy}" x2="310" y2="${gy}" class="papi-ground"/><rect x="250" y="${gy - 3}" width="60" height="6" class="papi-rwy"/>
    <line x1="20" y1="${ideal}" x2="${tx}" y2="${gy}" class="papi-ideal"/><text x="24" y="${ideal - 5}" class="papi-cap">3° glide path</text>
    <line x1="${px}" y1="${py}" x2="${tx}" y2="${gy}" class="papi-you"/>
    <g transform="translate(${px} ${py}) rotate(${a})"><path d="M10 0 L-8 -2 L-10 -7 L-13 -7 L-12 0 L-13 3 L-8 2 Z" class="papi-plane"/></g>`;
  const msg = ["🔴🔴🔴🔴 <b>All red: far too low!</b> Add power and climb back up to the glide path now.", "⚪🔴🔴🔴 <b>Slightly low.</b> Ease up a little.", "⚪⚪🔴🔴 <b>Two white, two red: right on the glide path.</b> Perfect.", "⚪⚪⚪🔴 <b>Slightly high.</b> Ease down a little.", "⚪⚪⚪⚪ <b>All white: too high.</b> You'll land long, using up runway."][n];
  $("#rwPapiTip").innerHTML = msg + ` <small>Memory aid: "white on white, you'll fly all night; red on red, you're dead."</small>`;
  $("#rwPapiV").textContent = a.toFixed(1) + "°";
}
function rwCalc() {
  const h = +$("#rwHdg").value, par = +$("#rwPar").value;
  const num = (d) => { const n = Math.round(d / 10) % 36; return String(n === 0 ? 36 : n).padStart(2, "0"); };
  const opp = (h + 180) % 360 || 360, n1 = num(h), n2 = num(opp);
  const letters = par === 1 ? [""] : par === 2 ? ["L", "R"] : ["L", "C", "R"];
  const offs = par === 1 ? [0] : par === 2 ? [-26, 26] : [-38, 0, 38];
  const rw = offs.map((x, i) => `<rect x="${x - 8}" y="-72" width="16" height="144" class="rwc-rwy"/>
      <text x="${x}" y="60" class="rwc-num">${n1}${letters[i]}</text>
      <text x="${x}" y="-60" class="rwc-num" transform="rotate(180 ${x} -60)">${n2}${letters[letters.length - 1 - i]}</text>`).join("");
  $("#rwCompass").innerHTML = `<circle r="100" class="rwc-ring"/>${["N", "E", "S", "W"].map((t, i) => `<text x="${[0, 92, 0, -92][i]}" y="${[-88, 4, 96, 4][i]}" class="rwc-dir">${t}</text>`).join("")}
    <g transform="rotate(${h})">${rw}<path d="M0 -96 L-6 -84 L6 -84 Z" class="rwc-arrow"/></g>`;
  $("#rwHdgV").textContent = String(h).padStart(3, "0") + "°";
  let t = `A runway pointing <b>${String(h).padStart(3, "0")}°</b>: ${h} ÷ 10 = ${(h / 10).toFixed(1)}, rounded to <b>${n1}</b>. Use it the other way and you're heading <b>${String(opp).padStart(3, "0")}°</b>, so the far end is runway <b>${n2}</b>.`;
  if (n1 === "36" || n2 === "36") t += " There's no runway 0, so north is always <b>36</b>.";
  if (par > 1) t += ` With ${par} side-by-side runways, letters are added as seen by the landing pilot: <b>${letters.map((l) => n1 + l).join(", ")}</b>. From the other end, left and right swap, so ${n1}L is also ${n2}R.`;
  $("#rwCalcOut").innerHTML = `<p>${t}</p>`;
}
function initRunway() {
  rwBuild(); rwRender(); rwPapi(); rwCalc();
  $("#rwSvg").addEventListener("click", (e) => { const el = e.target.closest(".rw-el"); RW.sel = el ? el.dataset.k : null; rwRender(); if (el) labAward("runway", "Runway explorer"); });
  $("#rwMode").addEventListener("click", (e) => { const b = e.target.closest("button[data-m]"); if (!b) return; RW.night = b.dataset.m === "night"; RW.sel = null; rwRender(); });
  $("#rwPapi").addEventListener("input", (e) => { RW.papi = +e.target.value; rwPapi(); });
  $("#rwHdg").addEventListener("input", rwCalc); $("#rwPar").addEventListener("change", rwCalc);
}

// ---------- Flight Planning Room ----------
// A fictional island group. Distances: 1 map unit = 0.6 NM.
const FP_NM = 0.6;
const FP_AIRPORTS = {
  XNPT: { name: "Northport Intl", x: 120, y: 85, rwy: 3000 },
  XWCF: { name: "Westcliff", x: 70, y: 232, rwy: 1200 },
  XSBY: { name: "Southbay", x: 172, y: 342, rwy: 1800 },
  XLAK: { name: "Lakeside", x: 298, y: 262, rwy: 1400 },
  XMTN: { name: "Mountain Strip", x: 292, y: 128, rwy: 900 },
  XEFD: { name: "Eastfield", x: 548, y: 150, rwy: 2500 },
  XHBC: { name: "Harbour City Intl", x: 474, y: 338, rwy: 3200 },
};
const FP_WPTS = { GULLS: [420, 58], PEAKS: [220, 70], PINEY: [205, 196], RIVER: [392, 252], CORAL: [318, 372], SANDY: [96, 300], MISTY: [566, 258] };
const FP_RESTRICT = [[372, 104], [466, 94], [492, 184], [398, 206]];
const FP_TYPES = {
  trainer: { name: "Light trainer", icon: "🛩️", spd: 110, burn: 27, cap: 115, rwy: 600, taxi: 2, reserve: 0.75, unit: "kg" },
  turboprop: { name: "Turboprop", icon: "✈️", spd: 270, burn: 650, cap: 5000, rwy: 1300, taxi: 40, reserve: 0.5, unit: "kg" },
  jet: { name: "Airliner jet", icon: "🛫", spd: 450, burn: 2500, cap: 20000, rwy: 2000, taxi: 200, reserve: 0.5, unit: "kg" },
};
const FP_STEPS = ["Departure", "Destination", "Route (waypoints)", "Alternate"];
const FP = { type: "turboprop", dep: null, dest: null, route: [], alt: null, step: 0, wx: {}, mission: null };
const fpPt = (id) => (FP_AIRPORTS[id] ? [FP_AIRPORTS[id].x, FP_AIRPORTS[id].y] : FP_WPTS[id]);
const fpDist = (a, b) => { const p = fpPt(a), q = fpPt(b); return Math.hypot(p[0] - q[0], p[1] - q[1]) * FP_NM; };
const fpHM = (h) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`;
const fpKg = (v) => Math.round(v).toLocaleString("en-US");
function fpSegHitsPoly([x1, y1], [x2, y2], poly) {
  const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const inside = ([px, py]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; };
  if (inside([x1, y1]) || inside([x2, y2])) return true;
  return poly.some((p, i) => { const q = poly[(i + 1) % poly.length];
    const d1 = cross(...p, ...q, x1, y1), d2 = cross(...p, ...q, x2, y2), d3 = cross(x1, y1, x2, y2, ...p), d4 = cross(x1, y1, x2, y2, ...q);
    return d1 * d2 < 0 && d3 * d4 < 0; });
}
function fpLegs() { if (!FP.dep || !FP.dest) return []; const pts = [FP.dep, ...FP.route, FP.dest]; return pts.slice(1).map((p, i) => [pts[i], p]); }
function fpCalc() {
  const t = FP_TYPES[FP.type], dist = fpLegs().reduce((s, [a, b]) => s + fpDist(a, b), 0), time = dist / t.spd;
  const trip = time * t.burn, cont = trip * 0.05, altDist = FP.alt && FP.dest ? fpDist(FP.dest, FP.alt) : 0, altFuel = altDist / t.spd * t.burn, res = t.reserve * t.burn;
  return { dist, time, trip, cont, altDist, altFuel, res, taxi: t.taxi, total: t.taxi + trip + cont + altFuel + res };
}
function fpChecks() {
  const t = FP_TYPES[FP.type], c = fpCalc(), out = [];
  out.push(["Departure and destination chosen", !!(FP.dep && FP.dest)]);
  const short = [FP.dep, FP.dest, FP.alt].filter((a) => a && FP_AIRPORTS[a].rwy < t.rwy);
  out.push([short.length ? `Runway too short at ${short.join(", ")} (the ${t.name.toLowerCase()} needs ${t.rwy.toLocaleString("en-US")} m)` : `Runways long enough (needs ${t.rwy.toLocaleString("en-US")} m)`, !!FP.dep && !short.length]);
  const legs = fpLegs().concat(FP.alt && FP.dest ? [[FP.dest, FP.alt]] : []);
  const bad = legs.some(([a, b]) => fpSegHitsPoly(fpPt(a), fpPt(b), FP_RESTRICT));
  out.push([bad ? "Route crosses restricted area R-101: add waypoints to go around it" : "Route avoids restricted area R-101", legs.length > 0 && !bad]);
  const altOk = FP.alt && FP.alt !== FP.dest && FP.wx[FP.alt] !== "bad";
  out.push([FP.alt && FP.wx[FP.alt] === "bad" ? `Alternate ${FP.alt} has bad weather: choose another` : "Alternate airport chosen with good weather", !!altOk]);
  out.push([c.total > t.cap ? `Not enough fuel: need ${fpKg(c.total)} kg, tanks hold ${fpKg(t.cap)} kg` : "Enough fuel on board", !!FP.dest && c.total <= t.cap]);
  if (FP.mission) out.push(["Matches today's mission", FP.dep === FP.mission.dep && FP.dest === FP.mission.dest && FP.type === FP.mission.type]);
  return out;
}
function fpMap() {
  const isle = "M40 140 C40 60 150 30 260 44 C360 30 470 20 560 70 C620 110 610 210 600 260 C590 330 530 380 440 384 C350 400 250 400 160 386 C80 374 30 320 34 240 Z";
  const legs = fpLegs().map(([a, b]) => { const [x1, y1] = fpPt(a), [x2, y2] = fpPt(b); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="fp-leg"/>`; }).join("");
  const altLeg = FP.alt && FP.dest ? (() => { const [x1, y1] = fpPt(FP.dest), [x2, y2] = fpPt(FP.alt); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="fp-leg alt"/>`; })() : "";
  const legLabels = fpLegs().map(([a, b]) => { const [x1, y1] = fpPt(a), [x2, y2] = fpPt(b); return `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 5}" class="fp-dist">${Math.round(fpDist(a, b))} NM</text>`; }).join("");
  const role = (id) => (id === FP.dep ? "dep" : id === FP.dest ? "dest" : id === FP.alt ? "alt" : "");
  const aps = Object.entries(FP_AIRPORTS).map(([id, a]) => { const r = role(id), wx = FP.wx[id];
    return `<g class="fp-ap ${r}" data-ap="${id}" transform="translate(${a.x} ${a.y})"><circle r="15" class="fp-hit"/><circle r="8" class="fp-ring"/><line x1="-12" y1="7" x2="12" y2="-7" class="fp-rwy"/>
      <text y="-14" class="fp-code">${id}</text><text y="22" class="fp-apname">${esc(a.name)} · ${a.rwy.toLocaleString("en-US")} m</text>
      ${wx === "bad" ? `<text x="13" y="-2" class="fp-wx">🌫️</text>` : wx === "marginal" ? `<text x="13" y="-2" class="fp-wx">🌥️</text>` : ""}
      ${r ? `<text x="-13" y="-2" class="fp-tag">${{ dep: "DEP", dest: "DEST", alt: "ALTN" }[r]}</text>` : ""}<title>${id} ${a.name}: runway ${a.rwy} m</title></g>`; }).join("");
  const wps = Object.entries(FP_WPTS).map(([id, [x, y]]) => `<g class="fp-wp${FP.route.includes(id) ? " on" : ""}" data-wp="${id}" transform="translate(${x} ${y})"><circle r="12" class="fp-hit"/><path d="M0 -6 L6 5 L-6 5 Z"/><text y="17" class="fp-wpname">${id}</text><title>Waypoint ${id}</title></g>`).join("");
  $("#fpMap").innerHTML = `<rect width="640" height="420" class="fp-sea"/><path d="${isle}" class="fp-land"/>
    <path d="M250 150 L270 112 L290 150 Z M276 154 L300 104 L322 154 Z M304 160 L322 128 L340 160 Z" class="fp-mtn"/>
    <polygon points="${FP_RESTRICT.map((p) => p.join(",")).join(" ")}" class="fp-restrict"/><text x="432" y="146" class="fp-rlabel">R-101</text><text x="432" y="158" class="fp-rlabel small">military · active</text>
    ${altLeg}${legs}${legLabels}${wps}${aps}
    <g transform="translate(600 30)"><path d="M0 -14 L5 4 L0 0 L-5 4 Z" class="fp-north"/><text y="18" class="fp-code">N</text></g>
    <text x="16" y="408" class="fp-scale">Fictional map · 100 NM ⟷</text><line x1="150" y1="404" x2="${150 + 100 / FP_NM}" y2="404" class="fp-scalebar"/>`;
}
function fpRender() {
  fpMap();
  $$("#fpType button").forEach((b) => b.classList.toggle("active", b.dataset.t === FP.type));
  $("#fpSteps").innerHTML = FP_STEPS.map((s, i) => `<button type="button" class="${i === FP.step ? "on" : ""}${[FP.dep, FP.dest, FP.route.length, FP.alt][i] ? " done" : ""}" data-s="${i}">${i + 1}. ${s}</button>`).join("") +
    (FP.step === 2 ? `<button type="button" class="next" data-s="3">Route done → pick alternate</button>` : "");
  $("#fpHint").textContent = ["Click an airport to depart from.", "Click your destination airport.", "Click waypoints (triangles) in order to build your route. Straight lines between points are 'direct' (DCT).", "Click an airport to use as your alternate if you can't land at the destination."][FP.step];
  const checks = fpChecks(), ok = checks.every(([, v]) => v);
  $("#fpChecks").innerHTML = checks.map(([t, v]) => `<li class="${v ? "ok" : ""}">${v ? "✅" : "⬜"} ${esc(t)}</li>`).join("") + (ok ? `<li class="ok approved">🟢 Flight plan approved. Have a good flight!</li>` : "");
  if (ok) labAward("plan", "Flight plan approved");
  const t = FP_TYPES[FP.type], c = fpCalc();
  const route = FP.route.length ? `DCT ${FP.route.join(" DCT ")} DCT` : FP.dest ? "DCT (direct)" : "–";
  const row = (k, v, cls = "") => `<tr class="${cls}"><th>${k}</th><td>${v}</td></tr>`;
  $("#fpStrip").innerHTML = `<table>${row("Aircraft", `${t.icon} ${t.name} · ${t.spd} kt`)}${row("From", FP.dep ? `${FP.dep} ${esc(FP_AIRPORTS[FP.dep].name)}` : "–")}${row("Route", route)}${row("To", FP.dest ? `${FP.dest} ${esc(FP_AIRPORTS[FP.dest].name)}` : "–")}${row("Alternate", FP.alt ? `${FP.alt} (${Math.round(c.altDist)} NM)` : "–")}
    ${row("Distance", FP.dest ? `${Math.round(c.dist)} NM` : "–")}${row("Flight time", FP.dest ? fpHM(c.time) : "–")}</table>
    <table class="fp-fuel">${row("Trip fuel", fpKg(c.trip) + " kg")}${row("Contingency 5%", fpKg(c.cont) + " kg")}${row("Alternate", fpKg(c.altFuel) + " kg")}${row(`Final reserve (${t.reserve * 60} min)`, fpKg(c.res) + " kg")}${row("Taxi", fpKg(c.taxi) + " kg")}
    ${row("Total needed", `${fpKg(c.total)} / ${fpKg(t.cap)} kg`, c.total > t.cap ? "over" : "total")}</table>`;
}
function fpClick(e) {
  const ap = e.target.closest("[data-ap]"), wp = e.target.closest("[data-wp]");
  if (wp) { const id = wp.dataset.wp; if (FP.route[FP.route.length - 1] !== id) FP.route.push(id); FP.step = 2; }
  else if (ap) {
    const id = ap.dataset.ap;
    if (FP.step === 0) { FP.dep = id; if (FP.dest === id) FP.dest = null; FP.step = FP.dest ? 2 : 1; }
    else if (FP.step === 1) { if (id === FP.dep) { $("#fpHint").textContent = "Pick a different airport from your departure."; return; } FP.dest = id; FP.step = 2; }
    else if (FP.step === 2) { $("#fpHint").textContent = "You're building the route, so click waypoints (triangles). Press 'Route done' to choose your alternate."; return; }
    else { if (id === FP.dest) { $("#fpHint").textContent = "The alternate has to be a different airport from your destination."; return; } FP.alt = id; }
  } else return;
  fpRender();
}
function fpNewMission() {
  const ids = Object.keys(FP_AIRPORTS), types = Object.keys(FP_TYPES);
  for (let tries = 0; tries < 200; tries++) {
    const type = types[Math.random() * types.length | 0], t = FP_TYPES[type];
    const ok = ids.filter((i) => FP_AIRPORTS[i].rwy >= t.rwy);
    const dep = ok[Math.random() * ok.length | 0], dest = ok[Math.random() * ok.length | 0];
    if (dep === dest || fpDist(dep, dest) < 120) continue;
    // fog at the airport nearest the destination (other than dep) makes the alternate choice matter
    const near = ids.filter((i) => i !== dest && i !== dep).sort((a, b) => fpDist(dest, a) - fpDist(dest, b))[0];
    // make sure it's flyable: 25% extra distance for detours plus fuel to the nearest usable alternate
    const altD = Math.min(...ids.filter((i) => i !== dest && i !== near && FP_AIRPORTS[i].rwy >= t.rwy).map((i) => fpDist(dest, i)));
    const need = t.taxi + fpDist(dep, dest) * 1.25 / t.spd * t.burn * 1.05 + altD / t.spd * t.burn + t.reserve * t.burn;
    if (need > t.cap * 0.95) continue;
    Object.assign(FP, { type, dep: null, dest: null, route: [], alt: null, step: 0, wx: { [near]: "bad", [dest]: "marginal" }, mission: { type, dep, dest } });
    $("#fpMissionText").innerHTML = `📋 <b>Mission:</b> fly the <b>${t.name.toLowerCase()}</b> from <b>${dep} ${FP_AIRPORTS[dep].name}</b> to <b>${dest} ${FP_AIRPORTS[dest].name}</b>. The forecast at ${dest} is marginal (🌥️), so you need an alternate, and <b>${near}</b> is fogged in (🌫️). Military area R-101 is active.`;
    fpRender(); return;
  }
}
const FP_TERMS = [
  ["Departure", "The airport you leave from. Pilots check its runway, weather, and any NOTAMs (notices about closures or hazards) before going."],
  ["Destination", "Where you plan to land. Its runway must be long enough for your aircraft, and its weather must be good enough to land."],
  ["Route", "The path between the two. Real flights follow airways (motorways in the sky) or fly 'direct' (DCT) between points, avoiding restricted airspace."],
  ["Waypoints", "Named points in the sky, usually five letters like GULLS. A route is a list of waypoints, which makes it easy to tell ATC exactly where you're going."],
  ["Alternate airport", "A backup airport, chosen before departure, in case you can't land at the destination (weather, a blocked runway). You must carry fuel to get there."],
  ["Fuel planning", "Trip fuel + a little extra (contingency) + fuel to reach the alternate + a final reserve (30–45 min) + taxi. Running short is never an option."],
];
function initPlanning() {
  $("#fpType").innerHTML = Object.entries(FP_TYPES).map(([k, t]) => `<button type="button" data-t="${k}">${t.icon} ${t.name}</button>`).join("");
  $("#fpType").addEventListener("click", (e) => { const b = e.target.closest("button[data-t]"); if (b) { FP.type = b.dataset.t; fpRender(); } });
  $("#fpSteps").addEventListener("click", (e) => { const b = e.target.closest("button[data-s]"); if (b) { FP.step = +b.dataset.s; fpRender(); } });
  $("#fpMap").addEventListener("click", fpClick);
  $("#fpUndo").onclick = () => { FP.route.pop(); fpRender(); };
  $("#fpReset").onclick = () => { Object.assign(FP, { dep: null, dest: null, route: [], alt: null, step: 0 }); fpRender(); };
  $("#fpMission").onclick = fpNewMission;
  $("#fpTerms").innerHTML = FP_TERMS.map(([h, p]) => `<div><h5>${h}</h5><p>${p}</p></div>`).join("");
  $("#fpMissionText").innerHTML = "Free planning: pick anything you like, or press <b>🎲 New mission</b> for a challenge.";
  fpRender();
}

// ---------- Ground Operations (turnaround) ----------
const GO_TASKS = [
  { id: "chocks", name: "Chocks & cones", icon: "👷", s: 0, e: 2, who: "Ramp crew", d: "As soon as the engines stop, wheel chocks go in and safety cones go around the wingtips and engines. Nobody approaches the aircraft until the anti-collision beacon is off." },
  { id: "gpu", name: "Ground power", icon: "🔌", s: 1, e: 41, who: "Ramp crew", d: "A ground power unit (GPU) plugs into the nose to power the lights, air-con, and computers, so the aircraft doesn't need to run its noisy, fuel-hungry APU (a small engine in the tail)." },
  { id: "bridge", name: "Jet bridge", icon: "🌉", s: 1, e: 41, who: "Bridge operator", d: "The air bridge drives up to the front left door. Passengers always use the <b>left</b> side, leaving the right side free for service vehicles." },
  { id: "deboard", name: "Passengers off", icon: "🚶", s: 2, e: 12, who: "Cabin crew", d: "Up to ~180 passengers leave through the front door in about 10 minutes." },
  { id: "unload", name: "Unload bags & cargo", icon: "🧳", s: 3, e: 15, who: "Baggage handlers", d: "Belt loaders carry bags out of the cargo holds (under the floor) onto baggage carts, which tug them to the terminal." },
  { id: "maint", name: "Engineer walk-around", icon: "🧑‍🔧", s: 4, e: 28, who: "Maintenance engineer", d: "An engineer walks around the aircraft checking tyres, brakes, engines, and for leaks or damage, fixes any defects the pilots reported, and signs the technical log." },
  { id: "fuel", name: "Refuelling", icon: "⛽", s: 8, e: 25, who: "Fuel crew", d: "Fuel comes through a panel under the <b>right</b> wing. If passengers are on board during fuelling, the cabin crew must keep exits ready and the fire service is told." },
  { id: "water", name: "Water & toilets", icon: "💧", s: 10, e: 20, who: "Service crew", d: "Fresh drinking water is topped up and the toilet tanks are emptied, from service panels underneath." },
  { id: "clean", name: "Cabin cleaning", icon: "🧹", s: 12, e: 24, who: "Cleaning crew", d: "Seat pockets emptied, rubbish collected, toilets cleaned, seatbelts crossed. On short turnarounds the cabin crew often help." },
  { id: "cater", name: "Catering", icon: "🍱", s: 12, e: 26, who: "Catering crew", d: "A high-lift truck raises its box to the right rear door to swap used trolleys for fresh food and drinks." },
  { id: "load", name: "Load bags & cargo", icon: "📦", s: 17, e: 38, who: "Baggage handlers", d: "New bags are loaded in a planned order. Where heavy items go affects the aircraft's balance (centre of gravity)." },
  { id: "board", name: "Passengers board", icon: "🎫", s: 25, e: 39, who: "Gate agents & cabin crew", d: "Boarding by group or zone. Gate agents count passengers so the numbers match the load sheet." },
  { id: "docs", name: "Load sheet", icon: "📋", s: 35, e: 41, who: "Dispatcher / load controller", d: "The final load sheet (passengers, bags, cargo, fuel, and balance) is sent to the pilots. The captain checks and signs it before departure." },
  { id: "doors", name: "Doors closed", icon: "🚪", s: 40, e: 42, who: "Cabin crew", d: "All doors closed and 'armed' (so the escape slides inflate if opened in an emergency), and the bridge pulls back." },
  { id: "push", name: "Pushback", icon: "🚜", s: 42, e: 45, who: "Tug driver & headset operator", d: "Airliners can't reverse on their own at the gate, so a tug pushes the aircraft back. The headset operator talks to the pilots throughout." },
];
// Vehicles: where they park (x, y), where they drive in from (dx, dy), and which tasks they serve.
const GO_VEH = [
  { tasks: ["chocks"], x: 296, y: 120, icon: "👷", label: "Chocks", box: false },
  { tasks: ["gpu"], x: 362, y: 74, dx: 120, dy: 0, icon: "🔌", label: "GPU", cable: [338, 80] },
  { tasks: ["unload", "load"], x: 372, y: 140, dx: 160, dy: 0, icon: "🧳", label: "Belt loader", w: 46, rot: -20, belt: true },
  { tasks: ["unload", "load"], x: 372, y: 262, dx: 160, dy: 0, icon: "🧳", label: "Belt loader", w: 46, rot: 20, belt: true },
  { tasks: ["unload", "load"], x: 436, y: 126, dx: 140, dy: 0, icon: "🛒", label: "Bag carts", w: 54 },
  { tasks: ["fuel"], x: 450, y: 192, dx: 160, dy: 0, icon: "⛽", label: "Fuel truck", w: 56, cable: [416, 214] },
  { tasks: ["cater"], x: 374, y: 304, dx: 150, dy: 40, icon: "🍱", label: "Catering", w: 44 },
  { tasks: ["water"], x: 268, y: 338, dx: -150, dy: 40, icon: "💧", label: "Water/toilet", w: 46 },
  { tasks: ["clean"], x: 320, y: 168, icon: "🧹", label: "", box: false, inside: true },
  { tasks: ["clean"], x: 320, y: 232, icon: "🧹", label: "", box: false, inside: true },
  { tasks: ["docs"], x: 268, y: 64, dx: -80, dy: 0, icon: "📋", label: "Ramp agent", box: false },
  { tasks: ["push", "doors"], x: 320, y: 46, dx: -150, dy: -10, icon: "🚜", label: "Tug", w: 36 },
];
const GO = { t: 0, playing: false, speed: 1, sel: null, raf: 0, last: 0, lastKey: "" };
const goActive = (t) => GO_TASKS.filter((k) => t >= k.s && t < k.e);
function goBuild() {
  const veh = GO_VEH.map((v, i) => `<g class="go-v" id="goV${i}" data-task="${v.tasks[0]}">${v.cable ? `<line class="go-cable" x1="0" y1="0" x2="${v.cable[0] - v.x}" y2="${v.cable[1] - v.y}"/>` : ""}
      ${v.box === false ? "" : `<rect x="${-(v.w || 30) / 2}" y="-11" width="${v.w || 30}" height="22" rx="4" class="go-body" transform="rotate(${v.rot || 0})"/>`}
      <text class="go-ico">${v.icon}</text>${v.label ? `<text y="${v.box === false ? 18 : 24}" class="go-vlbl">${v.label}</text>` : ""}</g>`).join("");
  $("#goApron").innerHTML = `<rect width="640" height="420" class="go-ground"/>
    <rect width="640" height="40" class="go-terminal"/>${Array.from({ length: 16 }, (_, i) => `<rect x="${12 + i * 40}" y="10" width="26" height="14" rx="2" class="go-window"/>`).join("")}<text x="560" y="34" class="go-vlbl term">TERMINAL · GATE 7</text>
    <line x1="320" y1="40" x2="320" y2="420" class="go-leadin"/><line x1="200" y1="392" x2="440" y2="392" class="go-stopbar"/>
    <g id="goBridge"><rect class="go-bridge" x="0" y="-9" height="18" rx="3"/><rect class="go-cab" y="-12" width="14" height="24" rx="2"/></g>
    <g id="goPlane">
      <path class="go-wing" d="M302 170 L168 232 L168 246 L302 214 Z M338 170 L472 232 L472 246 L338 214 Z"/>
      <rect class="go-eng" x="216" y="200" width="16" height="30" rx="6"/><rect class="go-eng" x="408" y="200" width="16" height="30" rx="6"/>
      <path class="go-wing" d="M302 318 L262 348 L262 356 L302 344 Z M338 318 L378 348 L378 356 L338 344 Z"/>
      <path class="go-fuse" d="M320 64 C333 64 338 82 338 102 L338 322 C338 340 330 352 320 362 C310 352 302 340 302 322 L302 102 C302 82 307 64 320 64 Z"/>
      <path class="go-cockpit" d="M312 80 Q320 72 328 80 L326 86 L314 86 Z"/>
      ${[100, 300].flatMap((y) => [[300, y], [340, y]]).map(([x, y]) => `<rect class="go-door" x="${x - 2}" y="${y - 6}" width="4" height="12"/>`).join("")}
      <g id="goPax"></g>
    </g>
    <g id="goVehs">${veh}</g>
    <g id="goCones">${[[160, 250], [480, 250], [320, 372], [224, 238], [416, 238]].map(([x, y]) => `<path d="M${x} ${y - 7} L${x + 5} ${y + 4} L${x - 5} ${y + 4} Z" class="go-cone"/>`).join("")}</g>`;
  $("#goGantt").innerHTML = `<div class="go-axis">${[0, 10, 20, 30, 40, 45].map((m) => `<span style="left:${m / 45 * 100}%">${m}′</span>`).join("")}</div>` +
    GO_TASKS.map((k) => `<button type="button" class="go-row" data-id="${k.id}"><span class="go-name">${k.icon} ${k.name}</span><span class="go-track"><i style="left:${k.s / 45 * 100}%;width:${(k.e - k.s) / 45 * 100}%"></i></span></button>`).join("") +
    `<div class="go-cursor" id="goCursor"></div>`;
}
const goEase = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) ** 3);
function goRender() {
  const t = GO.t;
  // vehicle presence: union of their tasks, sliding in/out over ~1.2 min
  GO_VEH.forEach((v, i) => {
    const ks = GO_TASKS.filter((k) => v.tasks.includes(k.id)), s = Math.min(...ks.map((k) => k.s)), e = Math.max(...ks.map((k) => k.e));
    const p = Math.min(goEase((t - s) / 1.2), goEase((e - t) / 1.2)), el = $("#goV" + i);
    el.style.opacity = p > 0.02 ? 1 : 0;
    el.setAttribute("transform", `translate(${v.x + (1 - p) * (v.dx || 0)} ${v.y + (1 - p) * (v.dy || 0)})`);
    el.classList.toggle("sel", !!GO.sel && v.tasks.includes(GO.sel));
  });
  // engineer walks around the aircraft during the check
  const m = GO_TASKS.find((k) => k.id === "maint"), mp = (t - m.s) / (m.e - m.s);
  const loop = [[290, 120], [230, 236], [180, 252], [290, 330], [350, 330], [460, 252], [410, 236], [350, 120], [290, 120]];
  let eng = $("#goEngineer");
  if (!eng) { eng = document.createElementNS(SVGNS, "text"); eng.id = "goEngineer"; eng.setAttribute("class", "go-ico walker"); eng.textContent = "🧑‍🔧"; eng.dataset.task = "maint"; $("#goVehs").appendChild(eng); }
  eng.style.opacity = mp > 0 && mp < 1 ? 1 : 0;
  if (mp > 0 && mp < 1) { const f = mp * (loop.length - 1), i = Math.floor(f), q = f - i, a = loop[i], b = loop[i + 1]; eng.setAttribute("x", a[0] + (b[0] - a[0]) * q); eng.setAttribute("y", a[1] + (b[1] - a[1]) * q); }
  // jet bridge extends to the front-left door while attached
  const bk = GO_TASKS.find((k) => k.id === "bridge"), bp = Math.min(goEase((t - bk.s) / 1), goEase((bk.e - t) / 1));
  const len = 40 + bp * 115;
  $("#goBridge").setAttribute("transform", `translate(156 40) rotate(23.6)`); $(".go-bridge").setAttribute("width", len); $(".go-cab").setAttribute("x", len - 6);
  // passengers walking along the bridge
  const dpx = GO_TASKS.find((k) => k.id === "deboard"), bpx = GO_TASKS.find((k) => k.id === "board");
  const walking = t >= dpx.s && t < dpx.e ? -1 : t >= bpx.s && t < bpx.e ? 1 : 0;
  $("#goPax").innerHTML = walking ? Array.from({ length: 5 }, (_, i) => { let f = ((t * 3 + i / 5) % 1); if (walking < 0) f = 1 - f; const x = 168 + f * 126, y = 45 + f * 55; return `<circle cx="${x}" cy="${y}" r="2.6" class="go-pax"/>`; }).join("") : "";
  // pushback: aircraft and tug back away from the gate and turn
  const pk = GO_TASKS.find((k) => k.id === "push"), pp = goEase((t - pk.s) / (pk.e - pk.s) * 1.05);
  const tf = pp > 0 ? `translate(${pp * 30} ${pp * 70}) rotate(${pp * 25} 320 200)` : "";
  $("#goPlane").setAttribute("transform", tf);
  const tug = $("#goV" + GO_VEH.findIndex((v) => v.tasks[0] === "push"));
  if (pp > 0) tug.setAttribute("transform", `${tf} translate(320 46)`);
  $("#goCones").style.opacity = t > 0.3 && t < 41 ? 1 : 0;
  // gantt + clock
  $("#goCursor").style.left = `calc(var(--go-label) + (100% - var(--go-label)) * ${t / 45})`;
  const act = goActive(t), key = act.map((k) => k.id).join();
  $$("#goGantt .go-row").forEach((r) => { r.classList.toggle("on", act.some((k) => k.id === r.dataset.id)); r.classList.toggle("sel", r.dataset.id === GO.sel); });
  $("#goClock").textContent = `${String(Math.floor(t)).padStart(2, "0")}:${String(Math.floor((t % 1) * 60)).padStart(2, "0")}`;
  $("#goTime").value = t;
  if (key !== GO.lastKey || GO.forceInfo) { GO.lastKey = key; GO.forceInfo = false; goInfo(act); }
}
function goInfo(act) {
  const k = GO_TASKS.find((x) => x.id === GO.sel);
  const now = act.length ? act.map((x) => `<span class="chip">${x.icon} ${x.name}</span>`).join("") : `<span class="sub">${GO.t >= 45 ? "✈ Gone! On to the next flight." : "Waiting for the aircraft to park…"}</span>`;
  $("#goInfo").innerHTML = (k ? `<div class="label">${k.icon} ${esc(k.name)}</div><p class="go-when">⏱ minute ${k.s}–${k.e} · 👤 ${esc(k.who)}</p><p>${k.d}</p>` : `<div class="label">Turnaround</div><p>Click a vehicle or a task in the timeline below to learn what it does. Lots of jobs happen <b>at the same time</b>: that's how airlines keep turnarounds short.</p>`) +
    `<div class="label">Happening now</div><div class="chips">${now}</div>`;
}
function goLoop(ts) {
  if (!GO.playing) return;
  if (!$("#tool-ground").offsetParent) { goPause(); return; } // (SVG elements have no offsetParent, so check the panel)
  const dt = GO.last ? Math.min((ts - GO.last) / 1000, 0.1) : 0; GO.last = ts;
  GO.t = Math.min(45, GO.t + dt * GO.speed);
  goRender();
  if (GO.t >= 45) { goPause(); labAward("turnaround", "Watched a full turnaround"); return; }
  GO.raf = requestAnimationFrame(goLoop);
}
function goPause() { GO.playing = false; cancelAnimationFrame(GO.raf); $("#goPlay").textContent = GO.t >= 45 ? "↺ Replay" : "▶ Play"; }
const GO_ORDER = ["Chocks on, engines off", "Passengers get off", "Bags unloaded", "Cabin cleaned & catering loaded", "New bags loaded", "Passengers board", "Doors closed", "Pushback"];
const GO_Q = { next: 0, opts: [], tries: 0 };
function goOrderRender(msg = "") {
  const done = GO_ORDER.slice(0, GO_Q.next);
  $("#goOrder").innerHTML = `<p class="sub">Click the steps in the order they happen. (Fuelling isn't here because it can happen alongside other jobs.)</p>
    <ol class="go-done">${done.map((d) => `<li>${esc(d)}</li>`).join("")}</ol>
    ${GO_Q.next < GO_ORDER.length ? `<div class="chips">${GO_Q.opts.filter((o) => !done.includes(o)).map((o) => `<button type="button" class="chip" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>` : `<p class="tip">🎉 Perfect turnaround order${GO_Q.tries ? ` (${GO_Q.tries} wrong guess${GO_Q.tries > 1 ? "es" : ""})` : " on the first try"}! <button type="button" class="btn ghost" id="goOrderAgain">Try again</button></p>`}
    ${msg ? `<p class="go-msg">${msg}</p>` : ""}`;
}
function initGround() {
  goBuild(); goRender();
  $("#goPlay").onclick = () => {
    if (GO.playing) { goPause(); return; }
    if (GO.t >= 45) GO.t = 0;
    GO.playing = true; GO.last = 0; $("#goPlay").textContent = "⏸ Pause"; GO.raf = requestAnimationFrame(goLoop);
  };
  $("#goSpeed").addEventListener("click", (e) => { const b = e.target.closest("button[data-s]"); if (!b) return; GO.speed = +b.dataset.s; $$("#goSpeed button").forEach((x) => x.classList.toggle("active", x === b)); });
  $("#goTime").addEventListener("input", (e) => { GO.t = +e.target.value; goRender(); });
  const pick = (id) => { GO.sel = GO.sel === id ? null : id; GO.forceInfo = true; goRender(); };
  $("#goGantt").addEventListener("click", (e) => { const r = e.target.closest(".go-row"); if (r) pick(r.dataset.id); });
  $("#goApron").addEventListener("click", (e) => { const v = e.target.closest("[data-task]"); if (v) pick(v.dataset.task); });
  GO_Q.opts = shuffle(GO_ORDER); goOrderRender();
  $("#goOrder").addEventListener("click", (e) => {
    if (e.target.id === "goOrderAgain") { GO_Q.next = 0; GO_Q.tries = 0; GO_Q.opts = shuffle(GO_ORDER); goOrderRender(); return; }
    const b = e.target.closest("button[data-o]"); if (!b) return;
    if (b.dataset.o === GO_ORDER[GO_Q.next]) { GO_Q.next++; goOrderRender(GO_Q.next === GO_ORDER.length ? "" : "✅ Correct!"); if (GO_Q.next === GO_ORDER.length) labAward("turnorder", "Turnaround in order"); }
    else { GO_Q.tries++; goOrderRender(`❌ Not yet. What has to happen before “${esc(b.dataset.o)}”?`); }
  });
}

// ---------- Airport Roles ----------
const RL_ROLES = {
  pilot: { name: "Pilots", sub: "Captain & first officer", icon: "🧑‍✈️", short: "Fly the aircraft and are responsible for its safety.", where: "Flight deck", tools: "Flight plan, weather reports, checklists, radios, autopilot", talks: "Dispatchers, air traffic control, engineers, cabin crew", become: "Flight school to a commercial pilot licence, then airline training and a 'type rating' for each aircraft. Airline captains in many countries need around 1,500 flying hours or more.", fact: "The captain has final authority. The two pilots usually take turns being 'pilot flying' and 'pilot monitoring'.", clue: "I share the flight deck with a colleague, and we take turns being 'pilot flying' and 'pilot monitoring'." },
  cabin: { name: "Cabin crew", sub: "Flight attendants", icon: "💁", short: "Keep passengers safe and looked after.", where: "Cabin", tools: "Safety equipment, interphone, first-aid kit, fire extinguishers", talks: "Pilots, gate agents, catering", become: "Several weeks of airline training in evacuation, firefighting, first aid, and service, refreshed every year.", fact: "Their main job is safety, not serving drinks: they're trained to evacuate a full aircraft in 90 seconds.", clue: "My most important job is getting everyone out in 90 seconds if something goes wrong." },
  dispatch: { name: "Flight dispatcher", sub: "Airline operations", icon: "🖥️", short: "Plans each flight and watches it from the ground.", where: "Airline operations centre", tools: "Flight-planning software, weather data, performance charts", talks: "Pilots, meteorologists, crew scheduling, maintenance control", become: "A dispatcher licence (in the US an FAA certificate) or airline flight-operations training.", fact: "In some countries the captain and dispatcher share responsibility: both must agree the flight is safe before it goes.", clue: "I build the flight plan (route, fuel, and alternates) and follow the flight from an operations centre." },
  ground: { name: "Ground controller", sub: "Air traffic control", icon: "🎧", short: "Directs aircraft and vehicles on the taxiways.", where: "Control tower", tools: "Radio, surface movement radar, the view from the tower", talks: "Pilots, tower controller, vehicle drivers", become: "Air traffic control academy, then months of on-the-job training at a specific airport.", fact: "Gives instructions like 'taxi to holding point runway 27 via Bravo' and keeps everything apart on the ground.", clue: "I tell aircraft which taxiways to use to get to the runway." },
  tower: { name: "Tower controller", sub: "Air traffic control", icon: "🗼", short: "Clears aircraft to take off and land.", where: "Top of the control tower", tools: "Radio, binoculars, signal light gun, runway lighting controls", talks: "Pilots, ground and approach controllers", become: "Air traffic control academy plus airport-specific training and a licence.", fact: "Owns the runway: nothing goes on it without the tower's permission.", clue: "Nothing goes on the runway without my permission." },
  radar: { name: "Approach & area controllers", sub: "Air traffic control", icon: "📡", short: "Guide aircraft through the sky on radar.", where: "Radar centre (often far from the airport)", tools: "Radar screens, radio, electronic flight strips", talks: "Pilots, tower, neighbouring control centres", become: "Air traffic control academy, then a radar rating for their sector.", fact: "Approach controllers line aircraft up for landing; area controllers look after cruising aircraft across huge regions.", clue: "I watch a radar screen and keep cruising aircraft safely apart." },
  engineer: { name: "Maintenance engineer", sub: "Licensed engineer", icon: "🧑‍🔧", short: "Inspect, repair, and certify aircraft as safe to fly.", where: "Ramp and hangar", tools: "Technical log, maintenance manuals, tools, diagnostic computers", talks: "Pilots, maintenance control, dispatchers", become: "An aircraft maintenance licence (several years of study and experience) plus ratings for each aircraft type.", fact: "The aircraft can't leave until a licensed engineer signs that it's airworthy.", clue: "The aircraft can't leave until I sign to say it's safe to fly." },
  ramp: { name: "Ramp agents & ground crew", sub: "Ground handling", icon: "🦺", short: "Load bags, guide aircraft in, and push them back.", where: "Apron (ramp)", tools: "Belt loaders, tugs, marshalling wands, headsets", talks: "Pilots (by headset), load control, other ground teams", become: "Airport training in apron driving, loading, safety, and marshalling.", fact: "At pushback, the headset operator talks directly to the pilots while the tug pushes the aircraft back.", clue: "I wear a headset at pushback and talk to the pilots while the tug pushes them back." },
  ops: { name: "Airport operations", sub: "Airside operations officer", icon: "🚙", short: "Keep the airport itself safe and running.", where: "Airside, in a yellow ops vehicle", tools: "Inspection vehicle, radio, runway friction tester, bird-scaring kit", talks: "Tower, fire and rescue, airport maintenance, airlines", become: "Aviation operations or airport management training, plus airside driving permits.", fact: "They inspect the runways several times a day for debris (FOD), damage, wildlife, and snow.", clue: "I drive along the runways several times a day looking for debris and wildlife." },
};
const RL_PHASES = [
  { id: "plan", name: "📝 Planning", d: "Hours before departure: the flight is planned and the aircraft prepared.", who: {
    pilot: "Read the flight plan, weather, and NOTAMs, and agree the fuel with dispatch.", dispatch: "Builds the flight plan: route, fuel, weights, and alternate airports.", engineer: "Checks the technical log and fixes open defects from earlier flights.", ops: "Inspects runways and taxiways and publishes any closures as NOTAMs.", cabin: "Briefing with the captain: flight time, weather, special passengers." } },
  { id: "gate", name: "🧳 At the gate", d: "The 45-minute turnaround: unloading, fuelling, cleaning, boarding.", who: {
    pilot: "Walk-around, cockpit set-up, and loading the route into the flight computer.", cabin: "Safety checks, then welcome passengers on board.", engineer: "Walk-around check, then signs the aircraft off as safe to fly.", ramp: "Unload and load bags, and connect ground power. Fuel and catering trucks arrive.", dispatch: "Sends the final load sheet (weights and balance) to the pilots.", ground: "The route clearance is read out to the pilots (at big airports a 'clearance delivery' controller does this)." } },
  { id: "taxi", name: "🚜 Pushback & taxi", d: "Leaving the gate and driving to the runway.", who: {
    pilot: "Request pushback, start engines, and taxi along the route ground control gives.", cabin: "Safety demonstration, then secure the cabin.", ramp: "Push the aircraft back with the tug; the headset operator talks to the pilots.", ground: "Gives the taxi route to the runway and watches all moving traffic.", ops: "Keeps vehicles well clear of taxiing aircraft." } },
  { id: "takeoff", name: "🛫 Takeoff", d: "Lining up, the takeoff roll, and the first climb.", who: {
    pilot: "Line up when cleared, take off, and fly the departure route.", tower: "Clears the aircraft for takeoff once the runway is clear.", cabin: "Seated and strapped in, ready for an emergency.", radar: "Departure control takes over after takeoff and guides the climb." } },
  { id: "cruise", name: "☁️ Cruise", d: "High above the weather, for most of the flight.", who: {
    pilot: "Watch the systems, fuel, and weather; talk to each new control centre.", radar: "Area controllers keep cruising aircraft separated across the region.", dispatch: "Flight following: watches weather and delays and sends updates.", cabin: "Service, and keeping an eye on passengers." } },
  { id: "landing", name: "🛬 Approach & landing", d: "Descending, lining up with the runway, and landing.", who: {
    pilot: "Brief the approach, set flaps and gear, and land.", radar: "Approach control lines aircraft up in a sequence for the runway.", tower: "Clears the aircraft to land.", ops: "Runway checks and lighting between arrivals.", cabin: "Secure the cabin for landing." } },
  { id: "arrive", name: "🏁 Arrival", d: "Off the runway and back to a gate, and the cycle starts again.", who: {
    pilot: "Taxi to the gate, shut down, and note any defects in the tech log.", ground: "Guides the aircraft from the runway to its gate.", ramp: "Marshal the aircraft in, chocks and cones on, start unloading.", engineer: "Meets the aircraft and checks anything the pilots reported.", cabin: "Help passengers off and check the cabin.", dispatch: "Logs the arrival and plans the aircraft's next flight." } },
];
const RL = { phase: 0, sel: null, quiz: null };
function rlRender() {
  const ph = RL_PHASES[RL.phase];
  $$("#rlPhases button").forEach((b, i) => b.classList.toggle("active", i === RL.phase));
  $("#rlPhaseD").innerHTML = `<b>${ph.name.replace(/^\S+ /, "")}:</b> ${ph.d}`;
  $("#rlGrid").innerHTML = Object.entries(RL_ROLES).map(([k, r]) => { const doing = ph.who[k];
    return `<button type="button" class="rl-card${doing ? " on" : ""}${RL.sel === k ? " sel" : ""}" data-k="${k}"><span class="rl-ico">${r.icon}</span><b>${esc(r.name)}</b><small>${esc(r.sub)}</small><span class="rl-doing">${doing ? esc(doing) : "Not busy with this flight right now"}</span></button>`; }).join("");
  const r = RL_ROLES[RL.sel];
  $("#rlDetail").innerHTML = r ? `<div class="label">${r.icon} ${esc(r.name)}</div><p><b>${esc(r.short)}</b> ${esc(r.fact)}</p>
    <div class="lab-facts rl-facts"><div><h5>Where they work</h5><p>${esc(r.where)}</p></div><div><h5>Tools</h5><p>${esc(r.tools)}</p></div><div><h5>Talks to</h5><p>${esc(r.talks)}</p></div><div><h5>How to become one</h5><p>${esc(r.become)}</p></div></div>
    <h5 class="rl-h">Through the flight</h5><ul class="rl-timeline">${RL_PHASES.map((p) => `<li class="${p.who[RL.sel] ? "" : "idle"}"><b>${p.name}</b> ${p.who[RL.sel] ? esc(p.who[RL.sel]) : "–"}</li>`).join("")}</ul>` : `<p class="sub">👆 Click a role to see their whole job.</p>`;
}
function rlQuizNew() { RL.quiz = { qs: shuffle(Object.keys(RL_ROLES)).slice(0, 6), i: 0, score: 0, tried: false }; rlQuizRender(); }
function rlQuizRender(feedback = "") {
  const q = RL.quiz;
  if (q.i >= q.qs.length) {
    $("#rlQuiz").innerHTML = `<p class="tip">You scored <b>${q.score} / ${q.qs.length}</b>. ${q.score >= 5 ? "🎉 You know your airport!" : "Explore the role cards above and try again."}</p><button class="btn" type="button" id="rlAgain">Play again</button>`;
    if (q.score >= 4) labAward("roles", "Airport roles quiz");
    return;
  }
  const ans = q.qs[q.i], opts = shuffle([ans, ...shuffle(Object.keys(RL_ROLES).filter((k) => k !== ans)).slice(0, 3)]);
  q.opts = q.opts && q.optsFor === q.i ? q.opts : opts; q.optsFor = q.i;
  $("#rlQuiz").innerHTML = `<p class="rl-clue">“${esc(RL_ROLES[ans].clue)}”</p><div class="q-opts lab-opts">${q.opts.map((k) => `<button type="button" class="q-opt" data-k="${k}">${RL_ROLES[k].icon} ${esc(RL_ROLES[k].name)}</button>`).join("")}</div>
    <div class="row"><span class="lab-score">Question ${q.i + 1} of ${q.qs.length} · Score ${q.score}</span>${feedback}</div>`;
}
function initRoles() {
  $("#rlPhases").innerHTML = RL_PHASES.map((p, i) => `<button type="button" data-i="${i}">${p.name}</button>`).join("");
  $("#rlPhases").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (b) { RL.phase = +b.dataset.i; rlRender(); } });
  $("#rlGrid").addEventListener("click", (e) => { const b = e.target.closest(".rl-card"); if (b) { RL.sel = b.dataset.k; rlRender(); } });
  $("#rlQuiz").addEventListener("click", (e) => {
    if (e.target.id === "rlAgain") { rlQuizNew(); return; }
    const b = e.target.closest(".q-opt"); const q = RL.quiz; if (!b || !q || b.disabled) return;
    const ans = q.qs[q.i];
    if (b.dataset.k === ans) {
      if (!q.tried) q.score++;
      b.classList.add("right"); $$("#rlQuiz .q-opt").forEach((x) => (x.disabled = true));
      setTimeout(() => { q.i++; q.tried = false; rlQuizRender(); }, 900);
    } else { q.tried = true; b.classList.add("wrong"); b.disabled = true; }
  });
  rlRender(); rlQuizNew();
}

initBuilder(); initRunway(); initPlanning(); initGround(); initRoles();
