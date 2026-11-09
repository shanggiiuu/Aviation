"use strict";
// ================= SHOP · AERO COINS · PETS · HANGAR =================
// Loaded after app.js / missions.js and uses their helpers ($, $$, esc, store, toast, BADGES, profileStats, AIRCRAFT, AC_ICON).
//
// Economy rules
//  • XP = learning progress. It is never spent and never goes down.
//  • Aero Coins = spending money. Every XP you earn also earns half as many coins (rounded up).
//  • "coins" stores lifetime coins EARNED (only ever grows); the balance is earned − price of everything owned.
//    That keeps progress merging between devices safe: earned takes the max, owned items are a union.
//  • No real money, no timers, no feeding: pets are companions, not chores.

const COIN_RATE = 0.5;
const STARTER_GIFT = 50;

// ---------- Catalogue ----------
const SHOP_CATS = [
  ["pets", "🐾", "Pet Hangar", "Little companions that wander your dashboard and hangar."],
  ["acc", "🎧", "Pet Accessories", "Headsets, caps, scarves and sunglasses for your companions."],
  ["decor", "🛠️", "Hangar Decorations", "Model aircraft, signs, runway lights and furniture for your hangar."],
  ["themes", "🎨", "Dashboard Themes", "Change the colours of your dashboard and hangar."],
  ["cosm", "🪪", "Profile Cosmetics", "Avatar frames, nameplates, badges and pilot-card backgrounds."],
];
const PETS = [
  { id: "pip", e: "🐧", name: "Pip", kind: "Penguin", role: "Starter companion", price: 60, pers: "Curious", fav: "Watching airplanes", desc: "Waddles up to the window every time something takes off." },
  { id: "rex", e: "🦊", name: "Rex", kind: "Fox", role: "Explorer", price: 150, pers: "Adventurous", fav: "Sniffing out new routes", desc: "Always first to the map table when a new flight is planned." },
  { id: "oliver", e: "🦉", name: "Oliver", kind: "Owl", role: "Night flyer", price: 180, pers: "Wise", fav: "Stargazing from the tower", desc: "Sleeps through the day shift and loves a night approach." },
  { id: "charlie", e: "🐶", name: "Charlie", kind: "Pilot pup", role: "Flight buddy", price: 220, pers: "Loyal", fav: "Riding in the right seat", desc: "Ready to fly as soon as someone picks up a headset." },
  { id: "rookie", e: "🦝", name: "Rookie", kind: "Raccoon", role: "Mechanic", price: 260, pers: "Tinkerer", fav: "Tightening every bolt", desc: "Has a spanner for every job and a snack in every toolbox." },
  { id: "skye", e: "🐉", name: "Skye", kind: "Dragon", role: "Special edition", price: 450, pers: "Bold", fav: "Loop-the-loops", desc: "A rare companion who flies without an aircraft." },
];
// badge(name) → an achievement-exclusive item: free, unlocked by earning that badge.
const ITEMS = [
  // Pet accessories: one per slot (head / face / neck) on each pet
  { id: "headset", cat: "acc", slot: "head", e: "🎧", name: "Aviation headset", price: 25, desc: "Noise-cancelling, of course." },
  { id: "cap", cat: "acc", slot: "head", e: "🧢", name: "Pilot cap", price: 30, desc: "For a crisp walk across the ramp." },
  { id: "tophat", cat: "acc", slot: "head", e: "🎩", name: "Barnstormer hat", price: 35, desc: "Old-school air show style." },
  { id: "crown", cat: "acc", slot: "head", e: "👑", name: "Ace crown", price: 0, badge: "Ace of the skies", desc: "Only for pilots with 3 stars on every mission." },
  { id: "shades", cat: "acc", slot: "face", e: "🕶️", name: "Aviator sunglasses", price: 30, desc: "Glare protection above the clouds." },
  { id: "scarf", cat: "acc", slot: "neck", e: "🧣", name: "Flying scarf", price: 35, desc: "Keeps the open-cockpit breeze out." },
  { id: "backpack", cat: "acc", slot: "neck", e: "🎒", name: "Tiny flight bag", price: 40, desc: "Charts, a pencil and one emergency biscuit." },
  { id: "bow", cat: "acc", slot: "neck", e: "🎀", name: "Ribbon bow", price: 20, desc: "Dressed up for the hangar party." },
  { id: "medal", cat: "acc", slot: "neck", e: "🏅", name: "Radio medal", price: 0, badge: "Radio ready", desc: "Awarded for finishing every ATC & Comms lesson." },
  // Hangar decorations (pos = where it sits in the hangar scene)
  { id: "airliner", cat: "decor", pos: "ceil-l", e: "✈️", name: "Hanging airliner model", price: 40, desc: "Suspended from the roof beams." },
  { id: "balloon", cat: "decor", pos: "ceil-r", e: "🎈", name: "Hot-air balloon", price: 35, desc: "A nod to the very first flights in 1783." },
  { id: "lightac", cat: "decor", pos: "floor-l", e: "🛩️", name: "Light aircraft", price: 60, desc: "Parked and chocked on the hangar floor." },
  { id: "heli", cat: "decor", pos: "shelf-1", e: "🚁", name: "Helicopter model", price: 45, desc: "Sits on the display shelf." },
  { id: "tower", cat: "decor", pos: "floor-r", e: "🗼", name: "Control tower model", price: 50, desc: "Your own tiny tower cab." },
  { id: "sign", cat: "decor", pos: "wall-sign", e: "🪧", name: "Airport gate sign", price: 20, desc: "Shows your home airport code." },
  { id: "lights", cat: "decor", pos: "floor-lights", e: "💡", name: "Runway edge lights", price: 30, desc: "A strip of lights along the hangar floor." },
  { id: "chart", cat: "decor", pos: "wall-l", e: "🗺️", name: "Wall chart", price: 25, desc: "An aeronautical chart pinned to the wall." },
  { id: "sofa", cat: "decor", pos: "floor-m", e: "🛋️", name: "Crew lounge sofa", price: 35, desc: "Somewhere to read the briefing." },
  { id: "plant", cat: "decor", pos: "floor-rr", e: "🪴", name: "Hangar plant", price: 15, desc: "The one green thing in the building." },
  { id: "rocket", cat: "decor", pos: "shelf-2", e: "🚀", name: "Commander's rocket", price: 0, badge: "Mission Commander", desc: "For completing every mission." },
  // Dashboard themes (a = accent, b = second colour)
  { id: "t-classic", cat: "themes", e: "🔵", name: "Classic", price: 0, free: true, a: "#2563eb", b: "#ec4899", desc: "The standard AeroLearn blue and pink." },
  { id: "t-sunset", cat: "themes", e: "🌅", name: "Sunset approach", price: 40, a: "#f97316", b: "#db2777", desc: "Orange and rose, like a last landing of the day." },
  { id: "t-night", cat: "themes", e: "🌌", name: "Night ops", price: 60, a: "#6366f1", b: "#0ea5e9", desc: "Deep indigo for after-dark flying." },
  { id: "t-arctic", cat: "themes", e: "🧊", name: "Arctic ferry", price: 50, a: "#0891b2", b: "#64748b", desc: "Cool cyan and slate." },
  { id: "t-jungle", cat: "themes", e: "🌴", name: "Jungle strip", price: 50, a: "#16a34a", b: "#ca8a04", desc: "Green and gold, like a grass runway." },
  { id: "t-gold", cat: "themes", e: "🏆", name: "Golden hour", price: 0, badge: "Quiz ace", a: "#d97706", b: "#b45309", desc: "Unlocked by scoring 10/10 in a quiz." },
  // Profile cosmetics (sub = frame / plate / badge / bg)
  { id: "f-runway", cat: "cosm", sub: "frame", e: "🛬", name: "Runway frame", price: 30, desc: "Striped like a runway threshold." },
  { id: "f-neon", cat: "cosm", sub: "frame", e: "💠", name: "Glass-cockpit frame", price: 40, desc: "A glowing display bezel." },
  { id: "f-wings", cat: "cosm", sub: "frame", e: "🪽", name: "Golden wings frame", price: 0, badge: "Academy graduate", desc: "For completing every Academy lesson." },
  { id: "p-pass", cat: "cosm", sub: "plate", e: "🎫", name: "Boarding-pass nameplate", price: 35, desc: "Your name printed like a boarding pass." },
  { id: "p-lcd", cat: "cosm", sub: "plate", e: "📟", name: "Cockpit LCD nameplate", price: 35, desc: "Green digits on a dark display." },
  { id: "b-star", cat: "cosm", sub: "badge", e: "⭐", name: "Star badge", price: 15, desc: "Shown next to your name." },
  { id: "b-compass", cat: "cosm", sub: "badge", e: "🧭", name: "Navigator badge", price: 20, desc: "Shown next to your name." },
  { id: "b-takeoff", cat: "cosm", sub: "badge", e: "🛫", name: "First solo badge", price: 0, badge: "First lesson", desc: "For completing your first lesson." },
  { id: "bg-clouds", cat: "cosm", sub: "bg", e: "☁️", name: "Cloud-deck background", price: 25, desc: "A pilot card above the clouds." },
  { id: "bg-stars", cat: "cosm", sub: "bg", e: "✨", name: "Starfield background", price: 30, desc: "A pilot card for night flyers." },
  { id: "bg-radar", cat: "cosm", sub: "bg", e: "📡", name: "Radar background", price: 30, desc: "Sweeping green radar rings." },
];
const PET_ITEMS = PETS.map((p) => ({ ...p, cat: "pets", name: `${p.name} the ${p.kind}` }));
const CATALOG = Object.fromEntries([...PET_ITEMS, ...ITEMS].map((x) => [x.id, x]));
const COSM_SUBS = { frame: "Avatar frame", plate: "Nameplate", badge: "Name badge", bg: "Card background" };

