/** Property Content demo data, lifted from the design. */
import type {
  BrochureLink,
  ContentPage,
  HomeTile,
  Neighborhood,
  PageTypeKey,
  PoiResult
} from '~/core/models/data/connect/content.data';

// ---- Property Content ----
export const PAGE_TYPES: Record<PageTypeKey, { label: string; icon: string }> = { embed:{label:'Embedded Page', icon:'pages'}, link:{label:'External Link', icon:'link'}, gallery:{label:'Image Gallery', icon:'image'}, slideshow:{label:'Slideshow', icon:'image'} };
export const SEED_PAGES: Record<string, ContentPage[]> = {
  luxe:[
    { id:'p1', title:'Matterport Virtual Tour', type:'embed', detail:'my.matterport.com/show/?m=8fL2', onHome:true },
    { id:'p2', title:'Resident Portal', type:'link', detail:'luxemilehigh.com/portal', onHome:false },
    { id:'p3', title:'Rooftop & Skyline Gallery', type:'gallery', detail:'14 photos', onHome:true },
    { id:'p4', title:'Neighborhood Slideshow', type:'slideshow', detail:'8 slides \u00b7 6s each', onHome:true },
  ],
  uptown:[
    { id:'p1', title:'3D Walkthrough', type:'embed', detail:'tours.pynwheel.com/uptown', onHome:true },
    { id:'p2', title:'Amenity Gallery', type:'gallery', detail:'9 photos', onHome:true },
  ],
  wharf:[ { id:'p1', title:'Pre-Leasing Info', type:'link', detail:'wharfriverside.com/leasing', onHome:false } ],
  cortsky:[
    { id:'p1', title:'Virtual Tour', type:'embed', detail:'my.matterport.com/show/?m=2kQ9', onHome:true },
    { id:'p2', title:'Pool Deck Gallery', type:'gallery', detail:'11 photos', onHome:true },
    { id:'p3', title:'Midtown Guide', type:'slideshow', detail:'6 slides', onHome:false },
  ],
  bellvista:[ { id:'p1', title:'Photo Gallery', type:'gallery', detail:'6 photos', onHome:true } ],
  millpark:[
    { id:'p1', title:'Virtual Tour', type:'embed', detail:'tours.pynwheel.com/millpark', onHome:true },
    { id:'p2', title:'Austin Lifestyle', type:'slideshow', detail:'7 slides', onHome:true },
  ],
};
export const DEFAULT_TILES: HomeTile[] = [
  { id:'t1', label:'Floor Plans', icon:'grid', cropped:true },
  { id:'t2', label:'Availability', icon:'bed', cropped:true },
  { id:'t3', label:'Amenities', icon:'star', cropped:true },
  { id:'t4', label:'Map & Tour', icon:'map', cropped:false },
  { id:'t5', label:'Neighborhood', icon:'compass', cropped:false },
];
export const SEED_TILES: Record<string, HomeTile[]> = {
  luxe:DEFAULT_TILES.map(t=>({...t})),
  uptown:DEFAULT_TILES.slice(0,4).map(t=>({...t})),
  wharf:DEFAULT_TILES.slice(0,2).map(t=>({...t})),
  cortsky:DEFAULT_TILES.map(t=>({...t})),
  bellvista:DEFAULT_TILES.slice(0,3).map(t=>({...t})),
  millpark:DEFAULT_TILES.slice(0,4).map(t=>({...t})),
};
export const SEED_BROCHURE_LINKS: Record<string, BrochureLink[]> = {
  luxe:[ {id:'l1', label:'Apply Now', url:'luxemilehigh.com/apply', on:true}, {id:'l2', label:'Schedule a Tour', url:'book.pynwheel.com/luxe', on:true}, {id:'l3', label:'Contact Leasing', url:'luxemilehigh.com/contact', on:false} ],
  uptown:[ {id:'l1', label:'Apply Now', url:'allianceuptown.com/apply', on:true} ],
  wharf:[], cortsky:[ {id:'l1', label:'Apply Now', url:'cortlandsky.com/apply', on:true}, {id:'l2', label:'Floor Plans', url:'cortlandsky.com/plans', on:true} ],
  bellvista:[ {id:'l1', label:'Apply Now', url:'bellvista.com/apply', on:true} ],
  millpark:[ {id:'l1', label:'Apply Now', url:'millcreekparkside.com/apply', on:true}, {id:'l2', label:'Schedule a Tour', url:'book.pynwheel.com/millpark', on:true} ],
};
export const POI_CATEGORIES: string[] = ['Dining','Coffee','Shopping','Groceries','Schools','Parks','Fitness','Nightlife','Transit','Healthcare'];
export const SEED_HOOD: Record<string, Neighborhood> = {
  luxe:{ center:'1550 Wewatta St, Denver, CO', radius:2, cats:['Dining','Coffee','Shopping','Parks','Transit'], calls:412 },
  uptown:{ center:'2801 McKinney Ave, Dallas, TX', radius:1.5, cats:['Dining','Coffee','Groceries','Fitness'], calls:186 },
  wharf:{ center:'800 Maine Ave SW, Washington, DC', radius:1, cats:['Dining','Transit'], calls:24 },
  cortsky:{ center:'1080 Peachtree St NE, Atlanta, GA', radius:2.5, cats:['Dining','Shopping','Schools','Parks','Nightlife'], calls:238 },
  bellvista:{ center:'300 S Tryon St, Charlotte, NC', radius:1.5, cats:['Dining','Groceries','Schools'], calls:61 },
  millpark:{ center:'1100 S Lamar Blvd, Austin, TX', radius:2, cats:['Dining','Coffee','Parks','Nightlife'], calls:349 },
};
export const POI_RESULTS: PoiResult[] = [
  { name:'Tavernetta', cat:'Dining', dist:'0.3 mi', rating:'4.7' },
  { name:'Little Owl Coffee', cat:'Coffee', dist:'0.4 mi', rating:'4.6' },
  { name:'Union Station Market', cat:'Groceries', dist:'0.5 mi', rating:'4.4' },
  { name:'Commons Park', cat:'Parks', dist:'0.6 mi', rating:'4.5' },
  { name:'Dairy Block', cat:'Shopping', dist:'0.7 mi', rating:'4.5' },
  { name:'Union Station Transit Center', cat:'Transit', dist:'0.4 mi', rating:'4.2' },
  { name:'Tattered Cover Books', cat:'Shopping', dist:'0.8 mi', rating:'4.8' },
  { name:'Snooze A.M. Eatery', cat:'Dining', dist:'0.5 mi', rating:'4.5' },
];

