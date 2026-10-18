// The town clock (v1.4). Pure: one game minute passes for every real second
// you spend exploring; menus, talks and congkak stop it. From Maghrib you can
// sleep at home, which skips to Subuh of the next day. Past midnight the clock
// waits at 23:59 until you go home.
export const MINUTES_PER_SECOND = 1;
export const WAKE = 6 * 60;           // Subuh: where every new day starts
export const NEW_GAME = 14 * 60;      // Chapter 01 starts on the first afternoon
export const BEDTIME = 19 * 60 + 30;  // from Maghrib you may sleep
export const LATEST = 24 * 60 - 1;
// Day 1 of the holidays is a Saturday.
export const WEEKDAYS = ['Sabtu', 'Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];
export const PERIODS = [[0, 'Malam'], [5 * 60 + 45, 'Subuh'], [7 * 60, 'Pagi'], [12 * 60, 'Tengah hari'], [14 * 60, 'Petang'], [19 * 60 + 15, 'Maghrib'], [20 * 60 + 30, 'Isyak'], [21 * 60 + 30, 'Malam']];
// When each NPC is at their post, [from, to] in minutes. Everyone else keeps
// the default. Off duty they are at home: shops close, and friends who spend
// the afternoon at the padang answer at their own door instead.
export const HOURS = {
  default: [7 * 60, 19 * 60 + 15],
  din: [6 * 60 + 30, 21 * 60],        // the kiosk sells snacks into the evening
  ita: [7 * 60, 22 * 60],             // warung and pasar malam
  hassan: [5 * 60 + 30, 21 * 60 + 30], // Subuh to Isyak at the masjid
  nenek: [6 * 60 + 30, 21 * 60 + 30], // on her own veranda
  usop: [16 * 60, 22 * 60 + 30]       // sets up the pasar malam from late afternoon
};

export const newClock = () => ({ day: 1, minute: NEW_GAME });
export function cleanClock(value) {
  const day = value?.day, minute = value?.minute;
  if (!Number.isInteger(day) || day < 1 || day > 99999 || !Number.isFinite(minute) || minute < 0 || minute > LATEST) return newClock();
  return { day, minute };
}
export function tickClock(clock, seconds) {
  if (seconds > 0) clock.minute = Math.min(LATEST, clock.minute + seconds * MINUTES_PER_SECOND);
  return clock;
}
export const canSleep = minute => minute >= BEDTIME || minute < 5 * 60 + 45;
export function sleep(clock) { if (clock.minute >= BEDTIME) clock.day += 1; clock.minute = WAKE; return clock; }
export const weekday = day => WEEKDAYS[(day - 1) % 7];
// The calendar (v2.15): day 1 is Saturday 2 June 2001, early in the mid-year
// school holidays, so the weekday and the date always agree.
export const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];
export function dateLabel(day) { const d = new Date(Date.UTC(2001, 5, day + 1)); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
export const timeLabel = minute => { const m = Math.floor(minute); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export function period(minute) { let name = PERIODS[0][1]; for (const [from, label] of PERIODS) if (minute >= from) name = label; return name; }
export const isNight = minute => minute >= 19 * 60 + 30 || minute < 6 * 60 + 15;
export function onDuty(key, minute) { const [from, to] = HOURS[key] || HOURS.default; return minute >= from && minute < to; }
// The friendship "once a day" key, by game day rather than the real date.
export const dayKey = clock => `H${clock.day}`;

// Light through the day: sun or moon colour and strength, sky and ground
// fill, fog, the sky colour, a tint over the painted horizon and how brightly
// windows glow. Values between keyframes are blended.
const KEYS = [
  [0, { sun: 0x8aa0e0, sunI: .38, sky: 0x40508a, ground: 0x1e2632, fill: .62, fog: 0x1d2740, horizon: 0x3a4a6e, bg: 0x111a33, glow: 1 }],
  [5 * 60 + 30, { sun: 0x8aa0e0, sunI: .38, sky: 0x40508a, ground: 0x1e2632, fill: .62, fog: 0x1d2740, horizon: 0x3a4a6e, bg: 0x111a33, glow: 1 }],
  [6 * 60 + 30, { sun: 0xffc49a, sunI: .85, sky: 0xd9c8d8, ground: 0x6c7466, fill: .95, fog: 0xe6c6b4, horizon: 0xd8b8b0, bg: 0xd8b4b8, glow: .3 }],
  [8 * 60, { sun: 0xffedda, sunI: 1.3, sky: 0xe5f3ff, ground: 0x82917a, fill: 1.2, fog: 0xc8dce0, horizon: 0xffffff, bg: 0x8ab8d1, glow: 0 }],
  [17 * 60, { sun: 0xffedda, sunI: 1.3, sky: 0xe5f3ff, ground: 0x82917a, fill: 1.2, fog: 0xc8dce0, horizon: 0xffffff, bg: 0x8ab8d1, glow: 0 }],
  [18 * 60 + 45, { sun: 0xffb070, sunI: 1.1, sky: 0xf2d2b0, ground: 0x86806a, fill: 1.0, fog: 0xf0c8a0, horizon: 0xf5c9a0, bg: 0xe8b890, glow: .2 }],
  [19 * 60 + 30, { sun: 0xc06a70, sunI: .55, sky: 0x7a6a9a, ground: 0x3a3a44, fill: .75, fog: 0x5a4a6e, horizon: 0x7a6888, bg: 0x4a3e66, glow: .8 }],
  [20 * 60 + 30, { sun: 0x8aa0e0, sunI: .38, sky: 0x40508a, ground: 0x1e2632, fill: .62, fog: 0x1d2740, horizon: 0x3a4a6e, bg: 0x111a33, glow: 1 }],
  [24 * 60, { sun: 0x8aa0e0, sunI: .38, sky: 0x40508a, ground: 0x1e2632, fill: .62, fog: 0x1d2740, horizon: 0x3a4a6e, bg: 0x111a33, glow: 1 }]
];
const mixColor = (a, b, t) => [16, 8, 0].reduce((out, shift) => out | Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t) << shift, 0);
export function skyAt(minute) {
  let i = 0; while (i < KEYS.length - 2 && minute >= KEYS[i + 1][0]) i++;
  const [from, a] = KEYS[i], [to, b] = KEYS[i + 1], t = Math.min(1, Math.max(0, (minute - from) / (to - from)));
  const out = {};
  for (const key of Object.keys(a)) out[key] = ['sunI', 'fill', 'glow'].includes(key) ? a[key] + (b[key] - a[key]) * t : mixColor(a[key], b[key], t);
  // The sun rises in the east (+x) and sets in the west; the moon hangs high.
  const day = (minute - (6 * 60 + 30)) / (12 * 60 + 45);
  out.sunOffset = day >= 0 && day <= 1 ? [Math.cos(day * Math.PI) * 70, 25 + Math.sin(day * Math.PI) * 55, 30] : [-20, 70, 40];
  return out;
}