// ---------- State ----------
const shopState = () => {
  const s = store.get("shop", {}) || {};
  return { owned: [], eq: {}, petAcc: {}, names: {}, petStats: {}, hidden: [], ...s };
};
const saveShop = (s) => { store.set("shop", s); publishBalance(); };
const owns = (id) => CATALOG[id]?.free || shopState().owned.includes(id);
const coinsEarned = () => {
  let c = store.get("coins", null);
  if (typeof c !== "number") { c = STARTER_GIFT + Math.ceil(store.get("xp", 0) * COIN_RATE); store.set("coins", c); } // first visit: gift + coins for earlier XP
  return c;
};
const coinsSpent = () => shopState().owned.reduce((n, id) => n + (CATALOG[id]?.price || 0), 0);
const coinBalance = () => Math.max(0, coinsEarned() - coinsSpent());
const badgeEarned = (name) => { const s = profileStats(); const b = BADGES.find((x) => x[1] === name); return !!b && !!b[3](s); };
const unlocked = (x) => !x.badge || badgeEarned(x.badge);
const coinStr = (n) => `🪙 ${Number(n).toLocaleString()}`;

// Shown in the classic top bar, and handed to the React top bar through localStorage (not synced; it's derived).
function publishBalance() {
  const b = coinBalance();
  const el = $("#coins"); if (el) el.textContent = b.toLocaleString();
  try { localStorage.setItem("sky_coinbal", JSON.stringify(b)); } catch { /* storage unavailable */ }
}

