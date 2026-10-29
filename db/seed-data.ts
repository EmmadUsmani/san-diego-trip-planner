import type { Place, TripEvent } from "../shared/types";
import { laToUtc } from "../shared/time";

/** Coordinates geocoded once via Nominatim (2026-10-28) and hard-coded. Pins marked approx are neighborhood-level. */
const G = {
  valencia: { lat: 34.44168, lng: -118.55611 },
  sylmar: { lat: 34.32522, lng: -118.49443 },
  airbnb: { lat: 32.82951, lng: -117.21718 },
  sugar: { lat: 32.84284, lng: -117.27486 },
  seacliff: { lat: 32.95165, lng: -117.26525 },
  zoya: { lat: 32.84753, lng: -117.27494 },
  fig: { lat: 32.80809, lng: -117.2549 },
  birch: { lat: 32.8659, lng: -117.25063 },
  harbor: { lat: 32.72759, lng: -117.17792 },
  aladdin: { lat: 32.83474, lng: -117.1754 },
  shorehouse: { lat: 32.85396, lng: -117.25461 },
  zoo: { lat: 32.73599, lng: -117.15065 },
  balboa: { lat: 32.73153, lng: -117.15027 },
  sultan: { lat: 32.7948, lng: -116.9625 },
  roseCanyon: { lat: 32.86215, lng: -117.21037 },
  coastwalk: { lat: 32.84863, lng: -117.26638 },
  scripps: { lat: 32.87557, lng: -117.24837 },
  mcasd: { lat: 32.84455, lng: -117.278 },
  geisel: { lat: 32.8456, lng: -117.27782 },
  padel: { lat: 32.7157, lng: -117.1611 },
  littleItaly: { lat: 32.72327, lng: -117.16827 },
  devils: { lat: 32.7233, lng: -117.1683 },
  akhis: { lat: 32.80824, lng: -117.25995 },
  urban: { lat: 32.89112, lng: -117.20172 },
  khyber: { lat: 32.749, lng: -117.1613 },
  georges: { lat: 32.84931, lng: -117.27188 },
  urbane: { lat: 32.847, lng: -117.274 },
  liberty: { lat: 32.82208, lng: -117.18436 },
  villa: { lat: 32.86594, lng: -117.23219 },
  independence: { lat: 32.83238, lng: -117.15967 },
  kearny: { lat: 32.83289, lng: -117.14478 },
  fashion: { lat: 32.7682, lng: -117.16511 },
  morena: { lat: 32.76522, lng: -117.19785 },
} as const;

type SeedPlace = Omit<Place, "createdAt" | "updatedAt">;
const P = (p: Partial<SeedPlace> & Pick<SeedPlace, "id" | "name" | "category" | "address" | "lat" | "lng">): SeedPlace => ({
  neighborhood: "",
  tags: [],
  links: [],
  defaultDurationMin: null,
  hoursText: "",
  notes: "",
  ...p,
});

