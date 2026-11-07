"use strict";
// ================= CAREERS =================
// Career explorer + Career Match Quiz. Loaded after app.js and uses its helpers ($, $$, esc, store, labAward).

const CAREERS = {
  pilot: {
    name: "Commercial pilot", icon: "🧑‍✈️", explore: "Flight training and responsibilities",
    short: "Flies passengers or cargo safely from A to B, sharing the flight deck with a second pilot.",
    day: "Arrive about an hour before departure, review the flight plan, weather and NOTAMs with dispatch, do a walk-around, set up the cockpit, then fly — monitoring systems, fuel and weather and talking to air traffic control the whole way.",
    skills: ["Calm decision-making", "Situational awareness", "Teamwork & communication", "Maths & physics basics", "Following procedures"],
    path: ["Medical certificate", "Private pilot licence (PPL)", "Instrument rating & commercial licence (CPL)", "Multi-crew / jet training", "Airline type rating", "First officer → captain"],
    where: "Flight deck, airports around the world, simulators for recurrent training",
    fact: "Pilots return to the simulator regularly throughout their careers to practise engine failures and emergencies they hope never to see.",
    related: [["🗼 ATC simulator", "#atc/sim"], ["🎛️ Cockpit instruments", "#lab/instruments"], ["🗺️ Flight planning", "#ops/planning"]],
  },
  aero: {
    name: "Aerospace engineer", icon: "📐", explore: "Aircraft design and engineering",
    short: "Designs, analyses and tests aircraft and their parts: wings, structures, engines and more.",
    day: "Model a wing in CAD software, run airflow or stress simulations, review wind-tunnel or flight-test data, and work with other teams to make the design lighter, safer and more efficient.",
    skills: ["Maths & physics", "Problem solving", "CAD & simulation tools", "Attention to detail", "Working in large teams"],
    path: ["Strong maths & physics at school", "Engineering degree (aerospace, mechanical…)", "Graduate scheme or internship", "Specialise: aerodynamics, structures, propulsion…", "Chartered / professional engineer"],
    where: "Design offices, labs, wind tunnels, test sites, manufacturer factories",
    fact: "A new airliner can take around a decade from first sketches to first passenger flight.",
    related: [["⚖️ Four forces", "#lab/forces"], ["🌬️ Aerodynamics lab", "#lab/aero"], ["🛩 Aircraft library", "#aircraft"]],
  },
  avionics: {
    name: "Avionics engineer", icon: "🔌", explore: "Aircraft electronics and systems",
    short: "Designs, installs and fixes the electronics: radios, navigation, autopilot, displays and sensors.",
    day: "Trace a fault in a navigation receiver with test equipment, update display software, check wiring after a modification, or design and test a new system against strict safety standards.",
    skills: ["Electronics & electrical theory", "Logical fault-finding", "Reading wiring diagrams", "Some programming", "Precision"],
    path: ["Maths, physics or electronics at school", "Electronics degree or avionics apprenticeship", "Aircraft type & systems training", "Licence with avionics rating (for maintenance roles)", "Senior / design engineer"],
    where: "Hangars, labs, manufacturers and equipment suppliers",
    fact: "A modern airliner contains hundreds of kilometres of wiring connecting its systems.",
    related: [["🎛️ Cockpit instruments", "#lab/instruments"], ["📻 Radio spectrum", "#atc/spectrum"], ["🔍 Aircraft explorer", "#aircraft/explorer"]],
  },
  atc: {
    name: "ATC controller", icon: "🎧", explore: "Air traffic management",
    short: "Keeps aircraft safely apart on the ground and in the air using radio and radar.",
    day: "Plug in for a shift on a tower, approach or area position, build a picture of all the traffic, give clearances and headings, and hand aircraft smoothly to the next controller — with regular breaks to stay sharp.",
    skills: ["Multitasking", "Spatial awareness", "Clear, concise speech", "Staying calm under pressure", "Quick mental maths"],
    path: ["Pass selection tests (aptitude, medical)", "Air traffic control academy", "Simulator training", "On-the-job training at a unit", "Licence & ratings for your position"],
    where: "Control towers and radar centres, often working shifts",
    fact: "Controllers around the world speak the same standard phraseology so that instructions are understood clearly.",
    related: [["🗼 ATC simulator", "#atc/sim"], ["🗣️ Phraseology", "#atc/phraseology"], ["🛬 Runway explorer", "#ops/runway"]],
  },
  software: {
    name: "Aviation software engineer", icon: "💻", explore: "Software used in aviation",
    short: "Builds the software behind flight computers, simulators, planning tools, booking systems and ATC displays.",
    day: "Write and test code, review a colleague's changes, trace requirements to tests for safety-critical software, or build tools that help airlines plan routes and crews.",
    skills: ["Programming", "Testing & debugging", "Logical thinking", "Writing clear documentation", "Understanding users"],
    path: ["Learn to code (school, clubs, online)", "Computer science or software degree / bootcamp", "Junior developer role", "Learn aviation domain & safety standards", "Senior engineer / architect"],
    where: "Manufacturers, airlines, ATC providers, simulator and tech companies",
    fact: "Safety-critical flight software is developed under strict standards where every requirement must be traced to a test.",
    related: [["🗺️ Flight planning", "#ops/planning"], ["📊 Dashboard", "#dashboard"], ["🌬️ Aerodynamics lab", "#lab/aero"]],
  },
  mechanic: {
    name: "Aircraft mechanic", icon: "🧑‍🔧", explore: "Aircraft inspection and maintenance",
    short: "Inspects, repairs and services aircraft, then certifies them as safe to fly.",
    day: "Meet an arriving aircraft to check a reported defect, change a brake or a wheel, carry out scheduled inspections in the hangar, and record every job in the technical log.",
    skills: ["Hands-on mechanical skill", "Following manuals exactly", "Attention to detail", "Problem solving", "Responsibility"],
    path: ["Technical subjects at school", "Approved maintenance training course or apprenticeship", "Practical experience", "Maintenance licence", "Type ratings for specific aircraft"],
    where: "Hangars, airport ramps, maintenance bases — often shift work",
    fact: "An aircraft can't leave until a licensed engineer signs that it's airworthy.",
    related: [["⚙️ Engine explorer", "#lab/engines"], ["🔍 Aircraft explorer", "#aircraft/explorer"], ["🧳 Ground operations", "#ops/ground"]],
  },
  dispatch: {
    name: "Flight dispatcher", icon: "🖥️", explore: "Flight planning and coordination",
    short: "Plans each flight — route, fuel, weights, alternates — and follows it from the ground.",
    day: "Check weather and NOTAMs for a bank of flights, build flight plans, brief pilots, then watch the flights en route and re-plan when storms, delays or technical issues appear.",
    skills: ["Weather knowledge", "Planning & organisation", "Calm under pressure", "Communication", "Numbers & data"],
    path: ["Interest in weather, maps & aviation", "Dispatcher course / licence (where required)", "Operations assistant role", "Dispatcher", "Operations controller / manager"],
    where: "Airline operations control centres",
    fact: "In some countries the captain and dispatcher share legal responsibility for a flight — both must agree it's safe to go.",
    related: [["🗺️ Flight planning", "#ops/planning"], ["🌦️ METAR decoder", "#academy"], ["📊 Dashboard", "#dashboard"]],
  },
  airportops: {
    name: "Airport operations manager", icon: "🏢", explore: "Airport administration",
    short: "Keeps the whole airport running safely and smoothly, from runways to terminals.",
    day: "Join the morning ops meeting, review runway inspections and works, coordinate airlines, security and fire services, plan for snow or big events, and lead the response when something disrupts the day.",
    skills: ["Leadership", "Coordination", "Decision-making", "Safety & regulations", "Communication"],
    path: ["Business, management or aviation studies", "Airside operations officer / duty officer", "Airside driving & safety training", "Duty manager", "Operations manager"],
    where: "Airport offices, the operations centre and out on the airfield",
    fact: "Airside operations teams inspect runways several times a day for debris, damage and wildlife.",
    related: [["🏗️ Airport builder", "#ops/builder"], ["🛬 Runway explorer", "#ops/runway"], ["👩‍✈️ Airport roles", "#ops/roles"]],
  },
};

