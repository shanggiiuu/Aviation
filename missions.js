"use strict";
// ================= MISSIONS =================
// Story-style learning missions: briefing → tasks → debrief with stars, XP and achievements.
// Loaded after app.js and uses its helpers ($, $$, esc, shuffle, store, addXP, toast, BADGES).
// In task data the FIRST option is always the correct one; options are shuffled when shown.

// ---- Top-down aircraft silhouettes for Mission 003 (nose pointing up) ----
const sw = (y, rc, span, sweep, tc) => `<polygon points="-4,${y} -${span},${y + sweep} -${span},${y + sweep + tc} -4,${y + rc} 4,${y + rc} ${span},${y + sweep + tc} ${span},${y + sweep} 4,${y}"/>`;
const st = (y, span, c) => `<rect x="-${span}" y="${y}" width="${span * 2}" height="${c}" rx="${Math.min(4, c / 2)}"/>`;
const fu = (l, w, y0 = -l / 2) => `<rect x="-${w / 2}" y="${y0}" width="${w}" height="${l}" rx="${w / 2}"/>`;
const pod = (x, y, w = 9, h = 22) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="3"/>`;
const SILS = {
  glider: fu(150, 8) + st(-28, 96, 9) + st(62, 18, 7),
  heli: `<ellipse cx="0" cy="-12" rx="16" ry="28"/>${fu(70, 5, 12)}<rect x="-12" y="78" width="24" height="3"/>
    <g class="ms-rotor"><circle r="82"/><line x1="-80" y1="-18" x2="80" y2="18"/><line x1="-18" y1="80" x2="18" y2="-80"/></g>`,
  single: fu(118, 14, -60) + st(-26, 62, 17) + st(44, 22, 11) + `<rect x="-15" y="-65" width="30" height="3" rx="1.5"/>`,
  turboprop: fu(172, 16) + st(-22, 84, 15) + pod(-30, -38, 9, 26) + pod(30, -38, 9, 26) +
    `<rect x="-44" y="-41" width="28" height="3" rx="1.5"/><rect x="16" y="-41" width="28" height="3" rx="1.5"/>` + st(64, 28, 11),
  twinjet: fu(172, 18) + sw(-18, 34, 86, 42, 10) + pod(-34, -14) + pod(34, -14) + sw(56, 18, 30, 16, 6),
  quadjet: fu(184, 24) + sw(-22, 40, 92, 48, 11) + pod(-34, -14, 10, 22) + pod(34, -14, 10, 22) + pod(-62, 4, 9, 20) + pod(62, 4, 9, 20) + sw(60, 20, 34, 18, 7),
  delta: `<polygon points="0,-96 5,-70 6,-30 70,74 6,80 -6,80 -70,74 -6,-30 -5,-70"/>`,
};
const silSvg = (k) => `<svg class="ms-sil" viewBox="-100 -100 200 200" role="img" aria-label="Aircraft silhouette, top view">${SILS[k]}</svg>`;

const TOWER_LOG = [
  ["P", "AeroLearn Tower, Golf-Alpha Bravo Charlie Delta, holding point runway 27, ready for departure."],
  ["T", "Golf-Charlie Delta, line up and wait runway 27."],
  ["P", "Line up and wait runway 27, Golf-Charlie Delta."],
  ["T", "Golf-Charlie Delta, wind 260 degrees 8 knots, runway 27, cleared for takeoff."],
  ["P", "Runway 27, cleared for takeoff, Golf-Charlie Delta."],
  ["T", "Golf-Charlie Delta, report downwind."],
  ["P", "Wilco, Golf-Charlie Delta."],
];
const towerLog = () => `<div class="ms-log">${TOWER_LOG.map(([w, t]) => `<div class="ms-line ${w === "P" ? "pilot" : "tower"}"><b>${w === "P" ? "🧑‍✈️ Pilot" : "🗼 Tower"}</b><span>${esc(t)}</span></div>`).join("")}<p class="sub small">Fictional exchange at the fictional AeroLearn Field.</p></div>`;
const metar = (m) => `<div class="metar-raw ms-metar">${esc(m)}</div>`;
const M_A = "XALF 071250Z 27012KT 9999 SCT025 BKN040 17/11 Q1015";

const MISSIONS = [
  { id: "001", icon: "🛫", title: "First Flight", goal: "Learn the basic stages of a commercial flight.",
    brief: [
      ["📝 Planning", "Hours before departure, a dispatcher builds the flight plan: route, fuel, weights and an alternate airport. The pilots check weather and NOTAMs."],
      ["🧳 At the gate", "During the turnaround, bags, fuel and catering are loaded and passengers board. A pilot or engineer walks around the aircraft checking it."],
      ["🚜 Pushback & taxi", "A tug pushes the aircraft back. Ground control gives the taxi route to the runway."],
      ["🛫 Takeoff & climb", "The tower clears the aircraft for takeoff, then departure control guides the climb to cruising altitude."],
      ["☁️ Cruise", "Most of the flight is spent cruising high above the weather while area controllers keep aircraft apart."],
      ["🛬 Descent & landing", "Approach control lines aircraft up for the runway, the tower clears them to land, and ground control guides them to the gate."],
    ],
    tasks: [
      { type: "order", q: "Put the stages of the flight in the right order.", items: ["Flight planning", "Boarding", "Pushback", "Taxi", "Takeoff", "Cruise", "Landing"], why: "Plan → board → push back → taxi → take off → cruise → land." },
      { q: "Who usually moves an airliner back from the gate?", opts: ["A tug driven by the ground crew", "The pilots, using reverse thrust", "The tower controller", "The cabin crew"], why: "Airliners can't easily reverse on their own, so a tug pushes them back while a headset operator talks to the pilots." },
      { q: "Who gives permission to take off?", opts: ["The tower controller", "The ground controller", "The dispatcher", "The captain alone"], why: "The tower 'owns' the runway — nothing takes off or lands without its clearance." },
      { q: "In which phase does an airliner usually spend most of its time?", opts: ["Cruise", "Takeoff", "Climb", "Approach"], why: "On most flights, cruise is by far the longest phase." },
      { q: "Why does every flight plan include an alternate airport?", opts: ["So there's somewhere to land if the destination can't be used", "So passengers can choose another city", "Because fuel is cheaper there", "It's where the crew lives"], why: "Bad weather or a closed runway at the destination means the flight needs a planned backup — with enough fuel to reach it." },
      { q: "Who guides the aircraft from the runway to its gate after landing?", opts: ["Ground control", "Area control", "Approach control", "The dispatcher"], why: "Once off the runway, the tower hands the aircraft to ground control for the taxi in." },
    ] },
  { id: "002", icon: "🗼", title: "Tower Communication", goal: "Understand a fictional pilot and ATC exchange.",
    context: towerLog,
    brief: [
      ["📛 Callsigns", "Every aircraft has a callsign. G-ABCD is spoken 'Golf-Alpha Bravo Charlie Delta'. Once contact is made it can be shortened to the first letter and last two: 'Golf-Charlie Delta'."],
      ["🔁 Readbacks", "Pilots repeat back important items — runways, clearances, altitudes, headings, frequencies and pressure settings — so the controller can catch mistakes."],
      ["✅ Roger & Wilco", "'Roger' means 'I received your message'. 'Wilco' means 'I understand and will comply'."],
      ["🛑 Line up and wait", "Enter the runway and line up, but don't take off yet."],
    ],
    tasks: [
      { q: "What does 'line up and wait' mean?", opts: ["Enter the runway and line up, but don't take off yet", "Take off immediately", "Stop at the holding point", "Hold position on the taxiway"], why: "It gets the aircraft ready on the runway while the controller waits for traffic to clear." },
      { q: "Why does the pilot repeat 'Runway 27, cleared for takeoff'?", opts: ["So the tower can check the clearance was understood correctly", "Out of politeness", "Because passengers can hear it", "To test the radio"], why: "A readback lets the controller spot a mistake — like the wrong runway — before it becomes dangerous." },
      { q: "The pilot answers 'Wilco'. What does that mean?", opts: ["I understand and will comply", "Say again", "I don't understand", "Goodbye"], why: "Wilco is short for 'will comply'. 'Roger' only means 'message received'." },
      { q: "Why does the tower say 'Golf-Charlie Delta' instead of the full callsign?", opts: ["Once contact is made, a shortened callsign is allowed", "It's talking to a different aircraft", "The tower made a mistake", "Small aircraft don't have full callsigns"], why: "The abbreviation is the first character plus the last two: G-ABCD → Golf-Charlie Delta." },
      { q: "'Wind 260 degrees 8 knots' — for runway 27, what is that?", opts: ["A gentle wind almost straight down the runway towards the aircraft (a headwind)", "A strong tailwind", "A wind straight across the runway", "No wind at all"], why: "Runway 27 points about 270°. Wind is given as the direction it blows FROM, so 260° is almost head-on — ideal for takeoff." },
      { q: "Tower: 'Golf-Charlie Delta, QNH 1009.' Which reply is correct?", opts: ["QNH 1009, Golf-Charlie Delta", "Roger", "Wilco", "Copy that, see you"], why: "Pressure settings must be read back with the callsign, because a wrong setting gives a wrong altitude." },
    ] },
  { id: "003", icon: "🔍", title: "Aircraft Detective", goal: "Identify an aircraft from its silhouette and features.",
    brief: [
      ["✈️ Wing shape", "Straight wings suit slower aircraft. Swept-back wings suit fast jets. A delta (triangle) wing suits supersonic flight."],
      ["⚙️ Engines", "Count them, and check for propellers or jet pods. One prop at the nose usually means a light aircraft."],
      ["🌀 Rotors", "A big circle of rotor blades and a long tail boom means a helicopter."],
      ["🪶 No engine?", "Very long, thin wings and no engine means a glider, built to soar on rising air."],
    ],
    tasks: [
      { sil: "glider", q: "Very long, thin wings and no engine at all. What is it?", opts: ["A glider", "A helicopter", "A jet airliner", "A turboprop"], ac: "ask21", why: "Long, slender wings give lots of lift with little drag, which is perfect for soaring. This looks like the ASK 21 training glider." },
      { sil: "heli", q: "A rotor disc above the cabin and a long tail boom. What is it?", opts: ["A helicopter", "A glider", "A light aircraft", "A regional airliner"], ac: "h145", why: "The main rotor gives lift and the tail rotor stops the body spinning. This looks like an Airbus H145." },
      { sil: "single", q: "One propeller at the nose, short straight wings, four seats. Which aircraft fits?", opts: ["Cessna 172 Skyhawk", "Airbus A380-800", "Concorde", "ATR 72-600"], ac: "c172", why: "A classic single-engine trainer: the Cessna 172 is the most-produced aircraft ever." },
      { sil: "turboprop", q: "Two propeller engines on straight wings, about 70 seats, short regional hops. Which aircraft?", opts: ["ATR 72-600", "Boeing 747-8", "Cessna 172 Skyhawk", "Airbus H145"], ac: "atr72", why: "Turboprops are efficient on short routes, which is why the ATR 72 is a regional favourite." },
      { sil: "twinjet", q: "Swept wings, two jet engines under the wings, about 180 seats. Which aircraft?", opts: ["Airbus A320neo", "Airbus A380-800", "Schleicher ASK 21", "Wright Flyer"], ac: "a320neo", why: "A narrow-body twin jet, the workhorse of short and medium-haul flying." },
      { sil: "quadjet", q: "Swept wings, FOUR jet engines and a giant double-deck cabin. Which aircraft?", opts: ["Airbus A380-800", "Embraer E175", "ATR 72-600", "Cessna 172 Skyhawk"], ac: "a388", why: "Four engines and two full decks: the A380 is the largest passenger airliner ever built." },
      { sil: "delta", q: "A delta wing, no horizontal tail, and it flew passengers faster than sound. Which aircraft?", opts: ["Concorde", "Boeing 737-800", "Lockheed Martin C-130J Super Hercules", "Schleicher ASK 21"], ac: "concorde", why: "Concorde's delta wing worked well at supersonic speed. It cruised at about twice the speed of sound." },
    ] },
  { id: "004", icon: "🌦️", title: "Weather Watch", goal: "Interpret basic METAR weather reports.",
    brief: [
      ["📍 Station & time", "A METAR starts with the airport's ICAO code, then the day and time in UTC: 071250Z means the 7th day, 12:50 Zulu."],
      ["🌬️ Wind", "27012KT means wind FROM 270° at 12 knots. G = gusts: 24018G32KT means 18 knots gusting to 32."],
      ["👁️ Visibility", "Given in metres. 9999 means 10 km or more."],
      ["☁️ Cloud", "FEW = 1–2 oktas, SCT = 3–4, BKN = 5–7, OVC = 8 (oktas are eighths of the sky). The height is in hundreds of feet: BKN040 = broken at 4,000 ft."],
      ["🌡️ Temp, weather, pressure", "17/11 = temperature/dewpoint in °C (M = minus). RA rain, SN snow, FG fog, TS thunderstorm; − light, + heavy. Q1015 = QNH 1015 hPa. CAVOK = ceiling and visibility OK."],
    ],
    note: "XALF is a fictional station code used for practice.",
    tasks: [
      { html: metar(M_A), q: "What is the wind?", opts: ["From 270° at 12 knots", "Blowing towards 270° at 12 knots", "From 012° at 27 knots", "12 metres per second, direction unknown"], why: "The first three digits are the direction the wind comes FROM, then the speed, then KT for knots." },
      { html: metar(M_A), q: "What does BKN040 mean?", opts: ["Broken cloud (5–7 oktas) at 4,000 ft", "Broken cloud at 40 ft", "Overcast at 4,000 ft", "Visibility 4 km"], why: "BKN = broken, 5–7 eighths of the sky. 040 × 100 = 4,000 ft." },
      { html: metar(M_A), q: "When was this report made?", opts: ["The 7th of the month at 12:50 UTC", "7:12 local time", "12:50 local time", "On 7 December"], why: "DDHHMMZ: day 07, 12:50, Z for Zulu (UTC)." },
      { html: metar("XALF 080620Z 18008KT 0300 FG VV001 06/06 Q1021"), q: "What's the main hazard?", opts: ["Fog, with visibility of only 300 m", "A thunderstorm", "Very strong wind", "Heavy snow"], why: "FG = fog and 0300 = 300 m visibility. Temperature equals dewpoint (06/06), so the air is saturated." },
      { html: metar("XALF 151720Z 24018G32KT 6000 +TSRA BKN015CB 22/19 Q1004"), q: "Which statement is true?", opts: ["Gusts to 32 knots and a heavy thunderstorm with rain", "Calm wind and light drizzle", "Clear skies", "Snow showers"], why: "G32 = gusting 32 kt, +TSRA = heavy thunderstorm with rain, CB = cumulonimbus (thunderstorm) cloud." },
      { html: metar("XALF 021450Z 09005KT CAVOK M03/M08 Q1030"), q: "What do CAVOK and M03 tell you?", opts: ["Ceiling and visibility are OK, and it's −3 °C", "It's cloudy and 3 °C", "There's a cave near the airport", "Visibility is 3 metres"], why: "CAVOK means no significant cloud or weather and visibility of 10 km or more. M means minus." },
      { q: "The cloud ceiling is 800 ft. Which flight category is that?", opts: ["IFR", "VFR", "MVFR", "LIFR"], why: "From the dashboard table: ceilings of 500–999 ft are IFR, so flying needs instruments and the right qualifications." },
    ] },
  { id: "005", icon: "🧭", title: "Navigation Challenge", goal: "Understand headings, waypoints, and navigation.",
    brief: [
      ["🧭 Headings", "Headings run from 000 to 359 degrees: 360/000 is north, 090 east, 180 south and 270 west. To find the opposite direction, add or subtract 180."],
      ["🛬 Runways", "Runway numbers are the magnetic heading divided by 10. Runway 27 points about 270° (west)."],
      ["📍 Waypoints", "Named points on the map, often with five-letter names, joined together to make a route. Radio beacons such as VORs are used too."],
      ["🌬️ Wind correction", "Wind pushes the aircraft sideways, so pilots point slightly into the wind to stay on their track over the ground."],
    ],
    tasks: [
      { q: "You're flying heading 090. Which way are you going?", opts: ["East", "North", "South", "West"], why: "090° is a quarter turn clockwise from north, which is east." },
      { q: "You're on heading 350 and turn right 30°. What's your new heading?", opts: ["020", "320", "380", "340"], why: "350 + 30 = 380, and 380 − 360 = 020. There's no heading above 359." },
      { q: "What's the opposite (reciprocal) of heading 060?", opts: ["240", "120", "300", "600"], why: "Add 180: 060 + 180 = 240." },
      { q: "An aircraft is lined up on runway 09. Roughly which heading does it face?", opts: ["090° (east)", "009°", "270° (west)", "900°"], why: "Add a zero to the runway number: 09 → 090°. The other end of the same strip is runway 27." },
      { q: "What are waypoints?", opts: ["Named points on the map, joined up to build a route", "Airports where you must land", "Clouds used for navigation", "Signs painted on taxiways"], why: "Waypoints are fixed positions (latitude and longitude) that flight plans connect to make airways and routes." },
      { q: "The wind blows from your left. To stay on your planned track, you…", opts: ["Turn slightly left, into the wind", "Turn slightly right, away from the wind", "Speed up", "Descend"], why: "Pointing into the wind ('crabbing') cancels the sideways drift." },
      { q: "Which cockpit instrument shows your heading?", opts: ["Heading indicator", "Altimeter", "Airspeed indicator", "Vertical speed indicator"], why: "The heading indicator (with the magnetic compass as a backup) shows which way the nose points." },
    ] },
  { id: "006", icon: "🚨", title: "Emergency Awareness", goal: "Learn how aviation professionals prepare for unexpected situations.",
    brief: [
      ["✈️ Aviate, navigate, communicate", "In any emergency the first job is to keep flying the aircraft, then decide where to go, then talk to people about it."],
      ["📋 Checklists & training", "Crews use checklists for unusual situations and practise them in simulators again and again, so the right actions become second nature."],
      ["🤝 Teamwork", "Crew resource management (CRM) trains pilots, cabin crew and controllers to share information and speak up."],
      ["📻 Distress & urgency", "MAYDAY = grave and imminent danger. PAN-PAN = urgent, but no immediate danger. Transponder 7700 = emergency, 7600 = radio failure. 121.5 MHz is the international emergency frequency."],
    ],
    tasks: [
      { q: "Which call means grave and imminent danger needing immediate help?", opts: ["MAYDAY", "PAN-PAN", "ROGER", "WILCO"], why: "MAYDAY (said three times) is the distress call and gets the highest priority on the frequency." },
      { q: "What does a PAN-PAN call mean?", opts: ["An urgent situation, but no immediate danger", "Grave and imminent danger", "Everything is normal", "End of transmission"], why: "PAN-PAN is the urgency call, used for example for a sick passenger or a technical problem that is under control." },
      { q: "Which transponder code signals a general emergency?", opts: ["7700", "7600", "1200", "2000"], why: "7700 shows up straight away on controllers' radar screens. 7600 means radio failure." },
      { q: "A pilot sets the transponder to 7600. What does that tell ATC?", opts: ["The aircraft has a radio failure", "The aircraft is landing", "Everything is normal", "The pilot wants a new route"], why: "7600 tells ATC the crew may not hear them, so controllers clear the way and expect standard procedures." },
      { q: "What does 'Aviate, navigate, communicate' remind pilots to do?", opts: ["Fly the aircraft first, then decide where to go, then talk", "Call the airline first", "Look at the map before anything else", "Talk to passengers first"], why: "Many accidents happened when crews got distracted. Keeping control of the aircraft always comes first." },
      { q: "How do professionals prepare for rare emergencies?", opts: ["Regular simulator training and practised checklists", "They only read about them", "They don't — emergencies are too rare", "Passengers are trained to help"], why: "Pilots train in simulators regularly, and cabin crew and controllers also practise emergency drills." },
      { q: "What is the international civil emergency (guard) frequency?", opts: ["121.5 MHz", "118.7 MHz", "127.25 MHz", "446 MHz"], why: "121.5 MHz is monitored by many aircraft and ground stations. 446 MHz is PMR walkie-talkies, not aviation." },
      { q: "Cabin crew train so a full aircraft can be evacuated in about…", opts: ["90 seconds", "10 minutes", "30 minutes", "5 seconds"], why: "Aircraft are certified to be evacuated within 90 seconds with half the exits blocked." },
    ] },
];

const MS_XP_PER_STAR = 15;
const missionData = () => store.get("missions", {});
function missionStats() {
  const d = missionData(), done = MISSIONS.filter((m) => d[m.id]?.stars > 0);
  return { done: done.length, total: MISSIONS.length, stars: MISSIONS.reduce((n, m) => n + (d[m.id]?.stars || 0), 0), maxStars: MISSIONS.length * 3,
    perfect: MISSIONS.filter((m) => d[m.id]?.stars === 3).length };
}
// Achievements appear with the other badges on the profile page.
const MISSION_BADGES = [
  ...MISSIONS.map((m) => [m.icon, m.title, `Complete Mission ${m.id}`, () => (missionData()[m.id]?.stars || 0) > 0]),
  ["🌟", "Flawless", "Earn 3 stars on any mission", () => missionStats().perfect >= 1],
  ["🎖️", "Mission Commander", "Complete every mission", () => missionStats().done === MISSIONS.length],
  ["👑", "Ace of the skies", "Earn 3 stars on every mission", () => missionStats().perfect === MISSIONS.length],
];
BADGES.push(...MISSION_BADGES.map(([i, n, d, f]) => [i, n, d, f]));

const MS = { run: null };
const starStr = (n) => "★".repeat(n) + "☆".repeat(3 - n);

function msBoard() {
  const d = missionData(), s = missionStats();
  const next = MISSIONS.find((m) => !d[m.id]?.stars);
  $("#msProgress").innerHTML = `
    <div class="progress-wrap"><span class="pw-label">Missions ${s.done}/${s.total}</span><div class="progress"><div class="bar" style="width:${(s.done / s.total) * 100}%"></div></div><span>⭐ ${s.stars}/${s.maxStars}</span></div>
    <div class="ms-achv">${MISSION_BADGES.map(([i, n, desc, f]) => `<span class="ms-ach${f() ? " on" : ""}" title="${esc(desc)}">${i} ${esc(n)}</span>`).join("")}</div>`;
  $("#msBoard").innerHTML = MISSIONS.map((m) => { const r = d[m.id]; return `
    <button type="button" class="ms-card${r?.stars ? " done" : ""}${next === m ? " next" : ""}" data-m="${m.id}">
      <span class="ms-code">MISSION ${m.id}</span>
      <span class="ms-ico">${m.icon}</span>
      <b>${esc(m.title)}</b>
      <span class="ms-goal">${esc(m.goal)}</span>
      <span class="ms-foot"><span class="ms-stars">${starStr(r?.stars || 0)}</span><span>${r?.stars ? `Best ${r.best}/${r.total}` : next === m ? "▶ Next up" : `${m.tasks.length} tasks · up to ${3 * MS_XP_PER_STAR} XP`}</span></span>
    </button>`; }).join("");
}

function msStart(id) {
  const m = MISSIONS.find((x) => x.id === id); if (!m) return;
  MS.run = { m, phase: "brief", i: 0, score: 0, tried: false, answered: false, order: null, opts: null };
  $("#msBoardWrap").classList.add("hidden"); $("#msRun").classList.remove("hidden");
  msRender(); $("#msRun").scrollIntoView({ behavior: "smooth", block: "start" });
}
function msExit() { MS.run = null; $("#msRun").classList.add("hidden"); $("#msBoardWrap").classList.remove("hidden"); msBoard(); }

function msPrepTask() {
  const r = MS.run, t = r.m.tasks[r.i];
  r.tried = false; r.answered = false;
  if (t.type === "order") r.order = { next: 0, opts: shuffle(t.items), mistakes: 0 };
  else r.opts = shuffle(t.opts);
}
function msRender(feedback = "") {
  const r = MS.run, m = r.m, el = $("#msRun");
  const head = `<div class="ms-run-head"><span class="ms-code">MISSION ${m.id}</span><b>${m.icon} ${esc(m.title)}</b><button type="button" class="btn ghost small" data-act="exit">✕ Leave mission</button></div>`;
  if (r.phase === "brief") {
    el.innerHTML = `${head}
      <div class="label">Mission briefing</div>
      <p class="ms-objective">🎯 <b>Objective:</b> ${esc(m.goal)}</p>
      ${m.context ? m.context() : ""}
      <div class="lab-facts">${m.brief.map(([h, p]) => `<div><h5>${esc(h)}</h5><p>${esc(p)}</p></div>`).join("")}</div>
      ${m.note ? `<p class="sub small">${esc(m.note)}</p>` : ""}
      <p class="sub small">${m.tasks.length} tasks. Get answers right first time to earn stars: 50% = ★, 75% = ★★, 100% = ★★★ (${MS_XP_PER_STAR} XP per new star).</p>
      <button type="button" class="btn" data-act="go">🚀 Start mission</button>`;
    return;
  }
  if (r.phase === "task") {
    const t = m.tasks[r.i];
    const bar = `<div class="quiz-head"><span>Task ${r.i + 1} of ${m.tasks.length}</span><span>Score: <b>${r.score}</b></span></div><div class="progress cq-prog"><div class="bar" style="width:${(r.i / m.tasks.length) * 100}%"></div></div>`;
    let body;
    if (t.type === "order") {
      const o = r.order, done = t.items.slice(0, o.next);
      body = `<ol class="ms-order-done">${done.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
        ${o.next < t.items.length ? `<div class="q-opts lab-opts">${o.opts.filter((x) => !done.includes(x)).map((x) => `<button type="button" class="q-opt" data-o="${esc(x)}">${esc(x)}</button>`).join("")}</div>` : ""}`;
    } else {
      body = `${t.sil ? `<div class="ms-sil-wrap">${silSvg(t.sil)}</div>` : ""}${t.html || ""}
        <div class="q-opts lab-opts">${r.opts.map((x) => `<button type="button" class="q-opt${r.answered && x === t.opts[0] ? " right" : ""}" data-a="${esc(x)}" ${r.answered ? "disabled" : ""}>${esc(x)}</button>`).join("")}</div>`;
    }
    el.innerHTML = `${head}${bar}${m.context ? `<details class="ms-ctx"><summary>📻 Show the radio exchange</summary>${m.context()}</details>` : ""}
      <h3 class="cq-q">${esc(t.q)}</h3>${body}<div class="ms-feedback">${feedback}</div>`;
    return;
  }
  // debrief
  const total = m.tasks.length, pct = r.score / total;
  const stars = pct >= 1 ? 3 : pct >= 0.75 ? 2 : pct >= 0.5 ? 1 : 0;
  const d = missionData(), prev = d[m.id] || { stars: 0, best: 0 };
  const before = MISSION_BADGES.filter((b) => b[3]()).map((b) => b[1]);
  const newStars = Math.max(0, stars - prev.stars);
  if (stars > prev.stars || r.score > prev.best) {
    d[m.id] = { stars: Math.max(stars, prev.stars), best: Math.max(r.score, prev.best), total, ts: Date.now() };
    store.set("missions", d);
  }
  if (newStars) addXP(newStars * MS_XP_PER_STAR, `Mission ${m.id}: ${newStars} new star${newStars > 1 ? "s" : ""}`);
  const unlocked = MISSION_BADGES.filter((b) => b[3]() && !before.includes(b[1]));
  unlocked.forEach((b, i) => setTimeout(() => toast(`🏅 Achievement unlocked: ${b[1]}`), 1900 * (i + (newStars ? 1 : 0))));
  const nextM = MISSIONS.find((x) => !missionData()[x.id]?.stars && x.id !== m.id) || null;
  el.innerHTML = `${head}
    <div class="ms-debrief">
      <div class="label">Mission debrief</div>
      <div class="ms-big-stars">${starStr(stars)}</div>
      <h3>${stars ? "Mission complete!" : "Mission not complete yet"}</h3>
      <p>You got <b>${r.score} / ${total}</b> right first time.
        ${newStars ? `<b>+${newStars * MS_XP_PER_STAR} XP</b> for ${newStars} new star${newStars > 1 ? "s" : ""}.` : stars ? "No new stars this time. Your best is kept." : "You need at least 50% for your first star. Re-read the briefing and try again!"}</p>
      ${unlocked.length ? `<div class="ms-achv">${unlocked.map((b) => `<span class="ms-ach on">${b[0]} ${esc(b[1])} — unlocked!</span>`).join("")}</div>` : ""}
      <div class="row center">
        <button type="button" class="btn ghost" data-act="retry">↺ Retry mission</button>
        ${nextM ? `<button type="button" class="btn" data-m="${nextM.id}">Next: Mission ${nextM.id} ${nextM.icon} →</button>` : ""}
        <button type="button" class="btn ghost" data-act="exit">🗂 Mission board</button>
      </div>
    </div>`;
}

function msAdvance() {
  const r = MS.run; r.i++;
  if (r.i >= r.m.tasks.length) r.phase = "debrief"; else msPrepTask();
  msRender();
}
function msClick(e) {
  const r = MS.run; if (!r) return;
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "exit") { msExit(); return; }
  if (act === "go") { r.phase = "task"; r.i = 0; r.score = 0; msPrepTask(); msRender(); return; }
  if (act === "retry") { msStart(r.m.id); return; }
  if (act === "next") { msAdvance(); return; }
  const mb = e.target.closest("[data-m]"); if (mb) { msStart(mb.dataset.m); return; }
  if (r.phase !== "task") return;
  const t = r.m.tasks[r.i];
  const nextBtn = `<button type="button" class="btn" data-act="next">${r.i + 1 < r.m.tasks.length ? "Next task →" : "Finish mission →"}</button>`;
  if (t.type === "order") {
    const b = e.target.closest("[data-o]"); if (!b) return;
    const o = r.order;
    if (b.dataset.o === t.items[o.next]) {
      o.next++;
      if (o.next === t.items.length) { if (!o.mistakes) r.score++; msRender(`<p class="tip">${o.mistakes ? "✅ Done, but with mistakes." : "✅ Perfect order!"} ${esc(t.why)}</p>${nextBtn}`); }
      else msRender();
    } else { o.mistakes++; b.classList.add("wrong"); $(".ms-feedback").innerHTML = `<p class="sub">❌ Not yet. What has to happen before “${esc(b.dataset.o)}”?</p>`; }
    return;
  }
  const b = e.target.closest("[data-a]"); if (!b || b.disabled || r.answered) return;
  if (b.dataset.a === t.opts[0]) {
    if (!r.tried) r.score++;
    r.answered = true;
    $$("#msRun .q-opt").forEach((x) => (x.disabled = true)); b.classList.add("right");
    $(".ms-feedback").innerHTML = `<p class="tip">${r.tried ? "✅ Got there!" : "✅ Correct!"} ${esc(t.why)}${t.ac ? ` <a class="term-link" data-ac="${esc(t.ac)}">See in Aircraft Library</a>` : ""}</p>${nextBtn}`;
    $(".ms-feedback .btn").focus();
  } else { r.tried = true; b.classList.add("wrong"); b.disabled = true; }
}

function initMissions() {
  $("#msBoard").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (b) msStart(b.dataset.m); });
  $("#msRun").addEventListener("click", msClick);
  msBoard();
}
initMissions();
