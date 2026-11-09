/*
 * Baugh Home Card — animated home-energy scene for Home Assistant.
 *
 * Install with HACS, or put this file and its images (the .svg and .webp files) together in
 *   /config/www/baugh-home-card/   and add the resource  /local/baugh-home-card/baugh-home-card.js  (JavaScript module).
 * https://github.com/Boffy35/baugh-home-card  ·  MIT licence  ·  (c) 2026 Boffy35
 * Add the card from the dashboard editor ("Baugh Home") or in YAML:  type: custom:baugh-home-card
 */
const CARD_VERSION = "0.5.0";
const HERE = new URL(".", import.meta.url).href;

// ================================================================ scene constants
const AX = 0.96, AY = 0.24, BX = 0.6, BY = -0.3;          // axonometric projection shared by every asset (metres -> card units)
const RAD = Math.PI / 180;
const VW = 1360, VH = 849, VTOP = -77;                   // card frame (10% taller than 1360x772: 77 units of extra sky)
const VIEWS = {
  holo: {
    house:  { href: "house-holo.svg",  vbX: -62.0, vbY: -398.0, vbW: 675.5, vbH: 681.3, k: 40 },
    garage: { href: "garage-holo.svg", vbX: -43.8, vbY: -188.0, vbW: 418.7, vbH: 357.1, k: 40 },
    car:    { href: "car-holo.svg",    vbX: -130.6, vbY: -134.9, vbW: 262.0, vbH: 204.9, k: 40 }
  },
  real: {
    house:  { href: "house-holo.svg",  vbX: -62.0, vbY: -398.0, vbW: 675.5, vbH: 681.3, k: 40 },   // hidden: the photo is the house
    garage: { href: "garage-holo.svg", vbX: -43.8, vbY: -188.0, vbW: 418.7, vbH: 357.1, k: 40 },   // hidden: the photo is the garage
    car:    { href: "car-real.svg", vbX: -315, vbY: -255, vbW: 635, vbH: 560, k: 66.5 / Math.hypot(0.6, 0.3) }
  }
};
// each kit item in two orientations: "front" (faces the street, as the house front) and "gable" (turned 90°, faces the gable end)
const KIT = {
  battery:  { front: { href: "battery-1.svg",       vbX: -25.6, vbY: -48.9, vbW: 73.5, vbH: 88.4, k: 40 },
              gable: { href: "battery-1-gable.svg", vbX: -25.6, vbY: -51.2, vbW: 70.7, vbH: 88.9, k: 40 }, w: 0.43, d: 0.24 },
  inverter: { front: { href: "inverter.svg",        vbX: -22.5, vbY: -35.4, vbW: 63.9, vbH: 67.0, k: 40 },
              gable: { href: "inverter-gable.svg",  vbX: -22.5, vbY: -36.4, vbW: 62.7, vbH: 67.2, k: 40 }, w: 0.335, d: 0.253 },
  meter:    { front: { href: "meter.svg",           vbX: -22.5, vbY: -32.4, vbW: 69.0, vbH: 65.5, k: 40 },
              gable: { href: "meter-gable.svg",     vbX: -22.5, vbY: -36.0, vbW: 64.6, vbH: 66.2, k: 40 }, w: 0.5, d: 0.2 }
};
// footprint along world x and y for an item, its orientation and scale
const foot = (k, o, sc) => o === "gable" ? [KIT[k].d * sc, KIT[k].w * sc] : [KIT[k].w * sc, KIT[k].d * sc];
const BAT_W = 0.43, BAT_D = 0.24, BAT_H = 0.9, BAT_PITCH = 0.93;
const GARAGE_FIXED = { x: 10.9, y: 7.75, scale: 1 };        // measured from the photo background
const DEFAULT_LAYOUT = {
  ox: 360, oy: 470, s: 37.5,
  car: { x: 11.7, y: 1.4, scale: 1 }, battery: { x: 17.4, y: 5.2, scale: 1, o: "front" },
  inverter: { x: 16.5, y: 5.2, scale: 1, o: "front" }, meter: { x: 14.2, y: 1.5, scale: 1, o: "front" }
};
const COLORS = { blue: "#22e4ff", green: "#39ff88", red: "#ff3b5c" };
const WX = {
  sunny:            { day: ["#2c82d2", "#62b2e8", "#a6daf5"], night: null,                             clouds: 0,  cc: ["#ffffff", "#2a3442"], sun: 1,   p: null },
  partlycloudy:     { day: ["#3580c4", "#70addb", "#acd5ee"], night: null,                             clouds: 4,  cc: ["#ffffff", "#2a3442"], sun: 1,   p: null },
  cloudy:           { day: ["#66727f", "#94a0ac", "#c1c9d1"], night: ["#0b0f16", "#141a23", "#1d242e"], clouds: 8,  cc: ["#e6eaee", "#232b36"], sun: .35, p: null },
  rainy:            { day: ["#4a5461", "#6e7986", "#97a1ac"], night: ["#090c12", "#11161e", "#19202a"], clouds: 9,  cc: ["#a9b3bd", "#1f2630"], sun: 1, outline: true, p: "rain" },
  pouring:          { day: ["#323b46", "#515b67", "#76808b"], night: ["#07090d", "#0e1218", "#151a22"], clouds: 10, cc: ["#86909b", "#1a2029"], sun: 1, outline: true, p: "pour" },
  snowy:            { day: ["#8b97a4", "#b6c0ca", "#e0e5ea"], night: ["#10151c", "#1b222c", "#262e39"], clouds: 9,  cc: ["#f1f4f7", "#2b3440"], sun: 1, outline: true, p: "snow" },
  fog:              { day: ["#98a1aa", "#bac1c8", "#dbdfe3"], night: ["#13171d", "#1f252d", "#2a3139"], clouds: 3,  cc: ["#e9edf0", "#2b323b"], sun: 1, outline: true, p: "fog" },
  "lightning-rainy":{ day: ["#252b35", "#3b4350", "#5b6470"], night: ["#06080c", "#0c1016", "#141920"], clouds: 10, cc: ["#6f7884", "#161b23"], sun: 1, outline: true, p: "storm" }
};
const WX_MAP = {
  "clear-night": "sunny", sunny: "sunny", partlycloudy: "partlycloudy", cloudy: "cloudy", windy: "partlycloudy",
  "windy-variant": "cloudy", rainy: "rainy", pouring: "pouring", hail: "pouring", snowy: "snowy", "snowy-rainy": "snowy",
  fog: "fog", lightning: "lightning-rainy", "lightning-rainy": "lightning-rainy", exceptional: "cloudy"
};
const SOC_STOPS = [[0, [255, 59, 92]], [0.6, [255, 176, 32]], [1, [57, 255, 136]]];
const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const STARS = Array.from({ length: 56 }, (_, i) => { const r = Math.sin(i * 91.7) * 43758.5453, r2 = Math.sin(i * 12.9) * 9631.7; return [(r - Math.floor(r)) * 1360, (r2 - Math.floor(r2)) * 377 - 77, 0.5 + ((r * 7) % 1 + 1) % 1 * 1.1, (i % 5) * .8]; });
const OCPP = { Available: "Available", Preparing: "Plugged in", Charging: "Charging", SuspendedEV: "Paused by car", SuspendedEVSE: "Paused by charger",
               Finishing: "Finishing", Reserved: "Reserved", Unavailable: "Unavailable", Faulted: "Fault" };

// ================================================================ text groups
// fmt: W (watts) · Wsigned (+import / −export) · kW · kWh · A · pct · dur (time remaining) · dt (date/time) · state
const TEXT_GROUPS = {
  meter_power:    { title: "Meter power",             or: "front", x: 63, y: 62, size: 1.3, lines: [{ key: "grid_power", fmt: "Wsigned", label: "" }] },
  meter_energy:   { title: "Meter import / export",   or: "front", x: 63, y: 67, size: .9,  lines: [{ key: "grid_import_energy", fmt: "kWh", label: "" }, { key: "grid_export_energy", fmt: "kWh", label: "" }] },
  pv_strings:     { title: "Solar strings",           or: "front", x: 72, y: 19, size: 1,   lines: [{ key: "pv1_power", fmt: "W", label: "" }, { key: "pv2_power", fmt: "W", label: "" }] },
  pv_total:       { title: "Solar today",             or: "front", x: 72, y: 26, size: 1,   lines: [{ key: "pv_energy_today", fmt: "kWh", label: "" }] },
  battery1_power: { title: "Battery 1 power",         or: "front", x: 79, y: 40, size: 1,   lines: [{ key: "battery_power", fmt: "W", label: "" }] },
  battery1:       { title: "Battery 1",               or: "front", x: 79, y: 45, size: .8,  lines: [{ key: "battery_charge_energy", fmt: "kWh", label: "" }, { key: "battery_discharge_energy", fmt: "kWh", label: "" }, { key: "battery_time_to_full", fmt: "dur", label: "" }, { key: "battery_time_to_empty", fmt: "dur", label: "" }] },
  battery2_power: { title: "Battery 2 power",         or: "front", x: 90, y: 40, size: 1,   lines: [{ key: "battery2_power", fmt: "W", label: "" }] },
  battery2:       { title: "Battery 2",               or: "front", x: 90, y: 45, size: .8,  lines: [{ key: "battery2_charge_energy", fmt: "kWh", label: "" }, { key: "battery2_discharge_energy", fmt: "kWh", label: "" }, { key: "battery2_time_to_full", fmt: "dur", label: "" }, { key: "battery2_time_to_empty", fmt: "dur", label: "" }] },
  house_load:     { title: "House load",              or: "side", x: 56, y: 50, size: 1.6, lines: [{ key: "load_power", fmt: "W", label: "" }] },
  car_soc:        { title: "Car charge level",        or: "side", x: 60, y: 75, size: 1.1, lines: [{ key: "car_soc", fmt: "pct", label: "" }] },
  charger_status: { title: "Charger connector status",or: "front", x: 64, y: 47, size: .8,  lines: [{ key: "charger_status", fmt: "state", label: "" }] },
  charger:        { title: "Charger",                 or: "front", x: 76, y: 60, size: .8,  lines: [{ key: "charger_current", fmt: "A", label: "" }, { key: "ev_power", fmt: "kW", label: "" }, { key: "charger_session_energy", fmt: "kWh", label: "" }] },
  axle:           { title: "Axle event",              or: "flat", x: 3,  y: 10, size: .8,  lines: [{ key: "axle_start", fmt: "dt", label: "" }, { key: "axle_end", fmt: "dt", label: "" }] }
};
const BASE_FONT = 24;                                     // card units at size 1 (card is 1360 wide)