export const seedPlaces: SeedPlace[] = [
  // ---- Homes & lodging ----
  P({ id: "pl_valencia", name: "Emmad's home (Valencia)", category: "home", address: "27579 N Weeping Willow Dr, Valencia, CA 91354", ...G.valencia, neighborhood: "Valencia" }),
  P({ id: "pl_sylmar", name: "Ömer's home (Sylmar)", category: "home", address: "16638 Nicklaus Dr, Unit 98, Sylmar, CA 91342", ...G.sylmar, neighborhood: "Sylmar" }),
  P({
    id: "pl_airbnb",
    name: "Airbnb (Idlewild Way)",
    category: "lodging",
    address: "3225 Idlewild Way, San Diego, CA 92117",
    ...G.airbnb,
    neighborhood: "Clairemont",
    notes: "Host Anthony. Check-in after 3:00 PM Sat 10/31. Check-out before 10:00 AM Tue 11/3.",
  }),
  // ---- Itinerary ----
  P({ id: "pl_sugar", name: "Sugar and Scribe", category: "food", address: "7660 Fay Ave, Unit I, La Jolla, CA 92037", ...G.sugar, neighborhood: "La Jolla", tags: ["brunch"], defaultDurationMin: 75, hoursText: "Closes 2:30p" }),
  P({ id: "pl_seacliff", name: "Sea Cliff Coastal Bluff Trail", category: "activity", address: "100 8th St, Del Mar, CA 92014", ...G.seacliff, neighborhood: "Del Mar", tags: ["outdoor", "hike"], defaultDurationMin: 90 }),
  P({ id: "pl_zoya", name: "Zoya", category: "food", address: "1000 Prospect St, La Jolla, CA 92037", ...G.zoya, neighborhood: "La Jolla", tags: ["halal", "dinner"], defaultDurationMin: 90 }),
  P({ id: "pl_fig", name: "Fig Tree Cafe", category: "food", address: "5119 Cass St, San Diego, CA 92109", ...G.fig, neighborhood: "Pacific Beach", tags: ["brunch"], defaultDurationMin: 60, hoursText: "Closes 3p" }),
  P({ id: "pl_birch", name: "Birch Aquarium", category: "activity", address: "2300 Expedition Way, La Jolla, CA 92037", ...G.birch, neighborhood: "La Jolla", tags: ["indoor", "outdoor"], defaultDurationMin: 210, hoursText: "9a-5p" }),
  P({ id: "pl_harbor", name: "Flagship South Harbor Tour", category: "activity", address: "990 N Harbor Dr, San Diego, CA 92101", ...G.harbor, neighborhood: "Embarcadero", tags: ["outdoor", "booked"], defaultDurationMin: 60, notes: "Booked. Arrive by 3:45 PM." }),
  P({ id: "pl_aladdin", name: "Aladdin Cafe", category: "food", address: "5420 Clairemont Mesa Blvd, San Diego, CA 92117", ...G.aladdin, neighborhood: "Clairemont", tags: ["halal", "dinner"], defaultDurationMin: 75, notes: "About 3 mi from the Airbnb." }),
  P({ id: "pl_shorehouse", name: "Shorehouse Kitchen", category: "food", address: "2236 Avenida de la Playa, La Jolla, CA 92037", ...G.shorehouse, neighborhood: "La Jolla Shores", tags: ["brunch"], defaultDurationMin: 60, hoursText: "Closes 2:30p weekdays, 3:30p weekends" }),
  P({ id: "pl_zoo", name: "San Diego Zoo", category: "activity", address: "2920 Zoo Dr, San Diego, CA 92101", ...G.zoo, neighborhood: "Balboa Park", tags: ["outdoor"], defaultDurationMin: 270 }),
  P({ id: "pl_balboa", name: "Balboa Park museum", category: "activity", address: "1549 El Prado, San Diego, CA 92101", ...G.balboa, neighborhood: "Balboa Park", tags: ["indoor"], defaultDurationMin: 75, notes: "Tentative; museum not chosen yet." }),
  P({ id: "pl_sultan", name: "Sultan Baklava", category: "food", address: "El Cajon, CA", ...G.sultan, neighborhood: "El Cajon", tags: ["dessert", "approx-location"], defaultDurationMin: 90, notes: "About 18 mi from Balboa Park. Pin is approximate (El Cajon); confirm the street address." }),
  // ---- Backups: activities ----
  P({ id: "pl_rose_canyon", name: "Rose Canyon Open Space Park", category: "activity", address: "Rose Canyon Open Space Park, San Diego, CA", ...G.roseCanyon, neighborhood: "University City", tags: ["outdoor", "hike"], defaultDurationMin: 90, notes: "Hike, about 8 min from the Airbnb." }),
  P({ id: "pl_coast_walk", name: "Coast Walk Trail", category: "activity", address: "Coast Walk, La Jolla, CA 92037", ...G.coastwalk, neighborhood: "La Jolla", tags: ["outdoor", "hike"], defaultDurationMin: 90, notes: "Scripps Park, Shell Beach, La Jolla Cove, tide pools." }),
  P({ id: "pl_scripps_meander", name: "Scripps Coastal Meander Trail", category: "activity", address: "Scripps Coastal Reserve, La Jolla, CA 92037", ...G.scripps, neighborhood: "La Jolla", tags: ["outdoor", "hike"], defaultDurationMin: 60, notes: "Near Birch Aquarium." }),
  P({ id: "pl_mcasd", name: "Museum of Contemporary Art San Diego", category: "activity", address: "700 Prospect St, La Jolla, CA 92037", ...G.mcasd, neighborhood: "La Jolla", tags: ["indoor"], defaultDurationMin: 90 }),
  P({ id: "pl_geisel", name: "UCSD Geisel Library", category: "activity", address: "9500 Gilman Dr, La Jolla, CA 92093", ...G.geisel, neighborhood: "UCSD", tags: ["indoor"], defaultDurationMin: 45 }),
  P({ id: "pl_padel", name: "Kingdom of Padel", category: "activity", address: "San Diego, CA", ...G.padel, neighborhood: "San Diego", tags: ["indoor", "pickleball", "approx-location"], defaultDurationMin: 90, notes: "Pickleball. Pin is approximate; confirm the street address." }),
  P({ id: "pl_little_italy", name: "Little Italy", category: "activity", address: "Little Italy, San Diego, CA 92101", ...G.littleItaly, neighborhood: "Little Italy", tags: ["outdoor"], defaultDurationMin: 120, notes: "Food tour: pizza, gelato." }),
  P({ id: "pl_devils_dozen", name: "Devil's Dozen Donuts", category: "food", address: "Little Italy, San Diego, CA 92101", ...G.devils, neighborhood: "Little Italy", tags: ["dessert", "approx-location"], defaultDurationMin: 30, notes: "Pin is approximate (Little Italy); confirm the street address." }),
  // ---- Backups: food ----
  P({ id: "pl_akhis", name: "Akhi's Authentic Shawarma & Kebab", category: "food", address: "747 Turquoise St, San Diego, CA 92109", ...G.akhis, neighborhood: "Pacific Beach", tags: ["halal"], defaultDurationMin: 60 }),
  P({ id: "pl_urban_skillet", name: "Urban Skillet", category: "food", address: "9254 Scranton Rd, San Diego, CA 92121", ...G.urban, neighborhood: "Sorrento Valley", tags: ["halal"], defaultDurationMin: 60, notes: "About 8 mi from the Airbnb." }),
  P({ id: "pl_khyber", name: "Khyber Pass Zarparan", category: "food", address: "University Ave, San Diego, CA", ...G.khyber, neighborhood: "Hillcrest", tags: ["halal-unconfirmed", "approx-location"], defaultDurationMin: 75, notes: "Halal not confirmed. Pin is approximate; confirm the street address." }),
  P({ id: "pl_georges", name: "George's at the Cove", category: "food", address: "1250 Prospect St, La Jolla, CA 92037", ...G.georges, neighborhood: "La Jolla", defaultDurationMin: 90 }),
  P({ id: "pl_urbane", name: "Urbane Cafe", category: "food", address: "La Jolla, CA", ...G.urbane, neighborhood: "La Jolla", tags: ["approx-location"], defaultDurationMin: 45, notes: "Banh mi. Pin is approximate (La Jolla village); confirm the street address." }),
  // ---- Superchargers ----
  P({ id: "pl_sc_liberty", name: "Supercharger: Liberty Park Plaza", category: "charger", address: "4340 Genesee Ave, San Diego, CA 92117", ...G.liberty, neighborhood: "Clairemont", tags: ["supercharger"], defaultDurationMin: 30, notes: "About 1.5 mi from the Airbnb. 8 stalls." }),
  P({ id: "pl_sc_villa", name: "Supercharger: Villa La Jolla", category: "charger", address: "8657 Villa La Jolla Dr, La Jolla, CA 92037", ...G.villa, neighborhood: "La Jolla", tags: ["supercharger"], defaultDurationMin: 30, notes: "About 5 mi from the Airbnb. In a mall." }),
  P({ id: "pl_sc_independence", name: "Supercharger: Independence Square", category: "charger", address: "7373 Clairemont Mesa Blvd, San Diego, CA 92111", ...G.independence, neighborhood: "Kearny Mesa", tags: ["supercharger"], defaultDurationMin: 30 }),
  P({ id: "pl_sc_kearny", name: "Supercharger: Kearny Office Park", category: "charger", address: "8344 Clairemont Mesa Blvd, San Diego, CA 92111", ...G.kearny, neighborhood: "Kearny Mesa", tags: ["supercharger"], defaultDurationMin: 30 }),
  P({ id: "pl_sc_fashion", name: "Supercharger: Fashion Valley", category: "charger", address: "7007 Friars Rd, San Diego, CA 92108", ...G.fashion, neighborhood: "Mission Valley", tags: ["supercharger"], defaultDurationMin: 30, notes: "48 stalls." }),
  P({ id: "pl_sc_morena", name: "Supercharger: Morena Blvd", category: "charger", address: "845 Morena Blvd, San Diego, CA 92110", ...G.morena, neighborhood: "Morena", tags: ["supercharger"], defaultDurationMin: 30 }),
];