// Called by addXP() in app.js: every XP earned also earns coins.
function earnCoins(xp) {
  const n = Math.ceil(xp * COIN_RATE);
  if (n <= 0) return 0;
  store.set("coins", coinsEarned() + n);
  publishBalance();
  const chip = $("#coins")?.parentElement;
  if (chip) { chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump"); }
  if (location.hash.startsWith("#shop")) { if (shopUI.tab === "hangar") renderWallet(); else renderShop(); } // prices/"need more" depend on the balance
  return n;
}

// ---------- Pet helpers ----------
const petName = (id) => shopState().names[id] || PETS.find((p) => p.id === id)?.name || "Pet";
const petLevel = (id) => Math.min(10, 1 + Math.floor((shopState().petStats[id]?.n || 0) / 5));
const ownedPets = () => PETS.filter((p) => owns(p.id));
const companion = () => { const s = shopState(); const c = s.eq.companion; return owns(c) ? c : ownedPets()[0]?.id || null; };
function petAccHtml(id) {
  const acc = shopState().petAcc[id] || {};
  return ["head", "face", "neck"].map((slot) => acc[slot] && owns(acc[slot]) ? `<span class="pet-acc ${slot}">${CATALOG[acc[slot]].e}</span>` : "").join("");
}
const petFigure = (id, cls = "") => `<span class="pet-fig ${cls}"><span class="pet-e">${CATALOG[id].e}</span>${petAccHtml(id)}</span>`;
function bumpPet(id, mood) {
  const s = shopState();
  const st = s.petStats[id] || { n: 0 };
  const before = petLevel(id);
  s.petStats[id] = { ...st, n: (st.n || 0) + 1, mood };
  saveShop(s);
  if (petLevel(id) > before) toast(`💛 ${petName(id)} reached companion level ${petLevel(id)}!`);
}

// ================= Pet engine =================
// A "stage" is an element that pets live in. Its spots() returns ground segments [{x0, x1, y}] in px
// relative to the stage; pets wander along a segment, sometimes travel to another, idle, sleep and play.
const STAGES = [];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function makeStage(el, petIds, spots, opts = {}) {
  STAGES.splice(0, STAGES.length, ...STAGES.filter((s) => s.el.isConnected && s.el !== el));
  el.querySelectorAll(".pet").forEach((p) => p.remove());
  const stage = { el, spots, opts, pets: [], follow: false };
  for (const id of petIds) {
    const node = document.createElement("div");
    node.className = "pet"; node.dataset.pet = id; node.tabIndex = 0;
    node.setAttribute("role", "button"); node.setAttribute("aria-label", `${petName(id)} — open pet profile`);
    node.innerHTML = `<span class="pet-face">${petFigure(id, "pet-body")}</span><span class="pet-fx" aria-hidden="true"></span><span class="pet-tag">${esc(petName(id))}</span>`;
    el.appendChild(node);
    const pet = { id, node, seg: 0, x: 0, y: 0, busyUntil: 0, state: "idle" };
    const segs = spots();
    pet.seg = Math.floor(Math.random() * Math.max(1, segs.length));
    const sg = segs[pet.seg] || { x0: 0, x1: 100, y: 0 };
    place(pet, rnd(sg.x0, sg.x1), sg.y, true);
    const open = (e) => { e.stopPropagation(); react(pet); setTimeout(() => openPetProfile(id), 350); };
    node.addEventListener("click", open);
    node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e); } });
    stage.pets.push(pet);
  }
  el.addEventListener("mousemove", (e) => {
    if (!stage.follow) return;
    const r = el.getBoundingClientRect();
    stage.cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  STAGES.push(stage);
  return stage;
}

function place(pet, x, y, instant = false, ms = 0) {
  const n = pet.node;
  n.style.transition = instant ? "none" : `left ${ms}ms linear, top ${ms}ms linear, opacity .4s`;
  if (x < pet.x - 2) n.classList.add("flip"); else if (x > pet.x + 2) n.classList.remove("flip");
  pet.x = x; pet.y = y;
  n.style.left = `${x}px`; n.style.top = `${y}px`;
}
function setState(pet, state, ms) {
  pet.node.classList.remove("walking", "idle-look", "stretch", "sleeping", "playing", "happy");
  if (state) pet.node.classList.add(state);
  pet.state = state || "idle"; pet.busyUntil = Date.now() + ms;
  const fx = pet.node.querySelector(".pet-fx");
  fx.innerHTML = state === "sleeping" ? "<span class='zz'>💤</span>" : state === "playing" ? "<span class='ball'>⚽</span>" : "";
}
function walkTo(pet, x, y) {
  const dist = Math.hypot(x - pet.x, y - pet.y);
  const ms = Math.max(400, dist * 18);
  setState(pet, "walking", ms + 100);
  place(pet, x, y, false, ms);
}
function react(pet) {
  setState(pet, "happy", 1400);
  pet.node.querySelector(".pet-fx").innerHTML = "<span class='heart'>❤️</span>";
}
// What a pet does next when it isn't busy.
function nextAction(stage, pet) {
  const segs = stage.spots();
  if (!segs.length) return;
  if (pet.seg >= segs.length) pet.seg = 0;
  const sg = segs[pet.seg];
  if (stage.follow && stage.cursor) {
    const y = stage.opts.freeY ? Math.min(Math.max(stage.cursor.y - 30, stage.opts.freeY[0]), stage.opts.freeY[1]) : sg.y;
    const x = Math.min(Math.max(stage.cursor.x - 18 + rnd(-30, 30), sg.x0), sg.x1);
    if (Math.abs(x - pet.x) > 12 || Math.abs(y - pet.y) > 12) walkTo(pet, x, y); else setState(pet, "idle-look", 700);
    return;
  }
  const r = Math.random();
  if (r < 0.42) {                                    // wander
    const y = stage.opts.freeY ? rnd(stage.opts.freeY[0], stage.opts.freeY[1]) : sg.y;
    walkTo(pet, rnd(sg.x0, sg.x1), y);
  } else if (r < 0.6) setState(pet, pick(["idle-look", "stretch"]), rnd(1400, 2600)); // idle: look around / stretch
  else if (r < 0.7) setState(pet, "sleeping", rnd(5000, 9000));                       // nap
  else if (r < 0.8) setState(pet, "playing", 2600);                                   // play with a ball
  else if (r < 0.88 && segs.length > 1) {                                             // travel to another spot
    pet.node.style.opacity = "0";
    setState(pet, null, 1300);
    setTimeout(() => {
      const ns = stage.spots(); if (!ns.length) return;
      pet.seg = (pet.seg + 1 + Math.floor(Math.random() * (ns.length - 1))) % ns.length;
      const t = ns[pet.seg];
      place(pet, rnd(t.x0, t.x1), t.y, true);
      requestAnimationFrame(() => { pet.node.style.transition = "opacity .4s"; pet.node.style.opacity = "1"; });
    }, 450);
  } else setState(pet, null, rnd(1500, 3000));                                         // just stand there
}
setInterval(() => {
  if (document.hidden) return;
  const now = Date.now();
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const st = STAGES[i];
    if (!st.el.isConnected) { STAGES.splice(i, 1); continue; }
    if (!st.el.offsetParent) continue; // page not visible
    for (const p of st.pets) if (now >= p.busyUntil) nextAction(st, p);
  }
}, 400);
function stageOf(el) { return STAGES.find((s) => s.el === el); }
function animatePet(id, cls) {
  for (const st of STAGES) for (const p of st.pets) if (p.id === id) { if (cls === "happy") react(p); else setState(p, cls, 2600); }
}

