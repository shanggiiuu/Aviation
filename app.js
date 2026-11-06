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
const USER_KEYS = ["xp", "fav", "custom", "viewed", "lessons", "best", "voted", "cname", "quizHistory", "simBest", "simDone", "partsFound", "exBest"];
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
const pages = ["home", "dashboard", "academy", "atc", "dictionary", "aircraft", "quiz", "community", "profile"];
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
route();