export const SAT = "2026-10-31";
export const SUN = "2026-11-01";
export const MON = "2026-11-02";
export const TUE = "2026-11-03";

type SeedEvent = Omit<TripEvent, "createdAt" | "updatedAt">;
const E = (
  id: string,
  placeId: string | null,
  title: string,
  day: string,
  from: string,
  to: string,
  extra: Partial<SeedEvent> = {},
): SeedEvent => ({
  id,
  placeId,
  title,
  kind: "normal",
  start: laToUtc(day, from),
  end: laToUtc(day, to),
  skipped: false,
  chargeToPct: null,
  notes: "",
  ...extra,
});

export const seedEvents: SeedEvent[] = [
  E("ev_sat_leave", "pl_valencia", "Leave Valencia", SAT, "09:30", "09:55"),
  E("ev_sat_pickup", "pl_sylmar", "Pick up Ömer", SAT, "09:55", "10:00"),
  E("ev_sat_brunch", "pl_sugar", "Brunch: Sugar and Scribe", SAT, "12:30", "13:45"),
  E("ev_sat_trail", "pl_seacliff", "Sea Cliff Coastal Bluff Trail", SAT, "14:00", "15:30"),
  E("ev_sat_checkin", "pl_airbnb", "Check in", SAT, "16:00", "16:30", { kind: "locked", notes: "Check-in is after 3:00 PM." }),
  E("ev_sat_dinner", "pl_zoya", "Dinner: Zoya", SAT, "19:00", "20:30"),
  E("ev_sun_brunch", "pl_fig", "Brunch: Fig Tree Cafe", SUN, "09:00", "10:00"),
  E("ev_sun_birch", "pl_birch", "Birch Aquarium", SUN, "10:15", "13:45"),
  E("ev_sun_harbor", "pl_harbor", "Flagship South Harbor Tour", SUN, "16:15", "17:15", { kind: "booked", notes: "Booked. Arrive by 3:45 PM." }),
  E("ev_sun_dinner", "pl_aladdin", "Dinner: Aladdin Cafe", SUN, "18:15", "19:30"),
  E("ev_mon_charge", "pl_sc_liberty", "Supercharge: Liberty Park Plaza", MON, "08:30", "09:00", { chargeToPct: 80, notes: "Added manually, 20% to 80%." }),
  E("ev_mon_brunch", "pl_shorehouse", "Brunch: Shorehouse Kitchen", MON, "09:00", "10:00"),
  E("ev_mon_zoo", "pl_zoo", "San Diego Zoo", MON, "10:30", "15:00"),
  E("ev_mon_balboa", "pl_balboa", "Balboa Park museum", MON, "15:15", "16:30", { notes: "Tentative." }),
  E("ev_mon_dinner", "pl_sultan", "Dinner: Sultan Baklava", MON, "17:30", "19:00"),
  E("ev_tue_checkout", "pl_airbnb", "Check out", TUE, "09:30", "10:00", { kind: "locked", notes: "Check-out is before 10:00 AM." }),
  E("ev_tue_brunch", null, "Brunch", TUE, "10:15", "11:15", { notes: "Spot not chosen yet." }),
  E("ev_tue_dropoff", "pl_sylmar", "Drop off Ömer", TUE, "14:15", "14:25"),
  E("ev_tue_home", "pl_valencia", "Home", TUE, "14:40", "15:00"),
];

export const seedSettings: Record<string, unknown> = {
  startChargePct: 90,
  efficiencyKwhPer100Mi: 24,
  homeLabel: "Valencia",
  doorCode: "8038",
};