// ================= Pet profile (click a pet) =================
function openPetProfile(id) {
  const p = PETS.find((x) => x.id === id); if (!p || !owns(id)) return;
  const s = shopState(), st = s.petStats[id] || {};
  const mood = { pet: "Loved", play: "Playful" }[st.mood] || "Happy";
  const isComp = companion() === id;
  const accOwned = ITEMS.filter((x) => x.cat === "acc" && owns(x.id));
  $("#modalBody").innerHTML = `
    <div class="label">Pet profile · Owned</div>
    <div class="pp-head">
      <div class="pp-fig">${petFigure(id)}</div>
      <div>
        <h2>${esc(petName(id))}</h2>
        <div class="full">${esc(p.kind)} · Companion level ${petLevel(id)}</div>
        <span class="badge">${esc(p.role)}</span>
      </div>
    </div>
    <div class="pp-facts">
      <div><small>Personality</small><b>${esc(p.pers)}</b></div>
      <div><small>Mood</small><b>${mood}</b></div>
      <div><small>Favourite activity</small><b>${esc(p.fav)}</b></div>
    </div>
    <div class="row">
      <button class="btn small" id="ppPet">🤚 Pet</button>
      <button class="btn small" id="ppPlay">⚽ Play</button>
      <button class="btn ghost small" id="ppDress">👔 Dress up</button>
      <button class="btn ghost small" id="ppComp" ${isComp ? "disabled" : ""}>${isComp ? "✓ Dashboard companion" : "📊 Make dashboard companion"}</button>
    </div>
    <div id="ppDressBox" class="pp-dress hidden">
      ${accOwned.length ? ["head", "face", "neck"].map((slot) => {
        const list = accOwned.filter((x) => x.slot === slot); if (!list.length) return "";
        const cur = (s.petAcc[id] || {})[slot];
        return `<div class="label">${{ head: "Head", face: "Face", neck: "Neck & back" }[slot]}</div><div class="chips">
          <button class="chip ${!cur ? "active" : ""}" data-acc="" data-slot="${slot}">None</button>
          ${list.map((x) => `<button class="chip ${cur === x.id ? "active" : ""}" data-acc="${x.id}" data-slot="${slot}">${x.e} ${esc(x.name)}</button>`).join("")}</div>`;
      }).join("") : `<p class="small">No accessories yet — find headsets, caps and scarves in the <a href="#shop" id="ppToShop">shop</a>.</p>`}
    </div>
    <form id="ppRename" class="pp-rename"><input name="n" maxlength="16" value="${esc(petName(id))}" aria-label="Pet name"><button class="btn ghost small">✏️ Rename</button></form>
    <p class="small sub">Pets never get hungry or sad — they're happy to see you whenever you visit.</p>`;
  $("#modal").classList.remove("hidden");
  $("#ppPet").onclick = () => { bumpPet(id, "pet"); animatePet(id, "happy"); toast(`${petName(id)} loves that 💛`); openPetProfile(id); };
  $("#ppPlay").onclick = () => { bumpPet(id, "play"); animatePet(id, "playing"); toast(`${petName(id)} chases the ball ⚽`); openPetProfile(id); };
  $("#ppDress").onclick = () => $("#ppDressBox").classList.toggle("hidden");
  $("#ppComp").onclick = () => { const ss = shopState(); ss.eq.companion = id; saveShop(ss); toast(`${petName(id)} will greet you on the dashboard`); openPetProfile(id); refreshPetViews(); };
  const ts = $("#ppToShop"); if (ts) ts.onclick = () => { closeModal(); shopUI.tab = "shop"; shopUI.cat = "acc"; if (location.hash.startsWith("#shop")) renderShop(); };
  $$("#ppDressBox [data-slot]").forEach((b) => b.onclick = () => {
    const ss = shopState(); ss.petAcc[id] = { ...(ss.petAcc[id] || {}), [b.dataset.slot]: b.dataset.acc || undefined };
    saveShop(ss); openPetProfile(id); $("#ppDressBox").classList.remove("hidden"); refreshPetViews();
  });
  $("#ppRename").onsubmit = (e) => {
    e.preventDefault();
    const n = new FormData(e.target).get("n").toString().trim().slice(0, 16);
    const ss = shopState(); ss.names[id] = n || undefined; saveShop(ss); openPetProfile(id); refreshPetViews();
  };
}
function refreshPetViews() {
  if (location.hash.startsWith("#shop")) renderShop();
  if ($("#page-dashboard").classList.contains("active")) decorateDashboard();
}