// ================================================================ astronomy
function solarPos(d, lat, lon) {                          // NOAA solar position algorithm
  const jd = d.getTime() / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
  const om = 125.04 - 1934.136 * T, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * RAD);
  const eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(om * RAD);
  const dec = Math.asin(Math.sin(eps * RAD) * Math.sin(lam * RAD)), y = Math.tan(eps * RAD / 2) ** 2;
  const eot = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  let ha = (mins + eot + 4 * lon) / 4 - 180; if (ha < -180) ha += 360;
  const la = lat * RAD, cz = Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha * RAD);
  const el = 90 - Math.acos(Math.max(-1, Math.min(1, cz))) / RAD;
  const az = (Math.atan2(Math.sin(ha * RAD), Math.cos(ha * RAD) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) / RAD + 540) % 360;
  return { el, az };
}
function moonPos(date, lat, lon) {                        // low-precision lunar position (~1°) and phase
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545, R = RAD;
  const L = R * (218.316 + 13.176396 * d), M = R * (134.963 + 13.064993 * d), F = R * (93.272 + 13.22935 * d);
  const l = L + R * 6.289 * Math.sin(M), b = R * 5.128 * Math.sin(F), e = R * 23.4397;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const H = R * (280.16 + 360.9856235 * d) + R * lon - ra, phi = R * lat;
  const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / R;
  const az = (Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) / R + 180 + 360) % 360;
  const ph = (((d + 2451545 - 2451550.26) / 29.530588853) % 1 + 1) % 1;
  return { el: el + 0.3, az, phase: ph, lit: (1 - Math.cos(2 * Math.PI * ph)) / 2 };
}

// ================================================================ markup
const STYLE = `
:host { display: block; }
ha-card { overflow: hidden; border-radius: var(--ha-card-border-radius, 12px); background: none; }
.scene { position: relative; width: 100%; aspect-ratio: ${VW} / ${VH}; transition: background .6s; container-type: inline-size; }
.scene > svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
#overlay { pointer-events: none; }
.hit { cursor: pointer; }
.neon { font-family: "Orbitron", "Eurostile", "Bank Gothic", "Segoe UI", sans-serif; font-weight: 700; fill: #9ff8ff; letter-spacing: .02em; }
.lbl { fill: #86e6f5; font-weight: 600; }
#textLayer text { paint-order: stroke; stroke: rgba(2, 16, 28, .7); stroke-width: 3.5px; stroke-linejoin: round; }
#fixedText text { paint-order: stroke; stroke: rgba(2, 16, 28, .7); stroke-width: .008; stroke-linejoin: round; }
.txtbtn {
  position: absolute; left: 2.2%; bottom: 3.5%; width: 5.4%; aspect-ratio: 1; min-width: 30px; border-radius: 50%;
  display: grid; place-items: center; cursor: pointer; padding: 0; z-index: 2;
  font: 700 max(7px, 0.85cqw) "Orbitron", "Eurostile", sans-serif; letter-spacing: .06em;
  color: #9ff8ff; background: rgba(4, 16, 30, .72); border: 2px solid #22e4ff;
  box-shadow: 0 0 10px rgba(34, 228, 255, .55), inset 0 0 8px rgba(34, 228, 255, .3); text-shadow: 0 0 6px #22e4ff;
}
.txtbtn[aria-pressed="false"] { color: #4d7f8c; border-color: #1f5a68; box-shadow: none; text-shadow: none; }
.txtbtn:focus-visible { outline: 2px solid #e8fbff; outline-offset: 3px; }
/* Axle event: the inverter pulses from its neon blue to neon yellow and back, every 1.6 s */
.axle { animation: axlePulse 1.6s ease-in-out infinite; }
@keyframes axlePulse {
  0%, 100% { filter: hue-rotate(0deg) saturate(1) brightness(1) drop-shadow(0 0 4px #22e4ff) drop-shadow(0 0 10px rgba(34, 228, 255, .6)); }
  50% { filter: hue-rotate(-132deg) saturate(1.8) brightness(1.35) drop-shadow(0 0 10px #ffe14a) drop-shadow(0 0 26px #ffd000); }
}
.twinkle { animation: twinkle 4s ease-in-out infinite; } @keyframes twinkle { 50% { opacity: .25; } }
.sunrays { animation: spin 40s linear infinite; transform-box: fill-box; transform-origin: center; } @keyframes spin { to { transform: rotate(360deg); } }
.drop { animation: fall linear infinite; } @keyframes fall { from { transform: translate(0, -140px); } to { transform: translate(-90px, 860px); } }
.flake { animation: snowfall linear infinite; }
@keyframes snowfall { 0% { transform: translate(0, -100px); } 25% { transform: translate(16px, 195px); } 50% { transform: translate(-8px, 410px); } 75% { transform: translate(18px, 625px); } 100% { transform: translate(2px, 840px); } }
.cloud { animation: drift linear infinite; } @keyframes drift { from { transform: translateX(-460px); } to { transform: translateX(1820px); } }
.fogband { animation: fogdrift ease-in-out infinite alternate; } @keyframes fogdrift { from { transform: translateX(-140px); } to { transform: translateX(140px); } }
.flash { opacity: 0; animation: flash 7.5s linear infinite; } @keyframes flash { 0%, 89%, 100% { opacity: 0; } 90% { opacity: .55; } 91% { opacity: .04; } 92.5% { opacity: .38; } 94% { opacity: 0; } }
.flow-glow { fill: none; stroke-linecap: round; stroke-linejoin: round; opacity: .45; filter: url(#flowGlow); }
.flow-base { fill: none; stroke-linecap: round; stroke-linejoin: round; opacity: .35; }
.flow-dash { fill: none; stroke-linecap: round; stroke-linejoin: round; animation: flowDash 1.1s linear infinite; } @keyframes flowDash { to { stroke-dashoffset: -24; } }
@media (prefers-reduced-motion: reduce) { .axle, .twinkle, .sunrays, .drop, .flake, .cloud, .fogband, .flash, .flow-dash { animation: none; } .axle { filter: hue-rotate(-132deg) saturate(1.8) brightness(1.35) drop-shadow(0 0 12px #ffe14a); } }
.warn { position: absolute; left: 10%; right: 2%; bottom: 3%; font: 12px/1.4 sans-serif; color: #ffd0d6; background: rgba(60,0,10,.7); padding: 4px 8px; border-radius: 6px; z-index: 3; }
`;
const MARKUP = `
<ha-card><div class="scene" id="scene">
<svg id="svg" viewBox="0 ${VTOP} ${VW} ${VH}" role="img" aria-label="Home energy scene">
<defs>
__DEFS__
<radialGradient id="moonFace" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e7ecf3"/><stop offset="1" stop-color="#b9c3d1"/></radialGradient>
<filter id="textGlow" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="a"/><feFlood flood-color="#22e4ff"/><feComposite in2="a" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<g id="stars"></g><g id="clouds"></g>
<image id="photoBg" preserveAspectRatio="none" display="none"/>
<g id="floor"></g><image id="holoBg" preserveAspectRatio="none" display="none"/>
<g id="flows"></g><g id="lightPools"></g>
<g class="hit" data-tap="garage"><image id="garageImg"/></g>
<g id="flowsUp"></g>
<g class="hit" data-tap="battery"><image id="batteryImg"/></g><g class="hit" data-tap="battery2"><image id="battery2Img"/></g>
<g id="socBars" pointer-events="none"></g>
<g class="hit" data-tap="inverter"><image id="inverterImg"/></g>
<g class="hit" data-tap="house"><image id="houseImg"/></g>
<g id="houseLights" pointer-events="none"></g>
<g class="hit" data-tap="meter"><image id="meterImg"/></g>
<g class="hit" data-tap="car"><image id="carImg"/></g>
<g id="chargerReal" pointer-events="none"></g><g id="carLights" pointer-events="none"></g><g id="flowsTop" pointer-events="none"></g>
<g id="sunLayer" pointer-events="none"></g><g id="precip" pointer-events="none"></g>
<g id="fixedText" pointer-events="none" filter="url(#textGlow)"></g>
</svg>
<svg id="overlay" viewBox="0 0 ${VW} ${VH}"><g id="textLayer" filter="url(#textGlow)"></g></svg>
<button class="txtbtn" id="txtBtn" type="button" aria-pressed="true" aria-label="Hide text">TEXT</button>
<div class="warn" id="warn" hidden></div>
</div></ha-card>`;

// ================================================================ the scene engine (same drawing as the design preview)
class Scene {
  constructor(root) {
    this.root = root;
    this.st = structuredClone(DEFAULT_LAYOUT); this.st.garage = { ...GARAGE_FIXED };
    this.view = "real"; this.assets = HERE; this.facing = 45; this.site = { lat: 51.5, lon: 0 };
    this.sky = { mode: "auto", night: false, weather: "sunny", horizon: null };
    this.flows = { house: false, pv: false, strings: false, pv1: false, pv2: false, ev: false, bat: ["off", "off"], grid: "off", soc: [0, 0], axle: false };
    this.batCount = 2; this.wxKey = ""; this.textOn = true;
  }
  $(id) { return this.root.getElementById(id); }
  P(x, y) { const st = this.st; return [st.ox + st.s * (AX * x + BX * y), st.oy + st.s * (AY * x + BY * y)]; }
  Qz(x, y, z) { const [a, b] = this.P(x, y); return [a, b - this.st.s * z]; }
  pts(arr) { return arr.map(p => this.Qz(...p).map(v => v.toFixed(1)).join(",")).join(" "); }
  url(href) { return this.assets + href; }

