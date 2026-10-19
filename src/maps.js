// The game's maps. Each has its own mission title; the title screen lists
// them and remembers the last one played.
import { CITY_PLAN } from './city-plan.js?v=0.9.0';
import { PARK_PLAN } from './park-plan.js?v=0.9.0';
export const MAPS = {
  '01': { name: 'BANDAR', title: 'Kawal kawasan pasar', brief: 'Gagak rumah memenuhi bumbung dan wayar di bandar.', plan: CITY_PLAN },
  '02': { name: 'TAMAN RIMBA', title: 'Jaga taman rimba', brief: 'Gagak turun ke padang dan bertenggek di pokok rimba sekeliling taman.', plan: PARK_PLAN }
};