// ================= Shop page =================
const shopUI = { tab: "shop", cat: "pets", confirm: null };

function renderWallet() {
  const earned = coinsEarned(), owned = shopState().owned.length;
  $("#shopWallet").innerHTML = `
    <div class="wallet-coins"><small>Aero Coins</small><b>${coinStr(coinBalance())}</b></div>
    <div><small>Earned all-time</small><b>${earned.toLocaleString()}</b></div>
    <div><small>Items owned</small><b>${owned}</b></div>
    <div><small>XP (never spent)</small><b>⭐ ${store.get("xp", 0)}</b></div>`;
}

function renderShop() {
  renderWallet();
  $$("#shopTabs .chip").forEach((c) => c.classList.toggle("active", c.dataset.tab === shopUI.tab));
  const body = $("#shopBody");
  if (shopUI.tab === "hangar") return renderHangar(body);
  if (shopUI.tab === "earn") return renderEarn(body);
  const [cid, ci, cn, cd] = SHOP_CATS.find((c) => c[0] === shopUI.cat);
  const items = shopUI.cat === "pets" ? PET_ITEMS : ITEMS.filter((x) => x.cat === shopUI.cat);
  body.innerHTML = `
    <div class="shop-cats">${SHOP_CATS.map(([id, i, n]) => `<button class="shop-cat ${id === cid ? "active" : ""}" data-cat="${id}"><span>${i}</span>${esc(n)}</button>`).join("")}</div>
    <p class="sub">${ci} ${esc(cd)}${cid === "pets" ? " Click a companion you own to pet it, play, or dress it up." : ""}</p>
    <div class="shop-grid">${items.map(itemCard).join("")}</div>`;
  $$(".shop-cat", body).forEach((b) => b.onclick = () => { shopUI.cat = b.dataset.cat; shopUI.confirm = null; renderShop(); });
  $$("[data-buy]", body).forEach((b) => b.onclick = () => buy(b.dataset.buy));
  $$("[data-equip]", body).forEach((b) => b.onclick = () => equip(b.dataset.equip));
  $$("[data-meet]", body).forEach((b) => b.onclick = () => openPetProfile(b.dataset.meet));
}

