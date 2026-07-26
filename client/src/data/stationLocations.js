// ────────────────────────────────────────────────────────────────────────
// stationLocations.js — STATIC police station coordinates keyed by UnitID
// ────────────────────────────────────────────────────────────────────────
// PURPOSE:
//   Police stations are fixed administrative locations. They do not move,
//   they do not change per case, and they do not require a database
//   round-trip on every HotspotMap load. This config is loaded once from
//   the client bundle, no API call needed.
//
// KEY CONVENTION:
//   Object key = UnitID (integer) matching the Unit table's UnitID column.
//   The seed script creates Units with UnitID = 100..129 (30 total, one
//   per Karnataka district), so this config has exactly 30 entries.
//
// SOURCE OF COORDINATES:
//   All lat/lng values are the publicly-documented, widely-known
//   approximate locality / town-centre coordinates for each station's
//   district (not private, not exact KSP GPS pins).
//
// LIMITATION (document honestly, do not fabricate 1,100 stations):
//   KSP has provided the schema but NOT an actual list of all ~1,100
//   real Karnataka police stations with addresses. We therefore populate
//   this config ONLY for the 30 district-anchored PS records that
//   already exist in our Unit seed data (1 per district). Full statewide
//   coverage depends on KSP providing a real station list in future.
//   When that list becomes available, append entries to this file — it
//   is the single source of truth for station coordinates.
//
// isApproximate FLAG:
//   Set to true on every entry by default because KSP has not released
//   verified exact street-address GPS pins. Do NOT present these as
//   exact/official police station pins to end users without a flag.
// ────────────────────────────────────────────────────────────────────────