  drawFloor() {
    const real = this.view === "real";
    this.$("floor").innerHTML = ""; return;               // both views: the photo (or its traced hologram) is the ground
    if (real) return;
    const x0 = -5, x1 = 45, y0 = -61, y1 = 15, f = n => n.toFixed(1), P = (x, y) => this.P(x, y), nt = this.sky.night, st = this.st;
    const cp = [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)].map(p => p.map(f).join(",")).join(" "), ctr = P(6, 2), go = nt ? .035 : .06;
    let g = `<polygon points="${cp}" fill="url(#${nt ? "glossNight" : "glossDay"})"/>
      <ellipse cx="${f(ctr[0])}" cy="${f(ctr[1])}" rx="${f(st.s * 14)}" ry="${f(st.s * 5.5)}" fill="url(#pool)" opacity="${nt ? .3 : 1}"/>`;
    const back = [P(x0, y1), P(x1, y1)].map(p => p.map(f).join(",")).join(" ");
    g += `<polyline points="${back}" fill="none" stroke="${this.sky.horizon || "#0c1830"}" stroke-width="70" stroke-opacity="${nt ? .5 : .75}" filter="url(#hazeBlur)"/>`;
    this.$("floor").innerHTML = g;
  }

  drawWeather() {
    const sky = this.sky, w = WX[sky.weather] || WX.sunny, night = sky.night;
    const g = night ? (w.night || ["#050a16", "#03060d", "#010307"]) : w.day;
    const mix = (hex, t) => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return `rgb(${c.map(v => Math.round(v + (255 - v) * t)).join(",")})`; };
    const scene = this.$("scene");
    if (this.view === "real") {
      const base = g[1], lift = night ? .16 : .55;
      scene.style.background = `linear-gradient(180deg, ${mix(base, lift)} 0%, ${mix(base, lift * .55)} 12%, ${mix(base, lift * .2)} 24%, ${base} 34%, ${base} 100%)`;
    } else {
      const glow = night ? "radial-gradient(55% 50% at 50% 42%, rgba(20,40,80,.35) 0%, transparent 70%)" : "radial-gradient(60% 55% at 50% 40%, rgba(255,255,255,.18) 0%, transparent 70%)";
      // hologram: sky above the tree line, deep blue "floor" below it for the traced scene to glow against
      const floor = night ? ["#050c18", "#02060d"] : ["#0d2240", "#06101f"];
      scene.style.background = `${glow}, linear-gradient(180deg, ${g[0]} 0%, ${g[1]} 16%, ${g[2]} 30%, ${floor[0]} 52%, ${floor[1]} 100%)`;
    }
    this.$("sunLayer").setAttribute("opacity", w.sun);
    sky.horizon = g[2];
    const ft = { sunny: ["#173a62", "#0d2342", "#06101f"], partlycloudy: ["#183659", "#0e213d", "#06101e"] }[sky.weather] || ["#1e2733", "#121922", "#080c12"];
    ft.forEach((c, i) => this.$("gd" + i).setAttribute("stop-color", c));
    const key = sky.weather + night;
    if (key === this.wxKey) return;
    this.wxKey = key;
    const cc = w.cc[night ? 1 : 0];
    let c = "";
    for (let i = 0; i < w.clouds; i++) {
      const y = -45 + rnd(i, 1) * 200, sz = 150 + rnd(i, 2) * 170, dur = 110 + rnd(i, 3) * 80, op = (w.clouds > 6 ? .85 : .9) - rnd(i, 4) * .25;
      c += `<g class="cloud" style="animation-duration:${dur.toFixed(0)}s;animation-delay:${(-rnd(i, 5) * dur).toFixed(1)}s" opacity="${op.toFixed(2)}" filter="url(#cloudBlur)" fill="${cc}">
        <ellipse cx="0" cy="${y.toFixed(0)}" rx="${(sz * .5).toFixed(0)}" ry="${(sz * .15).toFixed(0)}"/>
        <circle cx="${(-sz * .18).toFixed(0)}" cy="${(y - sz * .07).toFixed(0)}" r="${(sz * .17).toFixed(0)}"/>
        <circle cx="${(sz * .05).toFixed(0)}" cy="${(y - sz * .13).toFixed(0)}" r="${(sz * .22).toFixed(0)}"/>
        <circle cx="${(sz * .26).toFixed(0)}" cy="${(y - sz * .05).toFixed(0)}" r="${(sz * .15).toFixed(0)}"/></g>`;
    }
    this.$("clouds").innerHTML = c;
    let p = "";
    if (w.p === "rain" || w.p === "pour" || w.p === "storm") {
      const n = w.p === "rain" ? 150 : 280, len = w.p === "rain" ? 16 : 24, base = w.p === "rain" ? .8 : .55, col = night ? "#9fb6cc" : "#e3f1ff";
      for (let i = 0; i < n; i++) {
        const x = rnd(i, 6) * 1500, dur = base + rnd(i, 7) * .35;
        p += `<line class="drop" x1="${x.toFixed(0)}" y1="0" x2="${(x - len * .11).toFixed(1)}" y2="${len}" stroke="${col}" stroke-opacity="${(.35 + rnd(i, 8) * .35).toFixed(2)}" stroke-width="1.1" stroke-linecap="round" style="animation-duration:${dur.toFixed(2)}s;animation-delay:${(-rnd(i, 9) * dur).toFixed(2)}s"/>`;
      }
    }
    if (w.p === "snow") for (let i = 0; i < 170; i++) {
      const x = rnd(i, 6) * 1440, dur = 7 + rnd(i, 7) * 7, r = .9 + rnd(i, 8) * 2.1;
      p += `<circle class="flake" cx="${x.toFixed(0)}" cy="0" r="${r.toFixed(1)}" fill="#ffffff" opacity="${(.55 + rnd(i, 10) * .4).toFixed(2)}" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${(-rnd(i, 9) * dur).toFixed(1)}s"/>`;
    }
    if (w.p === "fog") {
      const fc = night ? "#7f8b98" : "#eef2f5";
      [[380, 22], [470, 30], [560, 26], [660, 34]].forEach(([y, d], i) => {
        p += `<ellipse class="fogband" cx="680" cy="${y}" rx="900" ry="${55 + i * 8}" fill="${fc}" opacity="${night ? .16 : .3}" filter="url(#fogBlur)" style="animation-duration:${d}s;animation-delay:${-i * 5}s"/>`;
      });
    }
    if (w.p === "storm") p += `<rect class="flash" x="0" y="${VTOP}" width="${VW}" height="${VH}" fill="#e8f2ff"/>`;
    this.$("precip").innerHTML = p;
  }

  moonDisc(cx, cy, r, m, outline) {
    const k = m.lit, waxing = m.phase < .5, rx = Math.max(.01, r * Math.abs(1 - 2 * k));
    const top = `${cx.toFixed(1)},${(cy - r).toFixed(1)}`, bot = `${cx.toFixed(1)},${(cy + r).toFixed(1)}`;
    const limb = waxing ? 1 : 0, term = waxing ? (k < .5 ? 0 : 1) : (k < .5 ? 1 : 0);
    const lit = `M${top} A${r},${r} 0 0 ${limb} ${bot} A${rx.toFixed(1)},${r} 0 0 ${term} ${top}Z`;
    if (outline) return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="none" stroke="#e8eef4" stroke-opacity=".5" stroke-width="1.2"/><path d="${lit}" fill="none" stroke="#e8eef4" stroke-opacity=".9" stroke-width="1.4"/>`;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 2.6).toFixed(1)}" fill="#cfe0ff" opacity="${(.12 + .22 * k).toFixed(2)}" filter="url(#sunBlur)"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="#3b4658" opacity=".55"/><path d="${lit}" fill="url(#moonFace)"/>
      <circle cx="${(cx - r * .28).toFixed(1)}" cy="${(cy - r * .2).toFixed(1)}" r="${(r * .22).toFixed(1)}" fill="#9aa3b0" opacity=".25"/>
      <circle cx="${(cx + r * .3).toFixed(1)}" cy="${(cy + r * .3).toFixed(1)}" r="${(r * .15).toFixed(1)}" fill="#9aa3b0" opacity=".22"/>`;
  }

  drawSky(now, sunNow) {
    const sky = this.sky, { lat, lon } = this.site;
    const sun = sunNow || solarPos(now, lat, lon);
    sky.night = sky.mode === "night" || (sky.mode === "auto" && sun.el < -4);
    const clear = sky.weather === "sunny" || sky.weather === "partlycloudy";
    this.drawWeather();
    this.$("stars").innerHTML = sky.night && clear ? STARS.map(([x, y, r, dl]) => `<circle class="twinkle" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(2)}" fill="#dff6ff" opacity=".8" style="animation-delay:${dl}s"/>`).join("") : "";
    const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
    const path = [];
    for (let m = 0; m < 1440; m += 5) { const p = solarPos(new Date(day0.getTime() + m * 60000), lat, lon); if (p.el > -0.833) path.push({ m, ...p }); }
    const FRONT = this.facing, CX = 680, RX = 560, HY = 173, TOP = -37, SPAN = RX * Math.hypot(AX, BX);
    // compass bearing -> left/right: the true projection behind the house, carried on linearly past 90° so tracks never fold back
    const XU = az => { const d = ((az - (FRONT + 148) + 540) % 360) - 180, a = Math.abs(d), v = a <= 90 ? Math.sin(a * RAD) : 1 + (a - 90) / 90; return CX + Math.sign(d) * SPAN * v; };
    const X = az => Math.min(1310, Math.max(50, XU(az)));
    let g = "";
    if (path.length) {
      const azR = path[0].az, azS = path[path.length - 1].az, maxEl = Math.max(...path.map(p => p.el));
      const Y = el => HY - Math.max(el, 0) / maxEl * (HY - TOP);
      const nowM = now.getHours() * 60 + now.getMinutes(), seg = q => q.map(p => `${X(p.az).toFixed(1)},${Y(p.el).toFixed(1)}`).join(" ");
      const past = path.filter(p => p.m <= nowM), future = path.filter(p => p.m >= nowM - 5);
      g += `<g opacity="${sky.night ? .25 : 1}">
        <polyline points="${seg(path)}" fill="none" stroke="#ffc23a" stroke-opacity=".12" stroke-width="6" filter="url(#edgeGlow)"/>
        ${past.length > 1 ? `<polyline points="${seg(past)}" fill="none" stroke="#ffc23a" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/>` : ""}
        ${future.length > 1 ? `<polyline points="${seg(future)}" fill="none" stroke="#ffc23a" stroke-opacity=".4" stroke-width="1.2" stroke-dasharray="3 6" stroke-linecap="round"/>` : ""}
        <circle cx="${X(azR).toFixed(1)}" cy="${HY}" r="3" fill="#ffc23a" opacity=".7"/><circle cx="${X(azS).toFixed(1)}" cy="${HY}" r="3" fill="#ffc23a" opacity=".7"/></g>`;
      if (sun.el > -0.833 && !sky.night) {
        const sx = X(sun.az), sy = Y(sun.el), ray = (rIn, rOut, col, w, op) => Array.from({ length: 12 }, (_, i) => { const a = i * 30 * RAD, ro = i % 2 ? rOut - 4 : rOut; return `<line x1="${(sx + Math.cos(a) * rIn).toFixed(1)}" y1="${(sy + Math.sin(a) * rIn).toFixed(1)}" x2="${(sx + Math.cos(a) * ro).toFixed(1)}" y2="${(sy + Math.sin(a) * ro).toFixed(1)}" stroke="${col}" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>`; }).join("");
        g += (WX[sky.weather] || WX.sunny).outline
          ? `${ray(19, 27, "#e8eef4", 1.4, .8)}<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="14" fill="none" stroke="#e8eef4" stroke-opacity=".9" stroke-width="1.6"/>`
          : `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="34" fill="#ffb02e" opacity=".45" filter="url(#sunBlur)"/><g class="sunrays">${ray(19, 29, "#ffd773", 2, 1)}</g><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="14" fill="url(#sunDisc)"/>`;
      }
    }
    // moon: the pass containing now, or the next one
    const t0 = now.getTime(), mp = [];
    for (let m = -14 * 60; m <= 20 * 60; m += 10) mp.push({ m, ...moonPos(new Date(t0 + m * 60000), lat, lon) });
    const up = p => p.el > 0;
    let i = mp.findIndex(p => p.m >= 0), a = i, b = i;
    if (!up(mp[i])) { while (b < mp.length && !up(mp[b])) b++; a = b; }
    if (b < mp.length) {
      while (a > 0 && up(mp[a - 1])) a--;
      while (b < mp.length - 1 && up(mp[b + 1])) b++;
      const seg = mp.slice(a, b + 1), mEl = Math.max(...seg.map(p => p.el), 5);
      const MY = el => HY - Math.max(el, 0) / mEl * (HY - TOP) * .85, line = q => q.map(p => `${XU(p.az).toFixed(1)},${MY(p.el).toFixed(1)}`).join(" ");
      const past = seg.filter(p => p.m <= 0), fut = seg.filter(p => p.m >= -10);
      g += `<g opacity="${sky.night ? .9 : .35}">
        ${past.length > 1 ? `<polyline points="${line(past)}" fill="none" stroke="#c9d6ea" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/>` : ""}
        ${fut.length > 1 ? `<polyline points="${line(fut)}" fill="none" stroke="#c9d6ea" stroke-opacity=".35" stroke-width="1.1" stroke-dasharray="2 6" stroke-linecap="round"/>` : ""}</g>`;
      const mn = moonPos(now, lat, lon);
      if (mn.el > 0) g += `<g opacity="${sky.night ? 1 : .55}">${this.moonDisc(XU(mn.az), MY(mn.el), 12, mn, (WX[sky.weather] || {}).outline || sky.weather === "cloudy")}</g>`;
    }
    this.$("sunLayer").innerHTML = g;
  }

  drawLights() {
    const st = this.st, el = id => this.$(id);
    if (!this.sky.night) { el("houseLights").innerHTML = el("carLights").innerHTML = el("lightPools").innerHTML = ""; return; }
    const photo = this.view === "real", archTop = (x0, x1, z1, rise, n = 8) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, z1 + rise * (1 - (2 * i / n - 1) ** 2)]);
    const glass = [], dimGlass = [], pools = [], front = (x, z) => [x, -0.02, z];
    if (!photo) {                                       // hologram: light the windows; the dusk photo already has them lit
      for (const [x0, x1, lit] of [[1.3, 2.3, 1], [3.85, 4.6, .55], [5.4, 6.15, .55], [7.45, 8.55, 1]])
        (lit === 1 ? glass : dimGlass).push([[x0 + .07, 3.47], [x0 + .07, 4.83], ...archTop(x0 + .07, x1 - .07, 4.83, .12), [x1 - .07, 3.47]].map(([x, z]) => front(x, z)));
      for (const [x0, x1] of [[3.85, 4.75], [5.25, 6.15]]) {
        glass.push([[x0 + .06, 1.95], ...archTop(x0 + .06, x1 - .06, 2.23, .14), [x1 - .06, 1.95]].map(([x, z]) => front(x, z)));
        dimGlass.push([[x0 + .22, 1.05], [x0 + .22, 1.75], [x1 - .22, 1.75], [x1 - .22, 1.05]].map(([x, z]) => front(x, z)));
        pools.push([[x0 - .1, -.1], [x1 + .1, -.1], [x1 + .3, -1.2], [x0 - .3, -1.2]]);
      }
      for (const bx of [0.65, 6.85]) {
        const x1 = bx + 2.3;
        for (const [[ax, ay], [bx2, by]] of [[[bx + .3, -.6], [x1 - .3, -.6]], [[x1 - .3, -.6], [x1, 0]]]) {
          const L = Math.hypot(bx2 - ax, by - ay), n = Math.max(1, Math.round(L / .6)), ux = (bx2 - ax) / L, uy = (by - ay) / L;
          for (let i = 0; i < n; i++) { const u0 = L * i / n + .06, u1 = L * (i + 1) / n - .06; glass.push([[u0, .88], [u1, .88], [u1, 2.5], [u0, 2.5]].map(([u, z]) => [ax + ux * u, ay + uy * u - .01, z])); }
        }
        pools.push([[bx - .3, -.6], [x1 + .3, -.6], [x1 + 1.6, -3.6], [bx - 1.6, -3.6]]);
      }
    }
    const poly = (shape, fill, extra = "") => `<polygon points="${this.pts(shape)}" fill="${fill}" ${extra}/>`, r = st.s / 37.5;
    el("houseLights").innerHTML = `<g filter="url(#warmGlow)" opacity=".9">${glass.map(q => poly(q, "#ff9f3a")).join("")}${dimGlass.map(q => poly(q, "#ff9f3a", 'opacity=".5"')).join("")}</g>` +
      glass.map(q => poly(q, "url(#warmGlass)")).join("") + dimGlass.map(q => poly(q, "url(#warmGlass)", 'opacity=".55"')).join("");
    const [gcx, gcy] = this.Qz(st.garage.x + .58, st.garage.y - .02, 1.36);
    let floorGlow = pools.map(q => `<polygon points="${this.pts(q.map(([x, y]) => [x, y, 0]))}" fill="#ffae4f" opacity=".2" filter="url(#poolBlur)"/>`).join("");
    const sc = st.car.scale, C = (dx, dy, dz) => [st.car.x + dx * sc, st.car.y + dy * sc, dz * sc];
    const beam = k => `<polygon points="${this.pts([C(-.8, -2.3, 0), C(.8, -2.3, 0), C(2.6 * k, -2.3 - 7 * k, 0), C(-2.6 * k, -2.3 - 7 * k, 0)])}" fill="#d9f3ff" opacity="${.22 / k}" filter="url(#poolBlur)"/>`;
    floorGlow += beam(1) + beam(.55) + `<polygon points="${this.pts([C(-.9, 2.25, 0), C(.9, 2.25, 0), C(1.2, 3.4, 0), C(-1.2, 3.4, 0)])}" fill="#ff2a3a" opacity=".22" filter="url(#poolBlur)"/>`;
    el("lightPools").innerHTML = floorGlow;
    const strip = (xa, xb) => `<polyline points="${this.pts([C(xa, -2.25, .79), C(xb, -2.25, .77)])}" fill="none" stroke="#f2fcff" stroke-width="${(2.4 * r).toFixed(2)}" stroke-linecap="round"/>`;
    const halo = x => { const [a, b] = this.Qz(...C(x, -2.3, .78)); return `<circle cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="${(16 * r * sc).toFixed(1)}" fill="url(#lampGlow)" opacity=".75"/>`; };

    // realistic car: the lights sit on the photo itself (image pixels of car-real.svg), only the near-side lamp is visible
    const photoLights = (P0, k) => {
      const q = (px, py) => [(P0[0] + (px - 315) * k).toFixed(2), (P0[1] + (py - 255) * k).toFixed(2)];
      const poly = (pts, dx = 0, dy = 0) => pts.map(p => q(p[0] + dx, p[1] + dy).join(",")).join(" ");
      const u = v => (v * k).toFixed(2);
      // shapes traced on the photo with the headlight shaper (car photo px)
      const STRIP = [[226.9, 217.9], [229.8, 217.8], [232.7, 217.6], [237, 217.4], [241.2, 217.2], [245.5, 216.8], [250.2, 216.2], [255.7, 215.1], [261.6, 213.8], [261.5, 220.6], [259.6, 221.1], [257.6, 221.6], [255.4, 222.2], [253, 222.6], [250.5, 223.1], [247.9, 223.3], [245.3, 223.6], [242.7, 223.8], [238.7, 224.1], [234.6, 224.3], [226.7, 224.1]];
      const UPPER = [[255.8, 243.1], [256.4, 241], [258.4, 240.7], [259.5, 241.6], [259.6, 244.1], [259.8, 247], [258.1, 247], [256.9, 246.4], [256, 244.9]];
      const LOWER = [[255.8, 260.5], [256.4, 258.4], [258.4, 258.1], [259.5, 259], [259.6, 261.5], [259.8, 264.4], [258.1, 264.4], [256.9, 263.8], [256, 262.3]];
      let defs = `<filter id="hlLampGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="${u(3.2)}"/></filter>
        <filter id="hlStripGlow" x="-100%" y="-200%" width="300%" height="500%"><feMorphology operator="dilate" radius="${u(1.2)}"/><feGaussianBlur stdDeviation="${u(2.6)}"/></filter>
        <filter id="hlMaskSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${u(1)}"/></filter>`;
      let glow = "";
      // lamps: glow forwards only (west and south), none east of the lamp's right edge or north of its top edge
      [UPPER, LOWER].forEach((pts, i) => {
        const maxX = Math.max(...pts.map(p => p[0])), minY = Math.min(...pts.map(p => p[1]));
        const [cx, cy] = q(150, minY);
        defs += `<clipPath id="hlClip${i}"><rect x="${cx}" y="${cy}" width="${u(maxX - 150)}" height="${u(200)}"/></clipPath>`;
        glow += `<g clip-path="url(#hlClip${i})"><polygon points="${poly(pts, -3, 2.2)}" fill="#d9f3ff" opacity=".9" filter="url(#hlLampGlow)"/><polygon points="${poly(pts, -6.5, 4.6)}" fill="#e6f7ff" opacity=".55" filter="url(#hlLampGlow)"/></g>`;
      });
      // strip: glow on every side except north; the mask follows the strip's real top edge and fades at the ends
      const xs = STRIP.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      const topAt = x => { let best = Infinity;
        for (let i = 0; i < STRIP.length; i++) { const a = STRIP[i], b = STRIP[(i + 1) % STRIP.length];
          if ((x - a[0]) * (x - b[0]) > 0 || a[0] === b[0]) continue;
          best = Math.min(best, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])); }
        return best; };
      const env = [];
      for (let x = x0 + .3; x <= x1 - .3; x += .5) { const y = topAt(x); if (isFinite(y)) env.push([x, y + 1]); }
      const L = env[0], R = env[env.length - 1], E = 14;
      const mp = [[L[0] - E, L[1] + E * .9], [L[0] - 2, L[1] + 1.2], ...env, [R[0] + 2, R[1] + 1.2], [R[0] + E, R[1] + E * .9], [R[0] + E, 330], [L[0] - E, 330]];
      defs += `<mask id="hlStripMask" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="10000" height="10000"><polygon points="${poly(mp)}" fill="#fff" filter="url(#hlMaskSoft)"/></mask>`;
      glow += `<g mask="url(#hlStripMask)"><polygon points="${poly(STRIP)}" fill="#d9f3ff" opacity=".85" filter="url(#hlStripGlow)"/></g>`;
      const solid = pts => `<polygon points="${poly(pts)}" fill="#f2fcff" stroke="#f2fcff" stroke-width="${u(.3)}" stroke-linejoin="round"/>`;
      return `<defs>${defs}</defs>${glow}${solid(STRIP)}${solid(UPPER)}${solid(LOWER)}`;
    };
    const carL = photo ? photoLights(this.P(st.car.x, st.car.y), st.s / (66.5 / Math.hypot(0.6, 0.3)) * sc) : halo(.72) + strip(.56, .88);
    el("carLights").innerHTML = `<circle cx="${gcx.toFixed(1)}" cy="${gcy.toFixed(1)}" r="${(14 * r).toFixed(1)}" fill="url(#cyanGlow)"/>` + carL;
  }

  drawChargerReal() {
    const el = this.$("chargerReal");
    if (this.view !== "real") { el.innerHTML = ""; return; }
    const st = this.st, [ox, oy] = this.P(st.garage.x, st.garage.y - 0.015), k = st.s, nt = this.sky.night;
    el.innerHTML = `<g transform="matrix(${(AX * k).toFixed(4)},${(AY * k).toFixed(4)},0,${k.toFixed(4)},${ox.toFixed(2)},${oy.toFixed(2)})">
      <rect x=".42" y="-1.58" width=".38" height=".5" rx=".03" fill="#000" opacity=".25"/>
      <rect x=".4" y="-1.6" width=".38" height=".5" rx=".035" fill="${nt ? "#3a3f45" : "#e3e5e7"}"/>
      <rect x=".4" y="-1.6" width=".38" height=".05" rx=".02" fill="#fff" opacity="${nt ? .08 : .5}"/>
      <rect x=".74" y="-1.6" width=".04" height=".5" fill="#000" opacity=".18"/>
      <rect x=".46" y="-1.52" width=".26" height=".16" rx=".015" fill="#11161b"/>
      <circle cx=".59" cy="-1.22" r=".055" fill="none" stroke="#22e4ff" stroke-width=".018"/>
      <circle cx=".59" cy="-1.22" r=".11" fill="url(#cyanGlow)" opacity="${nt ? .9 : .45}"/>
      <rect x=".14" y="-1.48" width=".18" height=".26" rx=".015" fill="${nt ? "#2c3035" : "#9ea3a8"}"/>
      <rect x=".19" y="-1.38" width=".08" height=".06" fill="#c43c2c"/>
      <path d="M.59,-1.1 C.59,-.9 .52,-.85 .52,-.72" fill="none" stroke="#141414" stroke-width=".035"/>
      <ellipse cx=".58" cy="-.6" rx=".13" ry=".15" fill="none" stroke="#141414" stroke-width=".03"/>
      <ellipse cx=".59" cy="-.58" rx=".1" ry=".12" fill="none" stroke="#202020" stroke-width=".028"/>
      <rect x=".53" y="-.8" width=".1" height=".07" rx=".015" fill="#222"/></g>`;
  }

  trace(pts, color) {
    const Q = p => this.Qz(p[0], p[1], p[2] || 0), w = this.st.s / 37.5;
    const d = "M" + pts.map(p => Q(p).map(v => v.toFixed(1)).join(",")).join(" L"), [sx, sy] = Q(pts[0]), [ex, ey] = Q(pts[pts.length - 1]);
    return `<path d="${d}" class="flow-glow" stroke="${color}" stroke-width="${(6 * w).toFixed(2)}"/>
      <path d="${d}" class="flow-base" stroke="${color}" stroke-width="${(1.6 * w).toFixed(2)}"/>
      <path d="${d}" class="flow-dash" stroke="${color}" stroke-width="${(2.2 * w).toFixed(2)}" stroke-dasharray="8 16"/>
      <ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="${(5 * w).toFixed(1)}" ry="${(2.6 * w).toFixed(1)}" fill="${color}" opacity=".7" filter="url(#flowGlow)"/>
      <ellipse cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${(5 * w).toFixed(1)}" ry="${(2.6 * w).toFixed(1)}" fill="${color}" opacity=".7" filter="url(#flowGlow)"/>`;
  }

  drawFlows() {
    const st = this.st, fl = this.flows, bs = st.battery.scale;
    // inverter ports are spaced along its footprint in x and sit on its centre line in y, whichever way it faces,
    // so every line keeps the same route and direction as before
    const [ifw, ifd] = foot("inverter", st.inverter.o, st.inverter.scale), port = f => [st.inverter.x + ifw * f, st.inverter.y + ifd / 2];
    const meterPort = port(0.3), pvA = port(0.55), batPort = port(0.88);
    const [mfw, mfd] = foot("meter", st.meter.o, st.meter.scale), mtr = [st.meter.x + mfw / 2, st.meter.y + mfd / 2];
    const houseIn = [9.8, 0], houseLeft = [st.inverter.x, st.inverter.y + ifd / 2], laneX = st.inverter.x - 3.0;
    const csc = st.car.scale, carRight = st.car.x + 0.93 * csc, gx = st.garage.x + 5, gy = st.garage.y + 3;
    let g = "", up = "", top = "";
    // solar: one line from the garage whenever any string (or the total) is producing
    if (fl.pv) up += this.trace([[gx, gy, 2.5], [gx, gy, 0], [pvA[0], gy], pvA], COLORS.blue);
    if (fl.house) g += this.trace([houseLeft, [laneX, houseLeft[1]], [laneX, houseIn[1]], houseIn], COLORS.blue);
    if (fl.ev) {
      const chX = st.garage.x + 0.58, chY = st.garage.y - 0.03, side = carRight + 0.35, portY = st.car.y + 1.55 * csc;
      top = this.trace([[chX, chY, 1.15], [chX, chY, 0], [side, chY], [side, portY], [carRight, portY, 0.85 * csc]], COLORS.blue);
    }
    const gab = st.battery.o === "gable";
    for (let i = 0; i < this.batCount; i++) {
      const c = gab ? [st.battery.x + (BAT_D / 2 + i * 0.07) * bs, st.battery.y + (i * BAT_PITCH + BAT_W / 2) * bs]
                    : [st.battery.x + (i * BAT_PITCH + BAT_W / 2) * bs, st.battery.y + (BAT_D / 2 + i * 0.07) * bs];
      const link = [batPort, [batPort[0], c[1]], c];
      if (fl.bat[i] === "charge") g += this.trace(link, COLORS.green);
      if (fl.bat[i] === "discharge") g += this.trace(link.slice().reverse(), COLORS.red);
    }
    const mlink = [meterPort, [meterPort[0], mtr[1]], mtr];
    if (fl.grid === "export") g += this.trace(mlink, COLORS.green);
    if (fl.grid === "import") g += this.trace(mlink.slice().reverse(), COLORS.red);
    const tint = m => m === "charge" || m === "export" ? "url(#toGreen)" : m === "discharge" || m === "import" ? "url(#toRed)" : null;
    for (const [id, m] of [["batteryImg", fl.bat[0]], ["battery2Img", fl.bat[1]], ["meterImg", fl.grid]]) { const f = tint(m); f ? this.$(id).setAttribute("filter", f) : this.$(id).removeAttribute("filter"); }
    this.$("flows").innerHTML = g; this.$("flowsUp").innerHTML = up; this.$("flowsTop").innerHTML = top;
  }

  drawSoc() {
    const st = this.st, sc = st.battery.scale;
    const col = t => { for (let i = 1; i < SOC_STOPS.length; i++) { const [t0, c0] = SOC_STOPS[i - 1], [t1, c1] = SOC_STOPS[i]; if (t <= t1) { const k = (t - t0) / (t1 - t0); return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(",")})`; } } };
    let g = "", t = "";
    for (let u = 0; u < this.batCount; u++) {
      const soc = Math.max(0, Math.min(100, this.flows.soc[u] ?? 0)), lit = Math.round(soc / 10), ox = u * BAT_PITCH;
      const gab = st.battery.o === "gable", zb = 0.06 * sc, zt = (BAT_H - 0.08) * sc, step = (zt - zb) / 10, gap = step * 0.28;
      // bars on the tower's visible side: the +x face when it faces the street, the −y face when it faces the gable
      const A0 = gab ? [st.battery.x + 0.045 * sc, st.battery.y + ox * sc - 0.003] : [st.battery.x + (ox + BAT_W) * sc + 0.003, st.battery.y + 0.045 * sc];
      const A1 = gab ? [st.battery.x + (BAT_D - 0.045) * sc, A0[1]] : [A0[0], st.battery.y + (BAT_D - 0.045) * sc];
      for (let i = 0; i < 10; i++) {
        const z0 = zb + i * step, z1 = z0 + step - gap, c = col((i + 0.5) / 10);
        const p = [this.Qz(A0[0], A0[1], z0), this.Qz(A1[0], A1[1], z0), this.Qz(A1[0], A1[1], z1), this.Qz(A0[0], A0[1], z1)].map(q => q.map(v => v.toFixed(1)).join(",")).join(" ");
        g += i < lit ? `<polygon points="${p}" fill="${c}" fill-opacity=".9" filter="url(#barGlow)"/>` : `<polygon points="${p}" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-opacity=".35" stroke-width=".5"/>`;
      }
      // charge level painted on the battery front (fixed in the battery frame)
      if (this.textOn) {
        const gab = st.battery.o === "gable", k = st.s * sc, fb = 0.1 * (this.socTextSize || 1);
        const [ex, ey] = gab ? this.P(st.battery.x + BAT_D * sc + 0.003, st.battery.y + ox * sc) : this.P(st.battery.x + ox * sc, st.battery.y);
        const [da, db] = gab ? [BX, BY] : [AX, AY];
        t += `<g transform="matrix(${(da * k).toFixed(4)},${(db * k).toFixed(4)},0,${k.toFixed(4)},${ex.toFixed(2)},${ey.toFixed(2)})"><text class="neon" x="0.215" y="-0.27" font-size="${fb}" text-anchor="middle">${Math.round(soc)}<tspan font-size="${(fb * .55).toFixed(3)}" dx=".012">%</tspan></text></g>`;
      }
    }
    this.$("socBars").innerHTML = g; this.$("fixedText").innerHTML = t;
  }

  place(img, a, [px, py], scale = 1) {
    const k = this.st.s / a.k * scale, href = this.url(a.href);
    if (img.getAttribute("href") !== href) img.setAttribute("href", href);
    img.setAttribute("x", px + a.vbX * k); img.setAttribute("y", py + a.vbY * k);
    img.setAttribute("width", a.vbW * k); img.setAttribute("height", a.vbH * k);
  }

  render(now = new Date(), sunNow = null) {
    const st = this.st, V = VIEWS[this.view], $ = id => this.$(id), photo = this.view === "real";
    this.drawSky(now, sunNow); this.drawSoc(); this.drawFloor(); this.drawFlows();
    this.place($("houseImg"), V.house, [st.ox, st.oy]);
    this.place($("garageImg"), V.garage, this.P(st.garage.x, st.garage.y));
    const bo = st.battery.o === "gable" ? "gable" : "front", bsc = st.battery.scale;
    this.place($("batteryImg"), KIT.battery[bo], this.P(st.battery.x, st.battery.y), bsc);
    this.place($("battery2Img"), KIT.battery[bo], bo === "gable" ? this.P(st.battery.x, st.battery.y + BAT_PITCH * bsc) : this.P(st.battery.x + BAT_PITCH * bsc, st.battery.y), bsc);
    $("battery2Img").setAttribute("display", this.batCount === 2 ? "inline" : "none");
    // draw the further tower first: tower 2 is behind tower 1 when they stand along the gable
    const g1 = $("batteryImg").parentNode, g2 = $("battery2Img").parentNode;
    if (bo === "gable" && g2.nextSibling !== g1) g1.before(g2);
    if (bo === "front" && g1.nextSibling !== g2) g1.after(g2);
    this.place($("inverterImg"), KIT.inverter[st.inverter.o === "gable" ? "gable" : "front"], this.P(st.inverter.x, st.inverter.y), st.inverter.scale);
    this.place($("meterImg"), KIT.meter[st.meter.o === "gable" ? "gable" : "front"], this.P(st.meter.x, st.meter.y), st.meter.scale);
    this.place($("carImg"), V.car, this.P(st.car.x, st.car.y), st.car.scale);
    $("carImg").style.filter = photo && this.sky.night ? "url(#nightDim)" : "";
    $("houseImg").setAttribute("display", photo ? "none" : "inline");
    $("garageImg").setAttribute("display", photo ? "none" : "inline");
    $("inverterImg").classList.toggle("axle", !!this.flows.axle);
    const bg = $("photoBg"), hb = $("holoBg"), svg = $("svg");
    bg.setAttribute("display", photo ? "inline" : "none");
    hb.setAttribute("display", photo ? "none" : "inline");
    {   // hologram: the photo traced into cyan outlines, placed exactly where the photo would be
      const k = st.s / 70.9, href = this.url("photo-holo.webp");
      if (hb.getAttribute("href") !== href) hb.setAttribute("href", href);
      hb.setAttribute("x", (st.ox - 685 * k).toFixed(1)); hb.setAttribute("y", (st.oy - 888 * k).toFixed(1));
      hb.setAttribute("width", (2576 * k).toFixed(1)); hb.setAttribute("height", (1508 * k).toFixed(1));
      hb.setAttribute("opacity", this.sky.night ? ".75" : "1");
      // both views: never show past the photo — zoom the view in (same shape) until it is covered
      const bx = st.ox - 685 * k, by = st.oy - 888 * k, bw = 2576 * k, bh = 1508 * k;
      const fit = Math.min(1, bw / VW, (by + bh - VTOP) / VH), vw = VW * fit, vh = VH * fit;
      const vx = Math.max(bx, Math.min(0, bx + bw - vw)), vy = Math.min(VTOP + VH, by + bh) - vh;
      svg.setAttribute("viewBox", `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
      // the sky (sun and moon tracks, stars, clouds, weather) is laid out in card-frame units: keep it pinned to the visible frame
      const skyT = `translate(${vx.toFixed(2)} ${(vy - VTOP * fit).toFixed(2)}) scale(${fit.toFixed(5)})`;
      for (const id of ["stars", "clouds", "sunLayer", "precip"]) $(id).setAttribute("transform", skyT);
    }
    if (photo) {
      const k = st.s / 70.9, href = this.url(this.sky.night ? "photo-night.webp" : "photo-day.webp");
      if (bg.getAttribute("href") !== href) bg.setAttribute("href", href);
      const bx = st.ox - 685 * k, by = st.oy - 888 * k, bw = 2576 * k, bh = 1508 * k;
      bg.setAttribute("x", bx.toFixed(1)); bg.setAttribute("y", by.toFixed(1)); bg.setAttribute("width", bw.toFixed(1)); bg.setAttribute("height", bh.toFixed(1));
      bg.style.filter = { cloudy: "saturate(.9) brightness(.96)", rainy: "saturate(.75) brightness(.82)", pouring: "saturate(.65) brightness(.72)",
        "lightning-rainy": "saturate(.6) brightness(.66)", snowy: "saturate(.7) brightness(1.03)", fog: "saturate(.7) brightness(1.02) contrast(.85)" }[this.sky.weather] || "";
    }
    // the sun and moon sit behind the photo's trees, in front of everything in the hologram view
    const sl = $("sunLayer");
    if (photo && sl.nextSibling !== bg) bg.parentNode.insertBefore(sl, bg);
    if (!photo && sl.previousSibling !== $("flowsTop")) $("flowsTop").after(sl);
    this.drawLights(); this.drawChargerReal();
  }
}