function itemCard(x) {
  const have = owns(x.id), open = unlocked(x), bal = coinBalance();
  const s = shopState();
  let preview = `<span class="si-e">${x.e}</span>`;
  if (x.cat === "pets") preview = `<span class="si-pet">${have ? petFigure(x.id) : `<span class="pet-fig"><span class="pet-e">${x.e}</span></span>`}</span>`;
  if (x.cat === "themes") preview = `<span class="si-swatch" style="--a:${x.a};--b:${x.b}">${x.e}</span>`;
  const price = x.badge ? `<span class="price ach">🏅 ${esc(x.badge)}</span>` : x.free ? `<span class="price">Free</span>` : `<span class="price">${coinStr(x.price)}</span>`;
  let action;
  if (have) {
    if (x.cat === "pets") action = `<button class="btn ghost small" data-meet="${x.id}">💬 Pet profile</button>`;
    else if (x.cat === "acc") action = `<span class="si-note">Owned · dress up a pet to wear it</span>`;
    else if (x.cat === "decor") action = `<button class="btn ghost small" data-equip="${x.id}">${s.hidden.includes(x.id) ? "👁 Show in hangar" : "✓ In your hangar"}</button>`;
    else {
      const key = x.cat === "themes" ? "theme" : x.sub;
      const on = (s.eq[key] || (x.cat === "themes" ? "t-classic" : null)) === x.id;
      action = `<button class="btn ${on ? "" : "ghost"} small" data-equip="${x.id}">${on ? "✓ Equipped" : "Equip"}</button>`;
    }
  } else if (!open) action = `<span class="si-note">🔒 Earn the “${esc(x.badge)}” badge to unlock</span>`;
  else if (x.badge) action = `<button class="btn small" data-buy="${x.id}">🎁 Claim</button>`;
  else if (bal < x.price) action = `<button class="btn ghost small" disabled>Need ${coinStr(x.price - bal)} more</button>`;
  else action = `<button class="btn small" data-buy="${x.id}">${shopUI.confirm === x.id ? `Confirm: spend ${coinStr(x.price)}` : `Buy · ${coinStr(x.price)}`}</button>`;
  const sub = x.cat === "pets" ? `${esc(x.role)} · ${esc(x.pers)}` : x.cat === "acc" ? `${{ head: "Head", face: "Face", neck: "Neck & back" }[x.slot]} slot` : x.cat === "cosm" ? COSM_SUBS[x.sub] : x.cat === "decor" ? "Hangar decoration" : "Theme";
  return `<div class="card shop-item ${have ? "owned" : ""} ${!open ? "locked" : ""}">
    <div class="si-prev">${preview}</div>
    <div class="si-top"><h3>${esc(x.name)}</h3>${price}</div>
    <div class="si-sub">${sub}</div>
    <p class="small">${esc(x.desc)}</p>
    <div class="si-act">${action}</div></div>`;
}

function buy(id) {
  const x = CATALOG[id]; if (!x || owns(id) || !unlocked(x)) return;
  if (!x.badge) {
    if (coinBalance() < x.price) return toast("Not enough Aero Coins yet — keep learning!");
    if (shopUI.confirm !== id) { shopUI.confirm = id; renderShop(); setTimeout(() => { if (shopUI.confirm === id) { shopUI.confirm = null; renderShop(); } }, 3500); return; }
  }
  shopUI.confirm = null;
  const s = shopState();
  s.owned = [...s.owned, id];
  if (x.cat === "pets" && !owns(s.eq.companion)) s.eq.companion = id;
  if (x.cat === "themes") s.eq.theme = id;
  if (x.cat === "cosm") s.eq[x.sub] = id;
  saveShop(s);
  toast(x.cat === "pets" ? `🎉 ${x.name} has moved into your hangar!` : x.badge ? `🎁 Claimed: ${x.name}` : `✔ Bought: ${x.name}`);
  renderShop();
  if (x.cat === "pets") setTimeout(() => openPetProfile(id), 500);
}