// Each answer adds points to careers. Match % = points / the most that career could score.
const CAREER_QUIZ = [
  { q: "Where would you most like to spend your working day?", a: [
    ["✈️ Up in the air, travelling", { pilot: 3 }],
    ["📐 In a design office or lab", { aero: 3, avionics: 1, software: 1 }],
    ["🔧 In a hangar, hands on the aircraft", { mechanic: 3, avionics: 1 }],
    ["🖥️ In an operations room full of screens", { atc: 2, dispatch: 2, airportops: 1 }] ] },
  { q: "Which school subject do you enjoy most?", a: [
    ["🧮 Maths and physics", { aero: 3, pilot: 1, atc: 1 }],
    ["🔌 Electronics and technology", { avionics: 3, mechanic: 1 }],
    ["💻 Computing", { software: 3, avionics: 1 }],
    ["🌍 Geography or business", { dispatch: 2, airportops: 2, pilot: 1 }] ] },
  { q: "When things get stressful, you are best at…", a: [
    ["⚡ Making quick decisions and staying calm", { atc: 3, pilot: 2 }],
    ["📋 Working through a checklist step by step", { mechanic: 2, pilot: 1, avionics: 1 }],
    ["🔎 Digging in to find the root cause", { aero: 2, software: 2, avionics: 1 }],
    ["🤝 Getting everyone working together", { airportops: 3, dispatch: 1 }] ] },
  { q: "It's a free Saturday. What sounds most fun?", a: [
    ["🕹️ Flying a flight simulator", { pilot: 3, atc: 1 }],
    ["🛠️ Building a model or fixing a bike", { mechanic: 2, aero: 2 }],
    ["👾 Coding a game or an app", { software: 3 }],
    ["🎪 Organising an event for friends", { airportops: 3, dispatch: 1 }] ] },
  { q: "Which achievement would make you proudest?", a: [
    ["🛬 A smooth landing with 180 passengers on board", { pilot: 3 }],
    ["🛫 An aircraft I helped design making its first flight", { aero: 3, avionics: 1 }],
    ["📡 Keeping 30 aircraft safely apart in a busy hour", { atc: 3, dispatch: 1 }],
    ["📱 Writing software that thousands of pilots use", { software: 3, avionics: 1 }] ] },
  { q: "How do you like to work?", a: [
    ["🔩 On a hands-on task I can finish myself", { mechanic: 3, avionics: 1 }],
    ["👥 In a small, tight team", { pilot: 2, atc: 2 }],
    ["🏗️ On a big project with many teams", { aero: 2, software: 2, avionics: 1 }],
    ["☎️ As the person everyone calls for answers", { dispatch: 3, airportops: 2 }] ] },
  { q: "Which puzzle would you most enjoy solving?", a: [
    ["⛈️ Planning a route and fuel around a storm", { dispatch: 3, pilot: 1 }],
    ["📟 Working out why a cockpit display keeps flickering", { avionics: 3, mechanic: 1 }],
    ["❄️ Keeping the airport open during heavy snow", { airportops: 3 }],
    ["📈 Making a program that predicts traffic jams in the sky", { software: 2, atc: 1, aero: 1 }] ] },
  { q: "Which schedule suits you best?", a: [
    ["🌐 Varied — trips away and nights in hotels", { pilot: 3 }],
    ["🌙 Shifts, including nights, but home every day", { atc: 2, mechanic: 1, dispatch: 2, airportops: 1 }],
    ["🕘 Mostly regular office hours", { aero: 2, software: 2, avionics: 1 }],
    ["🚙 A mix of office work and time out on the airfield", { airportops: 2, mechanic: 1, avionics: 1 }] ] },
];
const CQ_MAX = Object.fromEntries(Object.keys(CAREERS).map((k) => [k, CAREER_QUIZ.reduce((s, q) => s + Math.max(0, ...q.a.map(([, w]) => w[k] || 0)), 0)]));