const DEFS = `<defs>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0d1b33"/><stop offset=".55" stop-color="#081224"/><stop offset="1" stop-color="#03070f"/>
</linearGradient>
<radialGradient id="pool"><stop offset="0" stop-color="#1b3a66" stop-opacity=".55"/><stop offset="1" stop-color="#1b3a66" stop-opacity="0"/></radialGradient>
<filter id="edgeGlow"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="toGreen" color-interpolation-filters="sRGB"><feColorMatrix type="hueRotate" values="-50"/><feColorMatrix type="saturate" values="1.25"/></filter>
<filter id="toRed" color-interpolation-filters="sRGB"><feColorMatrix type="hueRotate" values="165"/><feColorMatrix type="saturate" values="1.6"/></filter>
<filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="nightDim" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".2 0 0 0 0  0 .25 0 0 .004  0 0 .36 0 .018  0 0 0 1 0"/></filter>
<filter id="warmGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="poolBlur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="sunBlur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9"/></filter>
<linearGradient id="warmGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b0"/><stop offset=".6" stop-color="#ffbd5e"/><stop offset="1" stop-color="#f39236"/></linearGradient>
<radialGradient id="lampGlow"><stop offset="0" stop-color="#fff4d6"/><stop offset=".25" stop-color="#ffc66e" stop-opacity=".85"/><stop offset="1" stop-color="#ff9a33" stop-opacity="0"/></radialGradient>
<radialGradient id="cyanGlow"><stop offset="0" stop-color="#bffaff"/><stop offset=".3" stop-color="#22e4ff" stop-opacity=".7"/><stop offset="1" stop-color="#22e4ff" stop-opacity="0"/></radialGradient>
<radialGradient id="sunDisc"><stop offset="0" stop-color="#fffbe8"/><stop offset=".55" stop-color="#ffd773"/><stop offset="1" stop-color="#ffaa2b"/></radialGradient>
<linearGradient id="glossDay" x1="0" y1="0" x2="0" y2="1"><stop id="gd0" offset="0" stop-color="#16304f"/><stop id="gd1" offset=".55" stop-color="#0c1c35"/><stop id="gd2" offset="1" stop-color="#050c18"/></linearGradient>
<filter id="hazeBlur" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="18"/></filter>
<linearGradient id="glossNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07101f"/><stop offset=".55" stop-color="#040a15"/><stop offset="1" stop-color="#010309"/></linearGradient>
<filter id="cloudBlur" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="fogBlur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="flowGlow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>`;