function equip(id) {
  const x = CATALOG[id]; if (!owns(id)) return;
  const s = shopState();
  if (x.cat === "decor") s.hidden = s.hidden.includes(id) ? s.hidden.filter((h) => h !== id) : [...s.hidden, id];
  else if (x.cat === "themes") s.eq.theme = id;
  else if (x.cat === "cosm") s.eq[x.sub] = s.eq[x.sub] === id ? undefined : id; // click again to take it off
  saveShop(s); renderShop();
}

function renderEarn(body) {
  const row = (what, xp, note = "") => `<tr><td>${what}</td><td>⭐ ${xp} XP</td><td>🪙 ${Math.ceil(xp * COIN_RATE)}</td><td class="small">${note}</td></tr>`;
  body.innerHTML = `
    <div class="grid two">
      <div class="card">
        <div class="label">How to earn Aero Coins</div>
        <p>Every XP you earn also gives you <b>half as many Aero Coins</b> (rounded up). XP measures what you've learned; coins are for spending. <b>Buying things never lowers your XP or your rank.</b></p>
        <table class="spec-table earn-table"><tr><th>Activity</th><th>XP</th><th>Coins</th><th></th></tr>
          ${row("Complete a lesson", 20)}${row("Right first time in a lesson", 5)}${row("Correct quiz answer", 10, "free quiz")}
          ${row("Mission star", MS_XP_PER_STAR, "per new star")}${row("Correct call in the ATC simulator", 5)}${row("Discover a new dictionary term", 1, "first time opened")}
          ${row("Add your own term", 5)}${row("Lab tools & instruments", 3)}</table>
        <p class="small sub">You started with a ${STARTER_GIFT}-coin welcome gift plus coins for the XP you'd already earned.</p>
      </div>
      <div class="card">
        <div class="label">Achievement rewards</div>
        <p>Some items can't be bought: earn the badge and claim them for free.</p>
        <ul class="ach-list">${ITEMS.filter((x) => x.badge).map((x) => `<li class="${badgeEarned(x.badge) ? "on" : ""}"><span>${x.e}</span><b>${esc(x.name)}</b><small>${badgeEarned(x.badge) ? (owns(x.id) ? "✓ Claimed" : "Ready to claim!") : "🔒 " + esc(x.badge)}</small></li>`).join("")}</ul>
        <p class="small sub">No real money, ever. Everything in the shop is earned by learning.</p>
      </div>
    </div>`;
}

// ================= My Hangar =================
function themeVars() {
  const t = CATALOG[shopState().eq.theme] || CATALOG["t-classic"];
  return `--ta:${t.a};--tb:${t.b}`;
}
function pilotCard() {
  const prof = currentProfile(), s = shopState(), xp = store.get("xp", 0);
  const badge = owns(s.eq.badge) ? CATALOG[s.eq.badge].e : "";
  return `<div class="pilot-card ${s.eq.bg && owns(s.eq.bg) ? s.eq.bg : ""}">
    <span class="big-avatar ${s.eq.frame && owns(s.eq.frame) ? s.eq.frame : ""}">${prof.avatar}</span>
    <div><div class="nameplate ${s.eq.plate && owns(s.eq.plate) ? s.eq.plate : ""}">${esc(prof.name)}${badge ? ` <span class="name-badge">${badge}</span>` : ""}</div>
    <small>${esc(rankFor(xp).name)} · ⭐ ${xp} XP · ${coinStr(coinBalance())}</small></div></div>`;
}