const CR = { sel: null, quiz: { i: 0, answers: [] } };

function crRender() {
  const seen = store.get("careersSeen", []);
  $("#crGrid").innerHTML = Object.entries(CAREERS).map(([k, c]) =>
    `<button type="button" class="rl-card on cr-card${CR.sel === k ? " sel" : ""}" data-k="${k}"><span class="rl-ico">${c.icon}</span><b>${esc(c.name)}</b><small>${esc(c.explore)}</small><span class="rl-doing">${esc(c.short)}</span>${seen.includes(k) ? `<span class="cr-seen" title="Explored">✓</span>` : ""}</button>`).join("");
  $("#crSeen").textContent = `${seen.length} / ${Object.keys(CAREERS).length} explored`;
  const c = CAREERS[CR.sel];
  $("#crDetail").innerHTML = c ? `
    <div class="label">${c.icon} ${esc(c.name)}</div>
    <p><b>${esc(c.short)}</b> ${esc(c.fact)}</p>
    <div class="lab-facts rl-facts">
      <div><h5>A day in the job</h5><p>${esc(c.day)}</p></div>
      <div><h5>Where they work</h5><p>${esc(c.where)}</p></div>
      <div><h5>Key skills</h5><div class="cr-skills">${c.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div></div>
    </div>
    <h5 class="rl-h">A typical path</h5>
    <ol class="cr-path">${c.path.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
    <p class="sub small">Routes and requirements vary by country and employer — check official sources and employers where you live.</p>
    <h5 class="rl-h">Try it on AeroLearn</h5>
    <div class="row cr-related">${c.related.map(([l, h]) => `<a class="btn ghost small" href="${h}">${esc(l)}</a>`).join("")}</div>`
    : `<p class="sub">👆 Pick a career to see a day in the job, key skills, and a typical path into it.</p>`;
}
function crOpen(k) {
  CR.sel = k;
  const seen = store.get("careersSeen", []);
  if (!seen.includes(k)) { seen.push(k); store.set("careersSeen", seen); }
  crRender();
  if (seen.length === Object.keys(CAREERS).length) labAward("careersAll", "Explored every aviation career");
  $("#crDetail").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function cqResults(answers) {
  const pts = Object.fromEntries(Object.keys(CAREERS).map((k) => [k, 0]));
  const why = Object.fromEntries(Object.keys(CAREERS).map((k) => [k, []]));
  answers.forEach((ai, qi) => {
    const [label, w] = CAREER_QUIZ[qi].a[ai];
    Object.entries(w).forEach(([k, n]) => { pts[k] += n; if (n >= 2) why[k].push(label.replace(/^\S+\s/, "")); });
  });
  return Object.keys(CAREERS).map((k) => ({ k, pct: Math.round((pts[k] / CQ_MAX[k]) * 100), why: why[k] }))
    .sort((a, b) => b.pct - a.pct);
}
function cqRender() {
  const q = CR.quiz, el = $("#cqBody");
  if (q.i < CAREER_QUIZ.length) {
    const cur = CAREER_QUIZ[q.i];
    el.innerHTML = `
      <div class="quiz-head"><span>Question ${q.i + 1} of ${CAREER_QUIZ.length}</span>${q.i ? `<button type="button" class="btn ghost small" id="cqBack">← Back</button>` : ""}</div>
      <div class="progress cq-prog"><div class="bar" style="width:${(q.i / CAREER_QUIZ.length) * 100}%"></div></div>
      <h3 class="cq-q">${esc(cur.q)}</h3>
      <div class="q-opts cq-opts">${cur.a.map(([l], i) => `<button type="button" class="q-opt" data-a="${i}">${esc(l)}</button>`).join("")}</div>`;
    return;
  }
  const res = cqResults(q.answers), top = res.slice(0, 3);
  store.set("careerMatch", { top: top.map((r) => [r.k, r.pct]), date: new Date().toISOString().slice(0, 10) });
  labAward("careerQuiz", "Career Match Quiz");
  el.innerHTML = `
    <div class="label">Your aviation career matches</div>
    <div class="cq-top">${top.map((r, i) => { const c = CAREERS[r.k]; return `
      <div class="cq-match${i === 0 ? " best" : ""}">
        <div class="cq-m-head"><span class="rl-ico">${c.icon}</span><div><b>${i === 0 ? "Top match · " : ""}${esc(c.name)}</b><small>${esc(c.explore)}</small></div><span class="cq-pct">${r.pct}%</span></div>
        <div class="progress"><div class="bar" style="width:${r.pct}%"></div></div>
        ${r.why.length ? `<p class="small">Because you chose: ${r.why.slice(0, 3).map((w) => `<i>${esc(w)}</i>`).join(" · ")}</p>` : ""}
        <button type="button" class="btn ghost small" data-open="${r.k}">Explore this career →</button>
      </div>`; }).join("")}</div>
    <details class="cq-all"><summary>See all eight careers</summary>
      <ul>${res.map((r) => `<li><span>${CAREERS[r.k].icon} ${esc(CAREERS[r.k].name)}</span><span class="progress"><span class="bar" style="width:${r.pct}%"></span></span><b>${r.pct}%</b></li>`).join("")}</ul>
    </details>
    <p class="sub small">This is just for fun and inspiration — your interests can change, and many people move between aviation careers.</p>
    <button type="button" class="btn" id="cqAgain">↺ Take the quiz again</button>`;
}
function cqLast() {
  const m = store.get("careerMatch", null);
  $("#cqLast").innerHTML = m && m.top ? `Last result (${esc(m.date)}): ${m.top.map(([k, p]) => CAREERS[k] ? `${CAREERS[k].icon} ${esc(CAREERS[k].name)} <b>${p}%</b>` : "").join(" · ")}` : "";
}

function initCareers() {
  $("#crGrid").addEventListener("click", (e) => { const b = e.target.closest(".cr-card"); if (b) crOpen(b.dataset.k); });
  $("#cqBody").addEventListener("click", (e) => {
    const q = CR.quiz;
    const open = e.target.closest("[data-open]");
    if (open) { crOpen(open.dataset.open); return; }
    if (e.target.id === "cqAgain") { CR.quiz = { i: 0, answers: [] }; cqRender(); return; }
    if (e.target.id === "cqBack") { q.i--; q.answers.pop(); cqRender(); return; }
    const b = e.target.closest(".q-opt"); if (!b) return;
    b.classList.add("right"); $$("#cqBody .q-opt").forEach((x) => (x.disabled = true));
    setTimeout(() => { q.answers.push(+b.dataset.a); q.i++; cqRender(); cqLast(); }, 250);
  });
  crRender(); cqRender(); cqLast();
}
initCareers();