// ================================================================ value formatting
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const BAD = new Set(["unavailable", "unknown", "none", ""]);
function num(s) { const v = parseFloat(s?.state); return s && !BAD.has(String(s.state).toLowerCase()) && isFinite(v) ? v : null; }
function asW(s) { const v = num(s); if (v === null) return null; const u = (s.attributes.unit_of_measurement || "W").toLowerCase(); return u === "kw" ? v * 1000 : u === "mw" ? v * 1e6 : v; }
function asKWh(s) { const v = num(s); if (v === null) return null; const u = (s.attributes.unit_of_measurement || "kWh").toLowerCase(); return u === "wh" ? v / 1000 : u === "mwh" ? v * 1000 : v; }
function asDate(s) {
  if (!s || BAD.has(String(s.state).toLowerCase())) return null;
  const a = s.attributes || {};
  if (s.entity_id?.startsWith("input_datetime.") && a.timestamp) return new Date(a.timestamp * 1000);
  const d = new Date(s.state); return isNaN(d) ? null : d;
}
function asMinutes(s) {
  if (!s || BAD.has(String(s.state).toLowerCase())) return null;
  const st = String(s.state);
  const hm = st.match(/^(\d+):(\d{2})(?::(\d{2}))?$/); if (hm) return +hm[1] * 60 + +hm[2] + (+hm[3] || 0) / 60;
  const v = parseFloat(st);
  if (isFinite(v) && !/[-T]/.test(st.slice(1))) { const u = (s.attributes.unit_of_measurement || "min").toLowerCase(); return u.startsWith("h") ? v * 60 : u === "s" ? v / 60 : u === "d" ? v * 1440 : v; }
  const d = asDate(s); return d ? (d - Date.now()) / 60000 : null;
}
const n0 = v => Math.round(v).toLocaleString();
function formatLine(fmt, s) {
  if (!s) return null;
  switch (fmt) {
    case "W": { const w = asW(s); return w === null ? ["—", ""] : [n0(w), "W"]; }
    case "Wsigned": { const w = asW(s); return w === null ? ["—", ""] : [(Math.abs(w) < .5 ? "" : w > 0 ? "+" : "−") + n0(Math.abs(w)), "W"]; }
    case "kW": { const w = asW(s); return w === null ? ["—", ""] : [(w / 1000).toFixed(1), "kW"]; }
    case "kWh": { const e = asKWh(s); return e === null ? ["—", ""] : [e.toFixed(1), "kWh"]; }
    case "A": { const v = num(s); return v === null ? ["—", ""] : [v.toFixed(1), "A"]; }
    case "pct": { const v = num(s); return v === null ? ["—", ""] : [String(Math.round(v)), "%"]; }
    case "dur": { const m = asMinutes(s); if (m === null || m <= 0) return ["—", ""]; const h = Math.floor(m / 60), mm = Math.round(m % 60); return [h ? `${h}h ${String(mm).padStart(2, "0")}m` : `${mm}m`, ""]; }
    case "dt": {
      const d = asDate(s); if (!d) return ["—", ""];
      const today = new Date(); today.setHours(0, 0, 0, 0); const day = new Date(d); day.setHours(0, 0, 0, 0);
      const diff = Math.round((day - today) / 86400000), time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return [diff === 0 ? `Today ${time}` : diff === 1 ? `Tomorrow ${time}` : `${d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} ${time}`, ""];
    }
    default: { const st = String(s.state); return [st === "" ? "—" : OCPP[st] || st.charAt(0).toUpperCase() + st.slice(1).replace(/_/g, " "), ""]; }
  }
}

