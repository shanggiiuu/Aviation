"use strict";
// ================= MULTILINGUAL LEARNING =================
// Interface translations. English is the original text in index.html; each entry lists a CSS selector
// and its translation per language. To add a language: add it to LANGS and add a key to each entry.
// Untranslated content (most lessons, missions, dictionary definitions) stays in English for now.
const LANGS = { en: "English", fil: "Filipino" };
const I18N = [
  // navigation
  ['#nav a[data-page="home"]', { fil: "Tahanan" }], ['#nav a[data-page="academy"]', { fil: "Akademya" }],
  ['#nav a[data-page="ops"]', { fil: "Paliparan" }], ['#nav a[data-page="atc"]', { fil: "ATC at Komunikasyon" }],
  ['#nav a[data-page="dictionary"]', { fil: "Diksiyonaryo" }], ['#nav a[data-page="aircraft"]', { fil: "Mga Eroplano" }],
  ['#nav a[data-page="careers"]', { fil: "Mga Karera" }], ['#nav a[data-page="quiz"]', { fil: "Mga Misyon" }], ['#nav a[data-page="shop"]', { fil: "Tindahan" }],
  ['#nav a[data-page="community"]', { fil: "Komunidad" }],
  // home
  ["#page-home .hero h1", { fil: 'Unawain ang himpapawid.<span class="h1-sub">Isang aralin sa bawat pagkakataon.</span>' }],
  ["#page-home .hero-text > p", { fil: "Isang plataporma para sa mga baguhan sa pag-aaral ng abyasyon, na may interaktibong glosaryo, mga aralin, pagsusulit, at talakayan ng komunidad." }],
  ["#heroInput", { fil: "Maghanap ng salita… subukan ang VHF, PMR, ILS, METAR" }, "placeholder"],
  ["#heroSearch button", { fil: "Hanapin" }],
  ["#page-home > h2:nth-of-type(1)", { fil: "Pangunahing tampok" }], ["#page-home > h2:nth-of-type(2)", { fil: "Subukan mismo" }],
  ["#page-home > h2:nth-of-type(3)", { fil: "Mga madaling gamiting tool" }],
  ["#page-home .wotd .label", { fil: "Salita ng araw" }], ["#page-home .grid.two > .card:nth-child(2) .label", { fil: "Alam mo ba?" }],
  ["#nextFact", { fil: "Isa pang kaalaman →" }],
  // home feature cards: [href, title, text, link]
  ...[
    ['a[href="#academy"]', "Akademya", "Matuto tungkol sa eroplano, aerodynamics, nabigasyon, at abyasyon.", "Magsimulang matuto →"],
    ['a[href="#ops"]', "Paliparan at Flight Ops", "Bumuo ng paliparan, unawain ang mga runway, magplano ng lipad, at tingnan kung paano inihahanda ng ground crew ang eroplano.", "Silipin ang likod ng eksena →"],
    ['a[href="#lab"]', "Aviation Lab", "Mag-eksperimento sa apat na puwersa, daloy ng hangin sa pakpak, mga makina, at mga instrumento sa cockpit.", "Magsimulang mag-eksperimento →"],
    ['a[href="#atc"]', "ATC at Komunikasyon", "Unawain ang mga piloto, control tower, VHF, at komunikasyon sa radyo.", "Makinig →"],
    ['a[href="#dictionary"]', "Diksiyonaryo ng Abyasyon", () => `Maghanap ng mga salitang tulad ng VHF, PMR, ILS, IFR, at transponder — <span id="termCount">${GLOSSARY.length}</span> termino.`, "Maghanap ng salita →"],
    ['a[href="#quiz"]', "Mga Misyon", "Anim na misyon, mula First Flight hanggang Emergency Awareness. Makakuha ng bituin, XP at achievements.", "Magsimula ng misyon →"],
    ['a[href="#community"]', "Komunidad", "Magtanong at makipagtalakayan tungkol sa abyasyon.", "Sumali sa talakayan →"],
    ['a[href="#aircraft"]', "Aklatan ng Eroplano", "Tuklasin ang iba't ibang eroplano at ang kanilang mga katangian.", "Tuklasin ang mga eroplano →"],
    ['a[href="#careers"]', "Mga Karera sa Abyasyon", "Kilalanin ang mga piloto, inhinyero, controller at planner sa likod ng bawat lipad, at sagutan ang Career Match Quiz.", "Hanapin ang iyong landas →"],
    ['a[href="#atc/sim"]', "Interaktibong ATC simulator", "Isang pinasimpleng simulation ng komunikasyon ng piloto at tower.", "Magsimula ng lipad →"],
    ['a[href="#aircraft/explorer"]', "Aircraft explorer", "I-click ang mga bahagi ng eroplano para malaman ang pangalan at gamit ng bawat isa.", "Tuklasin ang mga bahagi →"],
    ['a[href="#dashboard"]', "Aviation dashboard", "Terminolohiya sa paglipad, impormasyon ng paliparan, profile ng eroplano, at edukasyon sa panahon.", "Buksan ang dashboard →"],
    ['.features:not(.small-features) a[href="#profile"]', "Mga learning account", "Mga profile, naka-save na bokabularyo, progreso sa pag-aaral, at talakayan ng komunidad.", "Ang iyong profile →"],
    ["a[data-open-aero]", "Tanong kay Aero", "Katulong sa pag-aaral na nagpapaliwanag ng mga termino, eroplano at unit.", "Magtanong →"],
    ['a[href="#dictionary/decoder"]', "Abbreviation Decoder", "I-paste ang mga daglat o maikling listahan at maipapaliwanag ang bawat termino.", "I-decode →"],
    ['a[href="#aircraft/compare"]', "Paghambingin ang Eroplano", "Laki, makina, range, upuan at bigat, magkatabi.", "Paghambingin →"],
    ['a[href="#aircraft/timeline"]', "Kasaysayan ng Abyasyon", "Mula sa mga unang lobo hanggang sa paglipad sa Mars.", "Tuklasin ang kasaysayan →"],
    ['a[href="#academy/convert"]', "Unit Converter", "Talampakan ↔ metro, knots ↔ km/h, NM ↔ km, at iba pa.", "Mag-convert →"],
    ['.small-features a[href="#profile"]', "Mga Naka-save na Aralin", "I-tap ang 🔖 sa anumang aralin para i-save ito para mamaya.", "Aking mga bookmark →"],
  ].flatMap(([a, h, p, go]) => [[`#page-home .features ${a} h3`, { fil: h }], [`#page-home .features ${a} p`, { fil: p }], [`#page-home .features ${a} .go`, { fil: go }]]),
  // page headings
  ["#page-dashboard > h2", { fil: "Dashboard ng Abyasyon" }],
  ["#page-dashboard > p.sub", { fil: "Terminolohiya sa paglipad, impormasyon ng paliparan, profile ng eroplano, at edukasyon sa panahon — sa isang tingin." }],
  ["#page-academy > h2:first-of-type", { fil: "Akademya" }],
  ["#page-academy > p.sub", { fil: "Matuto tungkol sa eroplano, aerodynamics, nabigasyon, at abyasyon. Magbukas ng aralin, sagutin ang mabilisang tanong, at markahan itong tapos para makakuha ng XP. Ang mga salitang may salungguhit ay nagbubukas ng diksiyonaryo." }],
  ["#page-lab > h2", { fil: "Interaktibong Laboratoryo ng Abyasyon" }],
  ["#page-lab > p.sub", { fil: "Dito ka natututo sa pag-eeksperimento, hindi lang sa pagbabasa. Pumili ng eksperimento, baguhin ang mga bagay, at tingnan ang nangyayari." }],
  ["#page-ops > h2", { fil: "Operasyon ng Paglipad at Pamamahala ng Paliparan" }],
  ["#page-ops > p.sub", { fil: "Paano talaga naihahanda ng mga paliparan at airline ang isang lipad? Bumuo ng paliparan, unawain ang runway, magplano ng ruta, ihanda ang eroplano sa gate, at kilalanin ang mga taong nagpapatakbo ng lahat." }],
  ["#page-atc > h2:first-of-type", { fil: "ATC at Komunikasyon" }],
  ["#page-atc > p:first-of-type", { fil: "Unawain ang mga piloto, control tower, VHF, at komunikasyon sa radyo." }],
  ["#page-aircraft > h2:first-of-type", { fil: "Aklatan ng Eroplano" }],
  ["#page-aircraft > p:first-of-type", { fil: "Tuklasin ang iba't ibang eroplano at ang kanilang mga katangian. Tinatayang halaga lamang ang mga numero at nag-iiba ayon sa bersyon at kaayusan." }],
  ["#acCompareCard > .label", { fil: "Paghambingin ang dalawang eroplano" }],
  ["#timeline > .label", { fil: "Kasaysayan ng abyasyon" }],
  ["#page-dictionary > h2", { fil: "Diksiyonaryo ng Abyasyon" }],
  ["#page-dictionary > p:first-of-type", { fil: "Maghanap ng mga salitang tulad ng VHF, PMR, ILS, IFR, at transponder." }],
  ["#decoder > .label", { fil: "Pang-decode ng daglat" }],
  ['[data-i18n="decSub"]', { fil: "I-paste ang isang daglat, listahan ng mga termino, o maikling pangungusap, at ipapaliwanag ang bawat terminong kilala ng AeroLearn." }],
  ["#decIn", { fil: "hal. ILS, VOR, QNH, ATIS — o: Expect ILS approach runway 27, QNH 1013" }, "placeholder"],
  ["#decSamples button:nth-child(1)", { fil: "Mga pantulong sa nabigasyon" }], ["#decSamples button:nth-child(2)", { fil: "Mga salita sa briefing" }],
  ["#decSamples button:nth-child(3)", { fil: "Isang pangungusap" }],
  ["#page-careers > h2:first-of-type", { fil: "Mga Karera sa Abyasyon" }],
  ["#page-careers > p:first-of-type", { fil: "Hindi lang tungkol sa eroplano ang AeroLearn. Kilalanin ang mga tao sa likod ng abyasyon: tuklasin ang walong karera, at sagutan ang Career Match Quiz para makita kung aling landas ang bagay sa iyong interes." }],
  ["#page-careers > h2:nth-of-type(2)", { fil: "Tuklasin ang mga karera" }],
  ["#page-quiz > h2", { fil: "Mga Misyon" }],
  ["#page-quiz > p.sub", { fil: "Hindi lang basta pagsusulit, kundi mga misyon. Basahin ang briefing, tapusin ang mga gawain, at makakuha ng bituin, XP at achievements. Gusto ng mabilisang ensayo? Subukan ang libreng quiz o flashcards." }],
  ['#quizTabs [data-q="missions"]', { fil: "🚀 Mga Misyon" }], ['#quizTabs [data-q="quiz"]', { fil: "🏆 Libreng quiz" }],
  ["#page-community > h2", { fil: "Komunidad" }],
  ["#page-community > p.sub", { fil: "Magtanong at makipagtalakayan tungkol sa abyasyon." }],
];