function renderHangar(body) {
  const s = shopState(), pets = ownedPets().map((p) => p.id);
  const decor = ITEMS.filter((x) => x.cat === "decor" && owns(x.id) && !s.hidden.includes(x.id));
  const st = profileStats();
  const trophies = BADGES.filter((b) => b[3](st));
  const favAc = AIRCRAFT.find((a) => a.id === s.favAc);
  const home = (s.homeAp || "AERO").toUpperCase();
  body.innerHTML = `
    <div class="hangar-top">
      ${pilotCard()}
      <div class="row">
        <button class="btn ghost small" id="hgFollow">🖱 Pets follow cursor: <b>${shopUI.follow ? "on" : "off"}</b></button>
        <label class="small">Favourite aircraft <select id="hgAc"><option value="">— choose —</option>${AIRCRAFT.map((a) => `<option value="${a.id}" ${a.id === s.favAc ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label>
        ${owns("sign") ? `<label class="small">Gate sign <input id="hgSign" maxlength="4" size="5" value="${esc(home)}"></label>` : ""}
      </div>
    </div>
    <div class="hangar" id="hangarStage" style="${themeVars()}">
      <div class="hg-roof"></div>
      <div class="hg-door"></div>
      ${decor.map((x) => x.id === "lights" ? `<div class="hg-lights">${"<i></i>".repeat(14)}</div>`
        : x.id === "sign" ? `<div class="hg-deco wall-sign"><span>GATE</span><b>${esc(home)}</b></div>`
        : `<div class="hg-deco ${x.pos}" title="${esc(x.name)}">${x.e}</div>`).join("")}
      <div class="hg-shelf trophy-shelf" title="Your achievements">${trophies.length ? trophies.slice(0, 12).map((b) => `<span title="${esc(b[1])}">${b[0]}</span>`).join("") : `<small>Achievements appear here</small>`}</div>
      <div class="hg-stand" title="Favourite aircraft">${favAc ? `<span>${AC_ICON[favAc.cat] || "✈️"}</span><small>${esc(favAc.name)}</small>` : `<small>Pick a favourite aircraft</small>`}</div>
      <div class="hg-desk" title="Your workstation"><span class="desk-screen">${esc(rankFor(store.get("xp", 0)).name)}<br>⭐ ${store.get("xp", 0)}</span><span class="desk-top"></span></div>
      <div class="hg-floor"></div>
      ${pets.length ? "" : `<div class="hg-empty"><b>Your hangar is waiting for a companion.</b><br><button class="btn small" id="hgAdopt">🐧 Visit the Pet Hangar</button></div>`}
    </div>
    <p class="small sub">Tip: click a pet to open its profile. Decorations you own can be hidden or shown from the shop. Own ${decor.length} decoration${decor.length === 1 ? "" : "s"} · ${pets.length} companion${pets.length === 1 ? "" : "s"}.</p>`;
  const el = $("#hangarStage");
  const stage = makeStage(el, pets, () => {
    const w = el.clientWidth, h = el.clientHeight;
    return [{ x0: 10, x1: Math.max(20, w - 60), y: h - 70 }];
  }, { freeY: [el.clientHeight - 105, el.clientHeight - 55] });
  stage.follow = !!shopUI.follow;
  $("#hgFollow").onclick = () => { shopUI.follow = !shopUI.follow; renderHangar(body); };
  $("#hgAc").onchange = (e) => { const ss = shopState(); ss.favAc = e.target.value || undefined; saveShop(ss); renderHangar(body); };
  const sg = $("#hgSign"); if (sg) sg.onchange = (e) => { const ss = shopState(); ss.homeAp = e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 4) || undefined; saveShop(ss); renderHangar(body); };
  const ad = $("#hgAdopt"); if (ad) ad.onclick = () => { shopUI.tab = "shop"; shopUI.cat = "pets"; renderShop(); };
}

// ================= Dashboard: theme, pilot card, roaming companion =================
function decorateDashboard() {
  const page = $("#page-dashboard"), dash = $(".dash", page), s = shopState();
  page.setAttribute("style", themeVars());
  page.classList.toggle("themed", owns(s.eq.theme) && s.eq.theme !== "t-classic");
  // profile cosmetics on the welcome card
  const av = $("#dWelcome .big-avatar"), h = $("#dWelcome h3");
  if (av) { av.className = "big-avatar " + (owns(s.eq.frame) ? s.eq.frame : ""); }
  if (h) { h.className = "nameplate " + (owns(s.eq.plate) ? s.eq.plate : ""); if (owns(s.eq.badge) && !h.querySelector(".name-badge")) h.insertAdjacentHTML("beforeend", ` <span class="name-badge">${CATALOG[s.eq.badge].e}</span>`); }
  const card = $("#dWelcome"); if (card) card.className = "card dash-welcome " + (owns(s.eq.bg) ? s.eq.bg : "");
  if (card && !$("#dCoins")) card.insertAdjacentHTML("beforeend", `<p class="small" id="dCoins"></p>`);
  const comp = companion();
  if ($("#dCoins")) $("#dCoins").innerHTML = `${coinStr(coinBalance())} Aero Coins · <a href="#shop${comp ? "/hangar" : ""}">${comp ? "Visit your hangar" : "Adopt a companion in the shop"} →</a>`;
  // companion walks along the tops of the dashboard cards and travels between them
  let layer = $(".pet-layer", dash);
  if (!comp) { layer?.remove(); return; }
  if (!layer) { layer = document.createElement("div"); layer.className = "pet-layer"; dash.appendChild(layer); }
  makeStage(layer, [comp], () => $$(":scope > .card", dash).map((c) => ({ x0: c.offsetLeft + 8, x1: c.offsetLeft + Math.max(10, c.offsetWidth - 50), y: c.offsetTop - 36 })));
}
const _renderDashboard = renderDashboard;
renderDashboard = function () { _renderDashboard(); decorateDashboard(); };

// ================= Wiring =================
$("#shopTabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]"); if (!b) return;
  shopUI.tab = b.dataset.tab; renderShop();
});
window.addEventListener("hashchange", () => { const [p, sub] = location.hash.slice(1).split("/"); if (p === "shop") { if (sub === "hangar") shopUI.tab = "hangar"; renderShop(); } });
publishBalance();
{ const [p, sub] = location.hash.slice(1).split("/"); if (p === "shop") { if (sub === "hangar") shopUI.tab = "hangar"; renderShop(); } if (p === "dashboard") decorateDashboard(); }