// ================================================================ entity suggestions for a new card
function suggest(hass) {
  const all = Object.values(hass.states), sensors = all.filter(s => s.entity_id.startsWith("sensor."));
  const name = s => (s.entity_id + " " + (s.attributes.friendly_name || "")).toLowerCase();
  const unit = s => (s.attributes.unit_of_measurement || "").toLowerCase();
  const isPower = s => s.attributes.device_class === "power" || /^(k?w)$/.test(unit(s));
  const isEnergy = s => s.attributes.device_class === "energy" || /^(k?wh)$/.test(unit(s));
  const isPct = s => s.attributes.device_class === "battery" || unit(s) === "%";
  const notPhone = /phone|iphone|pixel|galaxy|watch|tablet|ipad|airpod|remote|door|window|motion/;
  const isString = /(pv|dc|mppt|string)[ _]?[12](?![0-9])|string (one|two)/, isBat2 = /batt(ery)?[ _]?2(?![0-9])|battery two|second battery/;
  const pick = (pred, ...rx) => { for (const r of rx) { const hit = sensors.find(s => pred(s) && r.test(name(s))); if (hit) return hit.entity_id; } return undefined; };
  const out = {
    pv_power: pick(s => isPower(s) && !isString.test(name(s)), /(pv|solar).*total|total.*(pv|solar)/, /\b(pv|solar)\b.*power/),
    pv1_power: pick(isPower, /(pv|dc|mppt|string)[ _]?1(?![0-9])|string one/),
    pv2_power: pick(isPower, /(pv|dc|mppt|string)[ _]?2(?![0-9])|string two/),
    pv_energy_today: pick(isEnergy, /(pv|solar).*(today|daily)|(today|daily).*(pv|solar)|(pv|solar).*(yield|generation)/),
    load_power: pick(isPower, /house.*load|load.*power|home.*(power|consumption)|consumption/, /load/),
    battery_power: pick(s => isPower(s) && !isBat2.test(name(s)), /battery.*power|batt.*power/),
    battery_soc: pick(s => isPct(s) && !notPhone.test(name(s)) && !isBat2.test(name(s)), /battery.*soc|\bsoc\b|state of charge/),
    battery_charge_energy: pick(s => isEnergy(s) && !isBat2.test(name(s)), /battery.*charg.*(today|daily)|(today|daily).*battery.*charg/),
    battery_discharge_energy: pick(s => isEnergy(s) && !isBat2.test(name(s)), /battery.*discharg.*(today|daily)|(today|daily).*battery.*discharg/),
    battery2_power: pick(s => isPower(s) && isBat2.test(name(s)), /./),
    battery2_soc: pick(s => isPct(s) && isBat2.test(name(s)), /./),
    grid_power: pick(isPower, /grid.*power|meter.*power|grid.*active/, /grid/),
    grid_import_energy: pick(isEnergy, /(grid|meter).*import.*(today|daily)|(today|daily).*import|import.*today/),
    grid_export_energy: pick(isEnergy, /(grid|meter).*export.*(today|daily)|(today|daily).*export|export.*today/),
    ev_power: pick(isPower, /charger|wallbox|zappi|ohme|easee|ocpp|\bev\b/),
    charger_current: pick(s => unit(s) === "a", /charger|ocpp|wallbox|\bev\b/),
    charger_status: pick(s => !isPower(s), /connector.*status|status.*connector|ocpp.*status/),
    charger_session_energy: pick(isEnergy, /session|transaction/),
    car_soc: pick(isPct, /jaecoo|j7|car.*battery|ev.*(soc|battery)/),
    axle_start: pick(() => true, /axle.*(start|begin)/),
    axle_end: pick(() => true, /axle.*(end|finish|stop)/),
    weather: all.find(s => s.entity_id.startsWith("weather."))?.entity_id
  };
  Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
  return out;
}