export const STATION_LOCATIONS = {
  100: { unitId: 100, districtId: 1,  districtName: 'Bengaluru Urban',  name: 'Whitefield Police Station',          lat: 12.9698, lng: 77.7499, isApproximate: true },
  101: { unitId: 101, districtId: 2,  districtName: 'Bengaluru Rural',  name: 'Devanahalli PS',                     lat: 13.2487, lng: 77.7102, isApproximate: true },
  102: { unitId: 102, districtId: 3,  districtName: 'Chikkaballapura',  name: 'Chikkaballapura Town PS',            lat: 13.4333, lng: 77.7333, isApproximate: true },
  103: { unitId: 103, districtId: 4,  districtName: 'Chitradurga',      name: 'Chitradurga PS',                     lat: 14.2300, lng: 76.3980, isApproximate: true },
  104: { unitId: 104, districtId: 5,  districtName: 'Davanagere',       name: 'Davanagere PS',                      lat: 14.4644, lng: 75.9218, isApproximate: true },
  105: { unitId: 105, districtId: 6,  districtName: 'Kolar',            name: 'Kolar PS',                            lat: 13.1333, lng: 78.1333, isApproximate: true },
  106: { unitId: 106, districtId: 7,  districtName: 'Shivamogga',       name: 'Shivamogga PS',                      lat: 13.9325, lng: 75.5666, isApproximate: true },
  107: { unitId: 107, districtId: 8,  districtName: 'Tumakuru',         name: 'Tumakuru PS',                        lat: 13.3399, lng: 77.1140, isApproximate: true },
  108: { unitId: 108, districtId: 9,  districtName: 'Bagalkot',         name: 'Bagalkot Town PS',                   lat: 16.1833, lng: 75.7000, isApproximate: true },
  109: { unitId: 109, districtId: 10, districtName: 'Belagavi',         name: 'Belagavi City PS',                   lat: 15.8497, lng: 74.5000, isApproximate: true },
  110: { unitId: 110, districtId: 11, districtName: 'Vijayapura',       name: 'Vijayapura PS',                      lat: 16.8333, lng: 75.7000, isApproximate: true },
  111: { unitId: 111, districtId: 12, districtName: 'Dharwad',          name: 'Dharwad PS',                         lat: 15.3647, lng: 75.1240, isApproximate: true },
  112: { unitId: 112, districtId: 13, districtName: 'Gadag',            name: 'Gadag PS',                            lat: 15.4250, lng: 75.6250, isApproximate: true },
  113: { unitId: 113, districtId: 14, districtName: 'Haveri',           name: 'Haveri PS',                           lat: 14.8000, lng: 75.4000, isApproximate: true },
  114: { unitId: 114, districtId: 15, districtName: 'Uttara Kannada',   name: 'Karwar PS',                           lat: 14.8103, lng: 74.1246, isApproximate: true },
  115: { unitId: 115, districtId: 16, districtName: 'Ballari',          name: 'Ballari PS',                          lat: 15.1394, lng: 76.9214, isApproximate: true },
  116: { unitId: 116, districtId: 17, districtName: 'Bidar',            name: 'Bidar PS',                            lat: 17.9213, lng: 77.5244, isApproximate: true },
  117: { unitId: 117, districtId: 18, districtName: 'Kalaburagi',       name: 'Kalaburagi PS',                       lat: 17.3297, lng: 76.8343, isApproximate: true },
  118: { unitId: 118, districtId: 19, districtName: 'Koppal',           name: 'Koppal PS',                           lat: 15.3415, lng: 76.1600, isApproximate: true },
  119: { unitId: 119, districtId: 20, districtName: 'Raichur',          name: 'Raichur PS',                          lat: 16.2000, lng: 77.3500, isApproximate: true },
  120: { unitId: 120, districtId: 21, districtName: 'Yadgir',           name: 'Yadgir PS',                           lat: 16.7667, lng: 77.1333, isApproximate: true },
  121: { unitId: 121, districtId: 22, districtName: 'Chikkamagaluru',   name: 'Chikkamagaluru PS',                   lat: 13.3167, lng: 75.7750, isApproximate: true },
  122: { unitId: 122, districtId: 23, districtName: 'Dakshina Kannada', name: 'Mangaluru North PS',                  lat: 12.9141, lng: 74.8560, isApproximate: true },
  123: { unitId: 123, districtId: 24, districtName: 'Hassan',           name: 'Hassan PS',                           lat: 13.0083, lng: 76.0950, isApproximate: true },
  124: { unitId: 124, districtId: 25, districtName: 'Kodagu',           name: 'Madikeri PS',                         lat: 12.4219, lng: 75.7394, isApproximate: true },
  125: { unitId: 125, districtId: 26, districtName: 'Mandya',           name: 'Mandya PS',                           lat: 12.5226, lng: 76.9000, isApproximate: true },
  126: { unitId: 126, districtId: 27, districtName: 'Mysuru',           name: 'Mysuru East PS',                      lat: 12.2958, lng: 76.6394, isApproximate: true },
  127: { unitId: 127, districtId: 28, districtName: 'Udupi',            name: 'Udupi PS',                            lat: 13.3400, lng: 74.7400, isApproximate: true },
  128: { unitId: 128, districtId: 29, districtName: 'Ramanagara',       name: 'Ramanagara PS',                       lat: 12.7200, lng: 77.2800, isApproximate: true },
  129: { unitId: 129, districtId: 30, districtName: 'Chamarajanagar',   name: 'Chamarajanagar PS',                   lat: 11.9200, lng: 76.9700, isApproximate: true }
};

// ── convenience helpers ───────────────────────────────────────────────

export const getStationById = (unitId) => STATION_LOCATIONS[unitId] || null;

export const getAllStations = () => Object.values(STATION_LOCATIONS);

export const getStationsByDistrict = (districtName) =>
  Object.values(STATION_LOCATIONS).filter(s => s.districtName === districtName);

// ── haversine (km) — used for step-1 of nearest-station shortlist ────
export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Number of stations covered. This is intentionally 30 (1 per district)
// because that is what we already seed in the Unit table. Do not inflate
// it to a fake 1,100 statewide value.
export const STATION_COUNT = Object.keys(STATION_LOCATIONS).length;
export const DISTRICT_COVERAGE = 30; // 30 districts, matching Karnataka seed
