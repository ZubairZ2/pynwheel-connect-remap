/** Favorites & eBrochure demo data, lifted from the design. */
import type { BrochureConfig, FavoriteSample } from '~/core/models/data/connect/engagement.data';

// ---- Favorites & eBrochure ----
export const SEED_BROCHURE_CFG: Record<string, BrochureConfig> = {
  luxe:{ logo:'primary', headline:'Your Favorites at Luxe Mile High', body:'Thanks for touring with us! Here are the homes you saved. Pricing and availability are live as of the time you toured \u2014 reply to this email or tap below to lock in a favorite.', bcc:['leasing@luxemilehigh.com','dana@allianceres.com'], sends:184, opens:'68%' },
  uptown:{ logo:'primary', headline:'Your Saved Homes', body:'Here are the floorplans you favorited during your visit. Availability moves fast \u2014 let us know if you\u2019d like to apply.', bcc:['leasing@allianceuptown.com'], sends:96, opens:'61%' },
  wharf:{ logo:'none', headline:'Your Favorites', body:'', bcc:[], sends:0, opens:'\u2014' },
  cortsky:{ logo:'primary', headline:'Your Cortland Sky Favorites', body:'Thanks for visiting. Your saved homes are below, along with current pricing and lease terms.', bcc:['leasing@cortlandsky.com','priya@cortland.com'], sends:212, opens:'72%' },
  bellvista:{ logo:'primary', headline:'Your Saved Floorplans', body:'Here\u2019s what you liked at Bell Vista.', bcc:['leasing@bellvista.com'], sends:31, opens:'55%' },
  millpark:{ logo:'primary', headline:'Your Mill Creek Parkside Favorites', body:'Thanks for touring! Here are the homes you saved, with live pricing and availability.', bcc:['leasing@millcreekparkside.com'], sends:143, opens:'64%' },
};
export const FAVORITE_SAMPLE: FavoriteSample[] = [
  { unit:'1204', plan:'The Summit \u00b7 2 Bed', rent:'$3,150/month', sqft:'1,180 sq.ft' },
  { unit:'0907', plan:'The Ridge \u00b7 1 Bed', rent:'$2,400/month', sqft:'860 sq.ft' },
  { unit:'1533', plan:'The Overlook \u00b7 2 Bed', rent:'$3,480/month', sqft:'1,240 sq.ft' },
];

