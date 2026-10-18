import { HOURS, onDuty } from './clock.js?v=0.1.0';

// The visuals and the counter use the same town-clock schedule.
export const SHOPS = {
  19: { host: null, tile: 7 },
  21: { host: 'ita' },
  22: { host: 'rahman', tile: 0 },
  23: { host: null, tile: 1 },
  24: { host: null, tile: 2 },
  25: { host: 'lim', tile: 3 },
  26: { host: null, tile: 4 },
  27: { host: null, tile: 5 },
  28: { host: null, tile: 6 },
  30: { host: 'ros' },
  36: { host: 'man' },
  37: { host: 'din', tile: 7 }
};
export const isShop = place => Object.hasOwn(SHOPS, place);
export const shopHours = place => HOURS[SHOPS[place]?.host] || HOURS.default;
export const isShopOpen = (place, minute) => isShop(place) && onDuty(SHOPS[place].host, minute);