// ================================================================ the card
class BaughHomeCard extends HTMLElement {
  static getConfigElement() { return document.createElement("baugh-home-card-editor"); }
  static getStubConfig(hass) { return { view: "realistic", house_facing: 45, threshold: 20, battery_count: 2, ...suggest(hass) }; }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { view: "realistic", house_facing: 45, threshold: 20, day_night: "auto", sun_entity: "sun.sun", axle_lead: 60, ...config };
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>${STYLE}</style>${MARKUP.replace("__DEFS__", DEFS)}`;
      this._scene = new Scene(this.shadowRoot);
      this.shadowRoot.querySelectorAll("[data-tap]").forEach(el => el.addEventListener("click", () => this._tap(el.dataset.tap)));
      this.shadowRoot.getElementById("txtBtn").addEventListener("click", () => {
        this._textOn = !this._textOn;
        try { localStorage.setItem(this._textKey(), this._textOn ? "1" : "0"); } catch (e) {}
        this._update(true);
      });
      this._bad = new Set();
      this.shadowRoot.querySelectorAll("image").forEach(img => {
        img.addEventListener("error", () => { if (img.getAttribute("href")) { this._bad.add(img.getAttribute("href")); this._showWarn(); } });
        img.addEventListener("load", () => { this._bad.delete(img.getAttribute("href")); this._showWarn(); });
      });
    }
    const sc = this._scene, c = this._config;
    sc.view = c.view === "hologram" ? "holo" : "real";
    sc.facing = Number(c.house_facing) || 0;
    sc.assets = c.asset_path ? (c.asset_path.endsWith("/") ? c.asset_path : c.asset_path + "/") : HERE;
    sc.sky.mode = c.day_night || "auto";
    sc.batCount = Number(c.battery_count) === 1 ? 1 : 2;
    sc.socTextSize = Number(c.battery_soc_text_size) || 1;
    const L = c.layout || {};
    sc.st = structuredClone(DEFAULT_LAYOUT);                // the scene itself is fixed; only the kit and car move
    for (const k of ["car", "battery", "inverter", "meter"]) sc.st[k] = { scale: 1, ...DEFAULT_LAYOUT[k], ...(L[k] || {}) };
    sc.st.garage = { ...GARAGE_FIXED };
    let saved = null; try { saved = localStorage.getItem(this._textKey()); } catch (e) {}
    this._textOn = saved === null ? c.show_text !== false : saved === "1";
    this._sig = null;
    if (this._hass) this._update(true);
  }
  _textKey() { return "baugh-home-text-" + (this._config?.title || "card"); }

  set hass(hass) { this._hass = hass; this._update(false); }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: "full", min_columns: 6, rows: 8 }; }
  connectedCallback() { this._timer = setInterval(() => this._update(true), 60000); }
  disconnectedCallback() { clearInterval(this._timer); }

  _update(force) {
    const hass = this._hass, c = this._config, sc = this._scene;
    if (!hass || !c || !sc) return;
    const S = id => (id ? hass.states[id] : undefined), th = Number(c.threshold) || 0;
    const pv = asW(S(c.pv_power)), pv1 = asW(S(c.pv1_power)), pv2 = asW(S(c.pv2_power)), load = asW(S(c.load_power)), ev = asW(S(c.ev_power));
    const flip = v => v !== null && c.invert_battery ? -v : v;
    const bat = flip(asW(S(c.battery_power))), bat2 = c.battery2_power ? flip(asW(S(c.battery2_power))) : bat;
    let grid = asW(S(c.grid_power)); if (grid !== null && c.invert_grid) grid = -grid;
    if (grid === null && (c.grid_import_power || c.grid_export_power)) grid = (asW(S(c.grid_import_power)) || 0) - (asW(S(c.grid_export_power)) || 0);
    const soc = num(S(c.battery_soc)), soc2 = c.battery2_soc ? num(S(c.battery2_soc)) : soc;
    const mode = b => b === null || Math.abs(b) <= th ? "off" : b > 0 ? "charge" : "discharge";
    // Axle: pulse while the event is on, or from `axle_lead` minutes before it starts until it ends
    const ae = S(c.axle_event), aStart = asDate(S(c.axle_start)), aEnd = asDate(S(c.axle_end)), nowMs = Date.now(), lead = (Number(c.axle_lead) || 0) * 60000;
    const axle = (ae && ["on", "true", "active"].includes(String(ae.state).toLowerCase())) || (!!aStart && nowMs >= aStart - lead && (!aEnd || nowMs <= aEnd));
    const strings = !!(c.pv1_power || c.pv2_power);
    sc.flows = {
      pv: (pv !== null && pv > th) || (pv1 !== null && pv1 > th) || (pv2 !== null && pv2 > th),
      house: load !== null && load > th, ev: ev !== null && ev > th,
      bat: [mode(bat), mode(bat2)], grid: grid === null || Math.abs(grid) <= th ? "off" : grid > 0 ? "import" : "export",
      soc: [soc ?? 0, soc2 ?? 0], axle
    };
    const wx = S(c.weather);
    sc.sky.weather = WX_MAP[wx?.state] || (wx ? "cloudy" : "sunny");
    sc.site = { lat: hass.config?.latitude ?? 51.5, lon: hass.config?.longitude ?? 0 };
    sc.textOn = this._textOn;
    const sunE = S(c.sun_entity), sunNow = sunE && sunE.attributes.elevation !== undefined ? { el: Number(sunE.attributes.elevation), az: Number(sunE.attributes.azimuth) } : null;
    // the text values, formatted
    const text = this._textOn ? this._buildText(S) : "";
    const configured = Object.values(TEXT_GROUPS).flatMap(g => g.lines.map(l => l.key)).concat(["pv_power", "battery_soc", "battery2_soc", "grid_import_power", "grid_export_power", "weather", "axle_event"]);
    const missing = [...new Set(configured)].filter(k => c[k] && !hass.states[c[k]]).map(k => c[k]);
    const sig = JSON.stringify([sc.flows, sc.sky.weather, sunNow && Math.round(sunNow.el * 2), text, missing, this._textOn]);
    if (!force && sig === this._sig) return;
    this._sig = sig;
    sc.render(new Date(), sunNow);
    this.shadowRoot.getElementById("textLayer").innerHTML = text;
    const btn = this.shadowRoot.getElementById("txtBtn");
    btn.setAttribute("aria-pressed", this._textOn); btn.setAttribute("aria-label", this._textOn ? "Hide text" : "Show text");
    this._missing = missing; this._showWarn();
  }

  _buildText(S) {
    const c = this._config, T = c.text || {}, labels = c.labels || {};
    let out = "";
    for (const [gid, g] of Object.entries(TEXT_GROUPS)) {
      if ((gid === "battery2" || gid === "battery2_power") && Number(c.battery_count) === 1) continue;
      const pos = { x: g.x, y: g.y, size: g.size, ...(T[gid] || {}) }, fs = BASE_FONT * pos.size;
      const rows = [];
      for (const ln of g.lines) {
        const id = c[ln.key]; if (!id) continue;
        const s = S(id), v = formatLine(ln.fmt, s); if (!v) continue;
        let lab = labels[ln.key];
        if (lab === undefined || lab === "") lab = ln.label;
        else if (lab === "*") lab = s?.attributes?.friendly_name || ln.label;
        else if (lab === "-") lab = "";
        rows.push([lab, v[0], v[1]]);
      }
      if (!rows.length) continue;
      const x = pos.x / 100 * VW, y = pos.y / 100 * VH, or = pos.or || g.or || "flat";
      // lie the text on the same planes as the scene: front faces run (0.96, 0.24), side faces (0.6, -0.3); verticals stay upright
      const [a, b] = or === "front" ? [AX, AY] : or === "side" ? [BX, BY] : [1, 0];
      out += `<g transform="matrix(${a},${b},0,1,${x.toFixed(1)},${y.toFixed(1)})">` + rows.map(([lab, val, u], i) =>
        `<text class="neon" y="${(i * fs * 1.25).toFixed(1)}" font-size="${fs.toFixed(1)}">${lab ? `<tspan class="lbl" font-size="${(fs * .78).toFixed(1)}">${esc(lab)} </tspan>` : ""}${esc(val)}${u ? `<tspan font-size="${(fs * .55).toFixed(1)}" dx="${(fs * .12).toFixed(1)}">${u}</tspan>` : ""}</text>`).join("") + `</g>`;
    }
    return out;
  }

  _showWarn() {
    const w = this.shadowRoot?.getElementById("warn"); if (!w) return;
    const msgs = [];
    if (this._missing?.length) msgs.push(`Entity not found: ${this._missing.join(", ")}`);
    if (this._bad?.size) msgs.push(`Images not found in ${this._scene.assets} — keep the .svg and .webp files beside baugh-home-card.js.`);
    w.hidden = !msgs.length; w.textContent = msgs.join("  ·  ");
  }

  _tap(part) {
    const c = this._config;
    const id = { battery: c.battery_soc || c.battery_power, battery2: c.battery2_soc || c.battery2_power || c.battery_soc, inverter: c.pv_power || c.pv1_power,
      house: c.load_power, meter: c.grid_power || c.grid_import_power, car: c.car_soc || c.ev_power, garage: c.charger_status || c.ev_power }[part];
    if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true }));
  }
}

// ================================================================ the visual editor
const ent = (domain) => ({ entity: domain ? { domain } : {} });
const slider = (min, max, step, unit) => ({ number: { min, max, step, mode: "slider", unit_of_measurement: unit } });
const MOVABLE = [["car", "Car"], ["battery", "Batteries"], ["inverter", "Inverter"], ["meter", "Meter"]];
const LINE_DOMAIN = { dt: undefined, state: undefined };
function textGroupSchema(gid) {
  const g = TEXT_GROUPS[gid];
  return { type: "expandable", name: `tg_${gid}_group`, flatten: true, title: `Text: ${g.title}`, icon: "mdi:format-text", schema: [
    ...g.lines.flatMap(l => [{ type: "grid", name: "", schema: [
      { name: l.key, selector: ent(l.fmt === "dt" || l.fmt === "state" ? undefined : "sensor") },
      { name: `label_${l.key}`, selector: { text: {} } } ] }]),
    { name: `txt_${gid}_or`, selector: { select: { mode: "dropdown", options: [{ value: "front", label: "Along the house front" }, { value: "side", label: "Along the side wall" }, { value: "flat", label: "Upright (no slant)" }] } } },
    { type: "grid", name: "", schema: [
      { name: `txt_${gid}_x`, selector: slider(0, 100, .5, "%") },
      { name: `txt_${gid}_y`, selector: slider(0, 100, .5, "%") },
      { name: `txt_${gid}_size`, selector: slider(.4, 3, .05, "×") } ] } ] };
}
function editorSchema(cfg) {
  const two = Number(cfg.battery_count ?? 2) === 2;
  return [
    { type: "expandable", name: "flow_group", flatten: true, title: "Power lines", icon: "mdi:transmission-tower", expanded: true, schema: [
      { name: "pv_power", selector: ent("sensor") },
      { name: "battery_count", selector: { select: { mode: "list", options: [{ value: "1", label: "One battery" }, { value: "2", label: "Two batteries" }] } } },
      { type: "grid", name: "", schema: [{ name: "battery_soc", selector: ent("sensor") }, ...(two ? [{ name: "battery2_soc", selector: ent("sensor") }] : [])] },
      { type: "grid", name: "", schema: [{ name: "invert_battery", selector: { boolean: {} } }, { name: "invert_grid", selector: { boolean: {} } }] },
      { type: "grid", name: "", schema: [{ name: "grid_import_power", selector: ent("sensor") }, { name: "grid_export_power", selector: ent("sensor") }] } ] },
    textGroupSchema("meter_power"), textGroupSchema("meter_energy"), textGroupSchema("pv_strings"), textGroupSchema("pv_total"),
    textGroupSchema("battery1_power"), textGroupSchema("battery1"), ...(two ? [textGroupSchema("battery2_power"), textGroupSchema("battery2")] : []), textGroupSchema("house_load"), textGroupSchema("car_soc"),
    textGroupSchema("charger_status"), textGroupSchema("charger"),
    { ...textGroupSchema("axle"), schema: [...textGroupSchema("axle").schema,
      { type: "grid", name: "", schema: [{ name: "axle_event", selector: ent() }, { name: "axle_lead", selector: { number: { min: 0, max: 720, step: 5, mode: "box", unit_of_measurement: "min" } } }] }] },
    { type: "expandable", name: "sky_group", flatten: true, title: "Weather, sun and moon", icon: "mdi:weather-partly-cloudy", schema: [
      { type: "grid", name: "", schema: [{ name: "weather", selector: ent("weather") }, { name: "sun_entity", selector: ent("sun") }] },
      { name: "house_facing", selector: { number: { min: 0, max: 359, step: 1, mode: "box", unit_of_measurement: "°" } } },
      { name: "day_night", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Follow the sun" }, { value: "day", label: "Always day" }, { value: "night", label: "Always night" }] } } } ] },
    { type: "expandable", name: "layout_group", flatten: true, title: "Layout", icon: "mdi:arrow-all", schema: [
      ...MOVABLE.map(([k, title]) => ({ type: "expandable", name: `lay_${k}_group`, flatten: true, title, schema: [
        ...(k === "battery" ? [{ name: "battery_soc_text_size", selector: slider(.5, 2.5, .05, "×") }] : []),
        ...(k === "car" ? [] : [{ name: `lay_${k}_o`, selector: { select: { mode: "list", options: [{ value: "front", label: "Facing the street (as the house front)" }, { value: "gable", label: "Facing the gable end" }] } } }]),
        { name: `lay_${k}_x`, selector: slider(-25, 40, .1, "m") }, { name: `lay_${k}_y`, selector: slider(-25, 25, .1, "m") }, { name: `lay_${k}_scale`, selector: slider(.5, 4, .05, "×") } ] })) ] },
    { type: "expandable", name: "look_group", flatten: true, title: "Appearance", icon: "mdi:palette", schema: [
      { name: "view", selector: { select: { mode: "dropdown", options: [{ value: "realistic", label: "Realistic" }, { value: "hologram", label: "Hologram" }] } } },
      { name: "show_text", selector: { boolean: {} } },
      { name: "threshold", selector: { number: { min: 0, max: 500, step: 5, mode: "box", unit_of_measurement: "W" } } },
      { name: "asset_path", selector: { text: {} } } ] }
  ];
}
const KEY_LABELS = {
  pv_power: "Solar power total (for the line, optional)", battery_count: "Number of batteries", battery_soc_text_size: "Charge % text size (on the battery fronts)", battery_soc: "Battery 1 charge level", battery2_soc: "Battery 2 charge level",
  invert_battery: "Battery power sign reversed", invert_grid: "Grid power sign reversed", grid_import_power: "Grid import power (if no single grid sensor)", grid_export_power: "Grid export power (if no single grid sensor)",
  grid_power: "Grid power (+ import, − export)", grid_import_energy: "Imported today", grid_export_energy: "Exported today", pv1_power: "String 1 power", pv2_power: "String 2 power",
  pv_energy_today: "Solar energy today", battery_power: "Battery 1 power (+ charging)", battery_charge_energy: "Battery 1 charged today", battery_discharge_energy: "Battery 1 discharged today",
  battery_time_to_full: "Battery 1 time to full", battery_time_to_empty: "Battery 1 time to empty", battery2_power: "Battery 2 power (+ charging)", battery2_charge_energy: "Battery 2 charged today",
  battery2_discharge_energy: "Battery 2 discharged today", battery2_time_to_full: "Battery 2 time to full", battery2_time_to_empty: "Battery 2 time to empty", load_power: "House power use",
  car_soc: "Car charge level", charger_status: "Charger connector status", charger_current: "Charger current", ev_power: "Charger power", charger_session_energy: "Charging session energy",
  axle_start: "Axle event start", axle_end: "Axle event end", axle_event: "Axle event active (optional on/off entity)", axle_lead: "Start pulsing before the event",
  weather: "Weather", sun_entity: "Sun", house_facing: "Direction the front of the house faces", day_night: "Day and night", view: "Style", show_text: "Show text by default",
  threshold: "Ignore power below", asset_path: "Image folder"
};
const LABELS = { ...KEY_LABELS, lay_scene_ox: "Move left / right", lay_scene_oy: "Move up / down", lay_scene_s: "Zoom" };
for (const [k] of MOVABLE) LABELS[`lay_${k}_o`] = "Which way it faces";
for (const [k] of MOVABLE) Object.assign(LABELS, { [`lay_${k}_x`]: "Along the house front (− left, + right)", [`lay_${k}_y`]: "Front to back (− forward, + back)", [`lay_${k}_scale`]: "Size" });
for (const [gid] of Object.entries(TEXT_GROUPS)) Object.assign(LABELS, { [`txt_${gid}_or`]: "Text direction", [`txt_${gid}_x`]: "Across (%)", [`txt_${gid}_y`]: "Down (%)", [`txt_${gid}_size`]: "Text size" });
for (const g of Object.values(TEXT_GROUPS)) for (const l of g.lines) LABELS[`label_${l.key}`] = "Label (default none)";
const HELPERS = {
  battery_count: "Each battery gets its own line, colour and charge bars.",
  house_facing: "Compass bearing: 0 north, 90 east, 180 south, 270 west. North-east is 45.",
  threshold: "Lines show as idle when power is below this.", axle_lead: "The inverter pulses from this long before the start until the end.",
  asset_path: "Leave empty to use the folder baugh-home-card.js was loaded from."
};
for (const g of Object.values(TEXT_GROUPS)) for (const l of g.lines) HELPERS[`label_${l.key}`] = "Empty = no label · * = the entity's name · or type your own";
const LAYOUT_KEYS = MOVABLE.flatMap(([k]) => ["x", "y", "scale"].map(f => [k, f, `lay_${k}_${f}`]));
const SCENE_KEYS = ["ox", "oy", "s"].map(f => [f, `lay_scene_${f}`]);

class BaughHomeCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = s => LABELS[s.name] || s.title || s.name;
      this._form.computeHelper = s => HELPERS[s.name];
      this._form.addEventListener("value-changed", ev => {
        ev.stopPropagation();
        const v = { ...ev.detail.value };
        const unnest = o => { for (const k of Object.keys(o)) if (k.endsWith("_group") && o[k] && typeof o[k] === "object") { const inner = o[k]; delete o[k]; unnest(inner); Object.assign(o, inner); } };
        unnest(v);
        const layout = {};
        for (const [k, f, key] of LAYOUT_KEYS) { if (v[key] !== undefined && Math.abs(v[key] - (DEFAULT_LAYOUT[k][f] ?? 1)) > 1e-6) (layout[k] ||= {})[f] = v[key]; delete v[key]; }
        for (const [k] of MOVABLE) { const key = `lay_${k}_o`; if (v[key] === "gable") (layout[k] ||= {}).o = "gable"; delete v[key]; }
        for (const [, key] of SCENE_KEYS) delete v[key];
        for (const [f, key] of []) { if (v[key] !== undefined && Math.abs(v[key] - DEFAULT_LAYOUT[f]) > 1e-6) layout[f] = v[key]; delete v[key]; }
        if (Object.keys(layout).length) v.layout = layout; else delete v.layout;
        const text = {}, labels = {};
        for (const [gid, g] of Object.entries(TEXT_GROUPS)) {
          for (const f of ["x", "y", "size"]) {
            const key = `txt_${gid}_${f}`;
            if (v[key] !== undefined && Math.abs(v[key] - g[f]) > 1e-6) (text[gid] ||= {})[f] = v[key];
            delete v[key];
          }
          const ok = `txt_${gid}_or`;
          if (v[ok] && v[ok] !== g.or) (text[gid] ||= {}).or = v[ok];
          delete v[ok];
        }
        for (const g of Object.values(TEXT_GROUPS)) for (const l of g.lines) { const key = `label_${l.key}`; if (v[key] !== undefined && v[key] !== "") labels[l.key] = v[key]; delete v[key]; }
        if (Object.keys(text).length) v.text = text; else delete v.text;
        if (Object.keys(labels).length) v.labels = labels; else delete v.labels;
        if (v.battery_count !== undefined) v.battery_count = Number(v.battery_count);
        for (const k of Object.keys(v)) if (v[k] === "" || v[k] === undefined || v[k] === null) delete v[k];
        this._config = { ...v, type: this._config.type };
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
        this._render();
      });
      this.appendChild(this._form);
    }
    const c = this._config, data = { battery_soc_text_size: 1, house_facing: 45, threshold: 20, view: "realistic", day_night: "auto", sun_entity: "sun.sun", show_text: true, axle_lead: 60, ...c };
    data.battery_count = String(c.battery_count ?? 2);
    delete data.layout; delete data.text; delete data.labels;
    for (const [k, f, key] of LAYOUT_KEYS) data[key] = c.layout?.[k]?.[f] ?? DEFAULT_LAYOUT[k][f] ?? 1;
    for (const [f, key] of SCENE_KEYS) data[key] = c.layout?.[f] ?? DEFAULT_LAYOUT[f];
    for (const [k] of MOVABLE) if (k !== "car") data[`lay_${k}_o`] = c.layout?.[k]?.o ?? "front";
    for (const [gid, g] of Object.entries(TEXT_GROUPS)) { for (const f of ["x", "y", "size"]) data[`txt_${gid}_${f}`] = c.text?.[gid]?.[f] ?? g[f]; data[`txt_${gid}_or`] = c.text?.[gid]?.or ?? g.or; }
    for (const g of Object.values(TEXT_GROUPS)) for (const l of g.lines) data[`label_${l.key}`] = c.labels?.[l.key] ?? "";
    this._form.hass = this._hass; this._form.data = data; this._form.schema = editorSchema(c);
  }
}

customElements.define("baugh-home-card", BaughHomeCard);
customElements.define("baugh-home-card-editor", BaughHomeCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "baugh-home-card", name: "Baugh Home", description: "Animated home energy scene: solar, batteries, grid, car, charger, weather, sun and moon.", preview: false });
console.info(`%c BAUGH-HOME-CARD %c ${CARD_VERSION} `, "color:#071019;background:#22e4ff;font-weight:700", "color:#22e4ff;background:#071019");
