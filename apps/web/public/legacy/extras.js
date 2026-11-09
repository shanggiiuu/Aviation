"use strict";
// ================= EXTRAS: Ask Aero · Abbreviation Decoder · Aviation Timeline =================
// Loaded after app.js and uses its helpers and data ($, $$, esc, findTerm, allTerms, AIRCRAFT, PHONETIC, SQUAWKS …).
const isFil = () => document.documentElement.lang === "fil";
const L = (en, fil) => (isFil() ? fil : en);

// ---------- Abbreviation / terminology decoder ----------
const DEC_STOP = new Set("a an and are as at be by for from i in is it of on or the to was what which with you your me my do does mean means stand stands ano ang ng sa at mga ba".split(" "));
function decodeTerms(text) {
  const found = [], unknown = [], seen = new Set();
  const add = (x) => { if (!seen.has(x.t)) { seen.add(x.t); found.push(x); } };
  const clean = (s) => s.trim().replace(/^[("'“]+|[)"'”.,:;!?]+$/g, "");
  text.split(/[\n,;]+/).map(clean).filter(Boolean).forEach((chunk) => {
    const whole = findTerm(chunk);
    if (whole) { add(whole); return; }
    chunk.split(/[\s/]+/).map(clean).filter(Boolean).forEach((tok) => {
      const x = findTerm(tok);
      if (x) add(x);
      else if (!/^\d+([.,]\d+)?$/.test(tok) && !DEC_STOP.has(tok.toLowerCase()) && /[A-Z]{2,}/.test(tok) && !unknown.includes(tok)) unknown.push(tok);
    });
  });
  return { found, unknown };
}
const firstSentences = (d, n = 2) => d.split(/(?<=\.)\s/).slice(0, n).join(" ");
function renderDecoder() {
  const { found, unknown } = decodeTerms($("#decIn").value);
  if (!$("#decIn").value.trim()) { $("#decOut").innerHTML = `<p class="sub small">${L("Results appear here as you type.", "Lalabas dito ang resulta habang nagta-type ka.")}</p>`; return; }
  $("#decOut").innerHTML = (found.length ? `<table class="dec-table"><tr><th>${L("Term", "Termino")}</th><th>${L("Stands for", "Ibig sabihin")}</th><th>${L("Explanation", "Paliwanag")}</th></tr>
    ${found.map((x) => `<tr><td><a class="term-link" data-term="${esc(x.t)}">${esc(x.t)}</a></td><td>${esc(x.f || "—")}</td><td>${esc(firstSentences(x.d))}</td></tr>`).join("")}</table>`
    : `<p class="sub">${L("No known terms found yet.", "Wala pang nakilalang termino.")}</p>`) +
    (unknown.length ? `<p class="sub small">❓ ${L("Not in the dictionary yet", "Wala pa sa diksiyonaryo")}: ${unknown.map((u) => `<b>${esc(u)}</b>`).join(", ")} · <a href="#dictionary" id="decAdd">${L("add your own term", "magdagdag ng sariling termino")}</a></p>` : "") +
    (found.length ? `<p class="sub small">${L(`Decoded ${found.length} term${found.length === 1 ? "" : "s"}.`, `${found.length} termino ang na-decode.`)}</p>` : "");
}
function initDecoder() {
  $("#decIn").addEventListener("input", renderDecoder);
  $$("#decSamples button").forEach((b) => (b.onclick = () => { $("#decIn").value = b.dataset.s; renderDecoder(); }));
  $("#decOut").addEventListener("click", (e) => { if (e.target.id === "decAdd") { e.preventDefault(); $("#addTermBtn").click(); $("#addTermForm").scrollIntoView({ behavior: "smooth" }); } });
  renderDecoder();
}

// ---------- Aviation timeline ----------
const AV_ERAS = { pioneers: "Pioneers (before 1914)", golden: "Early airlines & records (1914–1938)", jet: "The jet age (1939–1969)", modern: "Modern aviation (1970–1999)", now: "21st century" };
const AV_HISTORY = [
  { y: 1783, era: "pioneers", icon: "🎈", t: "First crewed balloon flight", d: "Two passengers fly over Paris in a hot-air balloon built by the Montgolfier brothers." },
  { y: 1853, era: "pioneers", icon: "🪁", t: "Cayley's glider carries a person", d: "George Cayley, who first described lift, drag, thrust and weight, sends a glider across a valley with a person on board." },
  { y: 1891, era: "pioneers", icon: "🦅", t: "Lilienthal's glider flights", d: "Otto Lilienthal makes around 2,000 glider flights over the next five years and publishes his data, inspiring the Wright brothers." },
  { y: 1903, era: "pioneers", icon: "🛩", t: "The Wright Flyer", d: "On 17 December at Kitty Hawk, the Wright brothers make the first controlled, sustained, powered aeroplane flight. The first one lasts 12 seconds.", ac: "wright" },
  { y: 1909, era: "pioneers", icon: "🌊", t: "Across the English Channel", d: "Louis Blériot flies from France to England in about 37 minutes." },
  { y: 1914, era: "golden", icon: "🎫", t: "First scheduled airline", d: "The St. Petersburg–Tampa Airboat Line in Florida flies one passenger at a time across Tampa Bay." },
  { y: 1919, era: "golden", icon: "🌍", t: "Non-stop across the Atlantic", d: "Alcock and Brown fly non-stop from Newfoundland to Ireland in about 16 hours." },
  { y: 1927, era: "golden", icon: "🗽", t: "Lindbergh's solo flight", d: "Charles Lindbergh flies solo and non-stop from New York to Paris in the Spirit of St. Louis." },
  { y: 1932, era: "golden", icon: "👩‍✈️", t: "Amelia Earhart crosses the Atlantic", d: "Earhart becomes the first woman to fly solo across the Atlantic." },
  { y: 1935, era: "golden", icon: "✈", t: "The Douglas DC-3", d: "The DC-3 first flies. It becomes one of the first airliners able to make money carrying passengers alone." },
  { y: 1939, era: "jet", icon: "🔥", t: "First jet-powered flight", d: "The Heinkel He 178 flies in Germany using a turbojet. Frank Whittle had patented his turbojet design in Britain in 1930." },
  { y: 1941, era: "jet", icon: "🇵🇭", t: "Philippine Air Lines founded", d: "Philippine Air Lines is founded. Today it is often described as Asia's oldest airline still flying under its original name." },
  { y: 1947, era: "jet", icon: "💥", t: "Breaking the sound barrier", d: "Chuck Yeager flies the rocket-powered Bell X-1 faster than the speed of sound." },
  { y: 1952, era: "jet", icon: "🛫", t: "First jet airliner in service", d: "The de Havilland Comet starts carrying passengers, cruising far higher and faster than propeller airliners." },
  { y: 1955, era: "jet", icon: "🛩", t: "The Cessna 172 first flies", d: "It goes on to become the most-produced aircraft in history and a favourite trainer.", ac: "c172" },
  { y: 1958, era: "jet", icon: "🌐", t: "The Boeing 707 enters service", d: "Reliable transatlantic jet travel begins and air travel starts to become affordable for many more people." },
  { y: 1969, era: "jet", icon: "🐘", t: "The jumbo jet and Concorde", d: "The Boeing 747 and Concorde both make their first flights. In July, Apollo 11 lands on the Moon.", ac: "b748" },
  { y: 1976, era: "modern", icon: "⚡", t: "Supersonic passenger service", d: "Concorde starts carrying passengers at about twice the speed of sound. It flew until 2003.", ac: "concorde" },
  { y: 1987, era: "modern", icon: "🖥️", t: "Fly-by-wire airliners", d: "The Airbus A320 first flies with digital fly-by-wire controls and sidesticks, which shaped modern cockpit design.", ac: "a320neo" },
  { y: 1988, era: "modern", icon: "🏋️", t: "The Antonov An-225", d: "The heaviest aircraft ever built first flies. It was destroyed in 2022.", ac: "an225" },
  { y: 2005, era: "now", icon: "🏢", t: "The Airbus A380 first flies", d: "The world's largest passenger airliner, with two full-length decks.", ac: "a388" },
  { y: 2009, era: "now", icon: "🧪", t: "The Boeing 787 first flies", d: "Its structure is largely made of carbon-fibre composites, making it lighter and more fuel-efficient.", ac: "b789" },
  { y: 2013, era: "now", icon: "✈", t: "The Airbus A350 first flies", d: "Another composite long-haul twin jet built for efficiency.", ac: "a359" },
  { y: 2016, era: "now", icon: "☀️", t: "Around the world on sunshine", d: "Solar Impulse 2 completes a round-the-world flight powered only by solar energy." },
  { y: 2021, era: "now", icon: "🪐", t: "First powered flight on another planet", d: "NASA's Ingenuity helicopter flies on Mars, 118 years after the Wright Flyer." },
];
const TL = { era: "all" };
function renderTimeline() {
  $("#tlEras").innerHTML = [["all", L("All eras", "Lahat ng panahon")], ...Object.entries(AV_ERAS)].map(([k, n]) => `<button type="button" class="chip${TL.era === k ? " active" : ""}" data-era="${k}">${esc(n)}</button>`).join("");
  const list = AV_HISTORY.filter((e) => TL.era === "all" || e.era === TL.era);
  $("#tlList").innerHTML = list.map((e) => `<li class="tl-ev">
      <span class="tl-year">${e.y}</span><span class="tl-dot2" aria-hidden="true">${e.icon}</span>
      <div class="tl-body"><b>${esc(e.t)}</b><p>${esc(e.d)}</p>${e.ac ? `<a class="term-link" data-ac="${esc(e.ac)}">${L("See this aircraft →", "Tingnan ang sasakyang ito →")}</a>` : ""}</div></li>`).join("");
  const span = new Date().getFullYear() - 1903;
  $("#tlNote").textContent = L(`It's been ${span} years since the first powered aeroplane flight.`, `${span} taon na mula nang unang lumipad ang eroplanong may makina.`);
}
function initTimeline() {
  $("#tlEras").addEventListener("click", (e) => { const b = e.target.closest("[data-era]"); if (b) { TL.era = b.dataset.era; renderTimeline(); } });
  renderTimeline();
}

// ---------- Ask Aero: built-in study helper ----------
// Answers come from AeroLearn's own dictionary, aircraft library and tools — nothing leaves the browser.
// To use a real AI model instead, set ASK_AERO_ENDPOINT to YOUR OWN backend URL. It receives
// POST {question} and returns {answer}. Keep any API keys on that server, never in this file.
const ASK_AERO_ENDPOINT = "";
const AERO_UNITS = {
  kt: ["spd", 1], knot: ["spd", 1], knots: ["spd", 1], "km/h": ["spd", 1 / 1.852], kph: ["spd", 1 / 1.852], kmh: ["spd", 1 / 1.852], mph: ["spd", 0.868976], "m/s": ["spd", 1.943844],
  ft: ["alt", 1], feet: ["alt", 1], foot: ["alt", 1], m: ["alt", 3.28084], metre: ["alt", 3.28084], metres: ["alt", 3.28084], meter: ["alt", 3.28084], meters: ["alt", 3.28084],
  nm: ["dist", 1], "nautical mile": ["dist", 1], "nautical miles": ["dist", 1], km: ["dist", 1 / 1.852], kilometres: ["dist", 1 / 1.852], kilometers: ["dist", 1 / 1.852], mi: ["dist", 0.868976], miles: ["dist", 0.868976], mile: ["dist", 0.868976],
  kg: ["wt", 1], lb: ["wt", 0.45359237], lbs: ["wt", 0.45359237], pounds: ["wt", 0.45359237],
  hpa: ["prs", 1], inhg: ["prs", 33.8639],
  c: ["tmp"], "°c": ["tmp"], celsius: ["tmp"], f: ["tmp"], "°f": ["tmp"], fahrenheit: ["tmp"],
};
const AERO_SHOW = { spd: ["kt", "km/h", "mph"], alt: ["ft", "m"], dist: ["nm", "km", "mi"], wt: ["kg", "lb"], prs: ["hpa", "inhg"] };
const unitLabel = (u) => ({ nm: "NM", hpa: "hPa", inhg: "inHg", "nautical miles": "NM" }[u] || u);
function aeroConvert(q) {
  const m = q.toLowerCase().match(/(-?\d+(?:[.,]\d+)?)\s*(nautical miles?|km\/h|m\/s|°[cf]|[a-z]+)\b(?:\s*(?:to|in|into|sa|=)\s*(nautical miles?|km\/h|m\/s|°[cf]|[a-z]+))?/);
  if (!m || !AERO_UNITS[m[2]]) return null;
  const v = parseFloat(m[1].replace(",", ".")), [g, f] = AERO_UNITS[m[2]], to = m[3] && AERO_UNITS[m[3]];
  const r = (n) => (+n.toFixed(Math.abs(n) < 10 ? 2 : 1)).toLocaleString();
  if (g === "tmp") {
    const isF = /f/.test(m[2]), c = isF ? (v - 32) * 5 / 9 : v;
    return `🌡️ <b>${r(v)} °${isF ? "F" : "C"}</b> = <b>${r(isF ? c : c * 9 / 5 + 32)} °${isF ? "C" : "F"}</b>`;
  }
  const targets = to && to[0] === g ? [m[3]] : AERO_SHOW[g].filter((u) => AERO_UNITS[u][1] !== f);
  return `🔁 <b>${r(v)} ${esc(unitLabel(m[2]))}</b> = ${targets.map((u) => `<b>${r((v * f) / AERO_UNITS[u][1])} ${esc(unitLabel(u))}</b>`).join(" · ")}
    <br><a href="#academy/convert">${L("Open the unit converter →", "Buksan ang unit converter →")}</a>`;
}
const AC_ALIAS = {
  c172: ["cessna 172", "cessna", "skyhawk"], pa28: ["pa-28", "pa28", "cherokee", "piper"], ask21: ["ask 21"], h145: [],
  atr72: ["atr 72", "atr"], e175: ["embraer"], a320neo: ["a320"], b738: ["737", "b737", "737-800"], b789: ["787", "b787", "dreamliner"],
  a359: ["a350"], a388: ["a380"], b748: ["747", "b747", "jumbo jet", "jumbo"], c130j: ["c-130", "c130", "hercules"], an225: ["an-225", "mriya"],
  concorde: ["concorde"], wright: ["wright flyer"],
};
function aeroAircraft(low) {
  return AIRCRAFT.find((a) => [a.id, a.name.toLowerCase(), ...(AC_ALIAS[a.id] || [])]
    .some((k) => new RegExp(`(^|[^a-z0-9])${reEsc(k)}($|[^a-z0-9])`).test(low)));
}
const termCard = (x) => `<b>${esc(x.t)}</b>${x.f ? ` — <i>${esc(x.f)}</i>` : ""}<p>${esc(x.d)}</p>${x.ex ? `<div class="ex">${esc(x.ex)}</div>` : ""}<a class="term-link" data-term="${esc(x.t)}">${L("Open in dictionary →", "Buksan sa diksiyonaryo →")}</a>`;
function termsIn(q) {
  // every dictionary term that appears as a whole word in the question, longest first, without overlaps
  const hits = [];
  allTerms().filter((x) => x.t.length >= 2).sort((a, b) => b.t.length - a.t.length).forEach((x) => {
    const re = new RegExp(`(^|[^A-Za-z0-9])${reEsc(x.t)}($|[^A-Za-z0-9])`, x.t.length <= 3 ? "" : "i");
    const m = re.exec(q); if (!m) return;
    const start = m.index + m[1].length, end = start + x.t.length;
    if (!hits.some((h) => start < h.end && end > h.start)) hits.push({ x, start, end });
  });
  return hits.sort((a, b) => a.start - b.start).map((h) => h.x);
}
function aeroAnswer(raw) {
  const q = raw.trim(), low = q.toLowerCase();
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|kumusta|kamusta|magandang)/.test(low))
    return L("👋 Hi! I'm Aero. Ask me what an aviation term means, compare two terms (\"VOR vs NDB\"), convert units (\"250 knots to km/h\"), spell a callsign (\"spell G-ABCD\"), or ask about an aircraft (\"tell me about the A380\").",
      "👋 Kumusta! Ako si Aero. Itanong sa akin ang kahulugan ng isang termino sa abyasyon, paghambingin ang dalawang termino (\"VOR vs NDB\"), mag-convert ng unit (\"250 knots to km/h\"), i-spell ang isang callsign (\"spell G-ABCD\"), o magtanong tungkol sa isang eroplano (\"A380\").");
  const sp = low.match(/(?:spell|phonetic(?:ally)?|how do (?:i|you) say|i-spell)\s+(.+)/);
  if (sp) {
    const words = [...sp[1].toUpperCase()].map((c) => PHONETIC[c] || (c === " " ? "/" : null)).filter(Boolean);
    if (words.length) return `🔤 <b>${esc(sp[1].toUpperCase())}</b>: ${esc(words.join(" "))}<br><a href="#atc/phonetic">${L("Practise the phonetic alphabet →", "Sanayin ang phonetic alphabet →")}</a>`;
  }
  const conv = aeroConvert(q); if (conv) return conv;
  const sq = q.match(/\b(7500|7600|7700|7000|1200|2000)\b/);
  if (sq && typeof SQUAWKS !== "undefined") { const s = SQUAWKS.find((x) => x.code === sq[1]); if (s) return `📟 <b>Squawk ${s.code}</b> — ${esc(s.name)}<p>${esc(s.d)}</p><a href="#atc/squawk">${L("Open the squawk tool →", "Buksan ang squawk tool →")}</a>`; }
  const ac = aeroAircraft(low);
  if (ac) return `${esc(AC_ICON[ac.cat] || "✈")} <b>${esc(ac.name)}</b> <span class="sub">(${esc(AC_CATS[ac.cat] || "")}, ${L("first flight", "unang lipad")} ${ac.year})</span>
    <p>${esc(ac.fact)}</p><p class="small">${esc(ac.engines)}${ac.seats ? ` · ${ac.seats} ${L("seats", "upuan")}` : ""}${ac.speed ? ` · ${ac.speed} kt` : ""}${ac.range ? ` · ${ac.range.toLocaleString()} NM` : ""}</p>
    <a class="term-link" data-ac="${esc(ac.id)}">${L("Open in the Aircraft Library →", "Buksan sa Aircraft Library →")}</a>`;
  // strip the question wrapper to find the subject
  const subject = q.replace(/^(what(?:'s| is| are| does)?|whats|define|explain|meaning of|tell me about|who is|ano(?:ng| ang| ba ang|'ng)?|ibig sabihin ng|ipaliwanag(?: ang)?)\s+/i, "")
    .replace(/\s+(mean|means|stand for|stands for|ibig sabihin)\s*\??$/i, "").replace(/^(an?|the)\s+/i, "").replace(/[?!.]+$/, "").trim();
  const exact = findTerm(subject);
  const terms = exact ? [exact] : termsIn(q);
  const vs = /\b(vs\.?|versus|difference|compare|and|at|kumpara)\b/i.test(low);
  if (terms.length >= 2) return `${vs ? L("Here's how they compare:", "Narito ang paghahambing:") : L(`I found ${terms.length} terms:`, `${terms.length} termino ang nakita ko:`)}
    ${terms.slice(0, 5).map((x) => `<div class="aero-term">${termCard(x)}</div>`).join("")}${terms.length > 5 ? `<a href="#dictionary/decoder">${L("Decode the full list →", "I-decode ang buong listahan →")}</a>` : ""}`;
  if (terms.length === 1) return termCard(terms[0]);
  // fall back to searching definitions
  const words = low.split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !DEC_STOP.has(w));
  const scored = allTerms().map((x) => ({ x, s: words.filter((w) => (x.d + " " + (x.f || "")).toLowerCase().includes(w)).length })).filter((r) => r.s).sort((a, b) => b.s - a.s).slice(0, 4);
  if (scored.length) return `${L("I'm not sure exactly, but these terms might help:", "Hindi ako sigurado, pero baka makatulong ang mga terminong ito:")}<div class="chips">${scored.map((r) => `<button class="chip term-link" data-term="${esc(r.x.t)}">${esc(r.x.t)}</button>`).join("")}</div>`;
  return L(`🤔 I don't know that one yet. Try a single term like "QNH", or search the <a href="#dictionary">Dictionary</a>.`, `🤔 Hindi ko pa alam iyan. Subukan ang isang termino tulad ng "QNH", o maghanap sa <a href="#dictionary">Diksiyonaryo</a>.`);
}
const AERO_SUGGEST = () => [L("What is QNH?", "Ano ang QNH?"), "VOR vs NDB", "Spell G-ABCD", "250 knots to km/h", L("Tell me about the A380", "A380"), "ILS, ATIS, METAR"];
function aeroBubble(who, html) {
  const log = $("#aeroLog"), d = document.createElement("div");
  d.className = "aero-msg " + who; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight;
  return d;
}
async function aeroAsk(q) {
  if (!q.trim()) return;
  aeroBubble("me", esc(q));
  let html = aeroAnswer(q);
  if (ASK_AERO_ENDPOINT) {
    const wait = aeroBubble("bot", "…");
    try {
      const r = await fetch(ASK_AERO_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, lang: isFil() ? "fil" : "en" }) });
      const j = await r.json(); if (j && j.answer) html = esc(j.answer).replace(/\n/g, "<br>");
    } catch { /* fall back to the built-in answer */ }
    wait.remove();
  }
  aeroBubble("bot", html);
}
function renderAeroChrome() {
  $("#aeroFab").innerHTML = `💬 <span>${L("Ask Aero", "Tanong kay Aero")}</span>`;
  $("#aeroHead").innerHTML = `<b>✈ Ask Aero</b><span class="sub small">${L("Your aviation study helper", "Katulong mo sa pag-aaral ng abyasyon")}</span><button type="button" class="modal-x" id="aeroClose" aria-label="Close">×</button>`;
  $("#aeroIn").placeholder = L("Ask about a term, aircraft or unit…", "Magtanong tungkol sa termino, eroplano o unit…");
  $("#aeroSend").textContent = L("Ask", "Itanong");
  $("#aeroChips").innerHTML = AERO_SUGGEST().map((s) => `<button type="button" class="chip">${esc(s)}</button>`).join("");
  $("#aeroFoot").textContent = L("Answers come from AeroLearn's own dictionary and aircraft library, not from the internet. For learning only, not for real-world flight.",
    "Ang mga sagot ay mula sa sariling diksiyonaryo at aircraft library ng AeroLearn, hindi mula sa internet. Para lamang sa pag-aaral, hindi para sa tunay na paglipad.");
}
function aeroOpen(open = true) {
  $("#aeroPanel").classList.toggle("hidden", !open);
  $("#aeroFab").classList.toggle("hidden", open);
  if (open) { if (!$("#aeroLog").children.length) aeroBubble("bot", aeroAnswer("hi")); $("#aeroIn").focus(); }
}
function initAero() {
  const fab = document.createElement("button");
  fab.id = "aeroFab"; fab.type = "button"; fab.className = "aero-fab";
  const panel = document.createElement("div");
  panel.id = "aeroPanel"; panel.className = "aero-panel hidden"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Ask Aero");
  panel.innerHTML = `<div class="aero-head" id="aeroHead"></div><div class="aero-log" id="aeroLog" aria-live="polite"></div>
    <div class="chips aero-chips" id="aeroChips"></div>
    <form class="aero-form" id="aeroForm" autocomplete="off"><input id="aeroIn" maxlength="300"><button class="btn small" id="aeroSend"></button></form>
    <p class="sub small aero-foot" id="aeroFoot"></p>`;
  document.body.append(fab, panel);
  renderAeroChrome();
  fab.onclick = () => aeroOpen(true);
  panel.addEventListener("click", (e) => {
    if (e.target.id === "aeroClose") aeroOpen(false);
    const c = e.target.closest("#aeroChips .chip"); if (c) aeroAsk(c.textContent);
  });
  $("#aeroForm").onsubmit = (e) => { e.preventDefault(); const q = $("#aeroIn").value; $("#aeroIn").value = ""; aeroAsk(q); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#aeroPanel").classList.contains("hidden")) aeroOpen(false); });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-open-aero]")) { e.preventDefault(); aeroOpen(true); } });
}

// Re-render translated pieces when the language changes (see i18n.js)
document.addEventListener("aero:lang", () => { renderAeroChrome(); renderDecoder(); renderTimeline(); });

initDecoder(); initTimeline(); initAero(); renderBookmarks();