function applyLang(lang) {
  if (!LANGS[lang]) lang = "en";
  document.documentElement.lang = lang;
  I18N.forEach(([sel, tr, attr]) => $$(sel).forEach((el) => {
    const key = attr ? "en_" + attr : "en";
    if (!(key in el.dataset)) el.dataset[key] = attr ? el.getAttribute(attr) || "" : el.innerHTML;
    const t = tr[lang], v = lang === "en" || t == null ? el.dataset[key] : typeof t === "function" ? t() : t;
    if (attr) el.setAttribute(attr, v); else el.innerHTML = v;
  }));
  let note = $("#langNote");
  if (lang !== "en") {
    if (!note) { note = document.createElement("div"); note.id = "langNote"; note.className = "lang-note"; $("main").prepend(note); }
    note.innerHTML = `🌐 <b>${LANGS[lang]} (beta):</b> Nakasalin na ang navigation, mga pangunahing pahina, Ask Aero, ang decoder at ang timeline. Ang ilang aralin, misyon at kahulugan sa diksiyonaryo ay nasa Ingles pa. <button type="button" class="btn ghost small" data-lang="en">Switch to English</button>`;
  } else if (note) note.remove();
  const sel = $("#langSel"); if (sel) sel.value = lang;
  rawSet("sky_lang", lang);
  document.dispatchEvent(new CustomEvent("aero:lang", { detail: lang }));
}
(function initLang() {
  const sel = $("#langSel");
  sel.innerHTML = Object.entries(LANGS).map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
  sel.addEventListener("change", () => applyLang(sel.value));
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-lang]"); if (b) applyLang(b.dataset.lang); });
  let lang = rawGet("sky_lang", null);
  if (!LANGS[lang]) lang = /^(fil|tl)\b/i.test(navigator.language || "") ? "fil" : "en";
  applyLang(lang);
})();
