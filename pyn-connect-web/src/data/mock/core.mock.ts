/**
 * Demo data for every Pynwheel Connect screen that is not backed by the Rails
 * API yet. Values are lifted verbatim from the design (`pyn-connect-new.html`)
 * so the ported screens render exactly what the design shows.
 *
 * Nothing here touches the database. See react-architecture.md §21.
 */
import type {
  AppUser,
  Billing,
  Level,
  Org,
  PortfolioGroup,
  Prop,
  Region
} from '~/core/models/data/connect/account.data';
import type {
  Amenity,
  Elevator,
  Floorplan,
  Inventory,
  Junction,
  LockConnection,
  PropertyIntegrations,
  SourceKind,
  Tour,
  TourEdge,
  TourStop,
  Unit,
  VendorConnection,
  AvailKey
} from '~/core/models/data/connect/inventory.data';
import type { DotState, PillDef, Stage, StageKey, Variant } from '~/core/models/data/connect/common.data';

// Deployment lifecycle — installed → activated → in production → released → submitted for final approval
export const STAGES: Stage[] = [
  { key:'installed',  label:'Installed',  short:'Installed',  desc:'Hardware & app provisioned' },
  { key:'activated',  label:'Activated',  short:'Activated',  desc:'Property data & branding loaded' },
  { key:'production', label:'In Production', short:'Production', desc:'Serving tours on-site' },
  { key:'released',   label:'Released',   short:'Released',   desc:'Signed off by client' },
  { key:'approval',   label:'Submitted for Final Approval', short:'Final Approval', desc:'Awaiting corporate sign-off' },
];
export const STAGE_IDX = (k: StageKey): number => Math.max(0, STAGES.findIndex(s=>s.key===k));
export const STAGE_PILL: Record<StageKey, PillDef> = {
  installed:{label:'Installed', v:'neutral'}, activated:{label:'Activated', v:'info'},
  production:{label:'In Production', v:'live'}, released:{label:'Released', v:'ok'},
  approval:{label:'Final Approval', v:'submitted'},
};
export const isProdStage = (k: StageKey): boolean => STAGE_IDX(k) >= 2;
export const PMS_PROVIDERS: string[] = ['Yardi Voyager','Entrata','ResMan','RealPage','MRI Living','AppFolio'];
export const PMS_VENDOR_NOTES: Record<string, string> = { 'Yardi Voyager':'Voyager 7S \u00b7 SOAP + ILS export', 'Entrata':'Entrata / PSI \u00b7 REST v1', 'ResMan':'ResMan API \u00b7 property-scoped keys', 'RealPage':'OneSite \u00b7 Exchange partner key', 'MRI Living':'MRI \u00b7 Partner Connect token', 'AppFolio':'AppFolio \u00b7 API user + secret' };

export const SEED_ORGS: Org[] = [
  { id:'alliance', name:'Alliance Residential', users:34, contact:'Dana Reyes', email:'dana@allianceres.com',
    pms:{ provider:'Yardi Voyager', cred:'yv_live_••••1b77', pushDown:true },
    regions:[
      { id:'r-mtn', name:'Mountain West', contact:'Dana Reyes', email:'dana@allianceres.com', props:2 },
      { id:'r-tx', name:'Texas', contact:'Luis Fuentes', email:'luis@allianceres.com', props:1 },
    ],
    groups:[
      { id:'g-den', name:'Denver Collection', master:'Luxe Mile High', props:2, video:true },
    ],
    history:[
      { actor:'Dana Reyes', action:'updated the Mountain West region contact', when:'2d ago', v:'info' },
      { actor:'Alex Morgan', action:'enabled company-level Yardi credentials', when:'6d ago', v:'ok' },
      { actor:'Sam Ito', action:'created the Denver Collection portfolio group', when:'3w ago', v:'ok' },
      { actor:'Alex Morgan', action:'created the company', when:'8mo ago', v:'neutral' },
    ] },
  { id:'greystar', name:'Greystar', users:21, contact:'Marcus Hale', email:'m.hale@greystar.com',
    pms:{ provider:'Entrata', cred:'en_live_••••7a03', pushDown:true },
    regions:[ { id:'r-mid', name:'Mid-Atlantic', contact:'Marcus Hale', email:'m.hale@greystar.com', props:1 } ],
    groups:[ { id:'g-cap', name:'Capitol Living', master:'The Wharf at Riverside', props:1, video:false } ],
    history:[
      { actor:'Marcus Hale', action:'rotated the Entrata credential', when:'5d ago', v:'ok' },
      { actor:'Alex Morgan', action:'created the company', when:'1y ago', v:'neutral' },
    ] },
  { id:'cortland', name:'Cortland', users:12, contact:'Priya Nair', email:'priya@cortland.com',
    pms:{ provider:'RealPage', cred:'rp_live_••••9d51', pushDown:false },
    regions:[ { id:'r-se', name:'Southeast', contact:'Priya Nair', email:'priya@cortland.com', props:1 } ],
    groups:[],
    history:[
      { actor:'Priya Nair', action:'turned off company-level PMS push-down', when:'4d ago', v:'warn' },
      { actor:'Sam Ito', action:'created the company', when:'10mo ago', v:'neutral' },
    ] },
  { id:'bell', name:'Bell Partners', users:7, contact:'Tom Becker', email:'tbecker@bellpartners.com',
    pms:{ provider:'ResMan', cred:'rm_live_••••2c88', pushDown:true },
    regions:[], groups:[],
    history:[ { actor:'Tom Becker', action:'created the company', when:'6mo ago', v:'neutral' } ] },
  { id:'willow', name:'Willow Bridge', users:2, contact:'Ana Ortiz', email:'ana@willowbridge.com',
    pms:{ provider:'', cred:'', pushDown:false },
    regions:[], groups:[],
    history:[ { actor:'Ana Ortiz', action:'created the company', when:'6d ago', v:'neutral' } ] },
  { id:'millcreek', name:'Mill Creek Residential', users:25, contact:'Grace Lin', email:'grace@mcrtrust.com',
    pms:{ provider:'Yardi Voyager', cred:'yv_live_••••4e29', pushDown:true },
    regions:[
      { id:'r-sw', name:'Southwest', contact:'Grace Lin', email:'grace@mcrtrust.com', props:1 },
      { id:'r-pnw', name:'Pacific Northwest', contact:'Owen Diaz', email:'owen@mcrtrust.com', props:0 },
    ],
    groups:[ { id:'g-atx', name:'Austin Portfolio', master:'Mill Creek Parkside', props:1, video:true } ],
    history:[
      { actor:'Grace Lin', action:'added the Pacific Northwest region', when:'1w ago', v:'info' },
      { actor:'Alex Morgan', action:'created the company', when:'2y ago', v:'neutral' },
    ] },
];
const mkBilling = (touch: string, tour: string, maps: string, combined: string, month: string): Billing => ({ touch, tour, maps, combined, month, cadence:'Monthly' });
export const SEED_PROPS: Prop[] = [
  { id:'luxe', name:'Luxe Mile High', orgId:'alliance', region:'Mountain West', city:'Denver, CO', stage:'released', lock:'ok', idv:'ok', pms:'crit', units:214,
    inv:{ units:214, floorplans:12, floorplates:8, amenities:9 },
    buildings:[ {name:'Tower A', units:120}, {name:'Tower B', units:94} ], has3D:true,
    billing: mkBilling('$249','$149','$99','$429','February 2026') },
  { id:'uptown', name:'Alliance Uptown Residences', orgId:'alliance', region:'Texas', city:'Dallas, TX', stage:'production', lock:'ok', idv:'ok', pms:'ok', units:180,
    inv:{ units:180, floorplans:9, floorplates:6, amenities:7 },
    buildings:[ {name:'Main', units:180} ], has3D:false,
    billing: mkBilling('$249','$149','—','$379','February 2026') },
  { id:'wharf', name:'The Wharf at Riverside', orgId:'greystar', region:'Mid-Atlantic', city:'Washington, DC', stage:'installed', lock:'neutral', idv:'neutral', pms:'neutral', units:96,
    inv:{ units:96, floorplans:6, floorplates:4, amenities:4 },
    buildings:[ {name:'Main', units:96} ], has3D:false,
    billing: mkBilling('$199','—','—','$199','Pending') },
  { id:'cortsky', name:'Cortland Sky', orgId:'cortland', region:'Southeast', city:'Atlanta, GA', stage:'approval', lock:'ok', idv:'crit', pms:'ok', units:301,
    inv:{ units:301, floorplans:14, floorplates:10, amenities:11 },
    buildings:[ {name:'North Tower', units:168}, {name:'South Tower', units:133} ], has3D:true,
    billing: mkBilling('$299','$179','$129','$519','February 2026') },
  { id:'bellvista', name:'Bell Vista', orgId:'bell', region:'—', city:'Charlotte, NC', stage:'activated', lock:'neutral', idv:'neutral', pms:'neutral', units:120,
    inv:{ units:120, floorplans:8, floorplates:5, amenities:6 },
    buildings:[ {name:'Main', units:120} ], has3D:false,
    billing: mkBilling('$249','—','—','$249','February 2026') },
  { id:'millpark', name:'Mill Creek Parkside', orgId:'millcreek', region:'Southwest', city:'Austin, TX', stage:'production', lock:'ok', idv:'ok', pms:'warn', units:158,
    inv:{ units:158, floorplans:10, floorplates:7, amenities:8 },
    buildings:[ {name:'Building 1', units:82}, {name:'Building 2', units:76} ], has3D:true,
    billing: mkBilling('$249','$149','$99','$429','February 2026') },
];
export const PROP_LEVELS: Record<string, Level[]> = {
  luxe:[
    {id:'lx-l', building:'Tower A', floor:'Lobby', plan:'SVG', file:'tower-a-lobby.svg'},
    {id:'lx-12', building:'Tower A', floor:'Floor 12', plan:'SVG', file:'tower-a-l12.svg'},
    {id:'lx-r', building:'Tower A', floor:'Rooftop', plan:'Raster', file:'tower-a-roof.png'},
    {id:'lx-b', building:'Tower B', floor:'Lobby', plan:'Raster', file:'tower-b-lobby.png'},
  ],
  cortsky:[
    {id:'ct-l', building:'North Tower', floor:'Lobby', plan:'SVG', file:'north-lobby.svg'},
    {id:'ct-33', building:'North Tower', floor:'Floor 33', plan:'SVG', file:'north-l33.svg'},
    {id:'ct-40', building:'North Tower', floor:'Sky Deck', plan:'Raster', file:'north-skydeck.png'},
    {id:'ct-s', building:'South Tower', floor:'Lobby', plan:'Raster', file:'south-lobby.png'},
  ],
  millpark:[
    {id:'mp-1', building:'Building 1', floor:'Floor 1', plan:'SVG', file:'b1-floor1.svg'},
    {id:'mp-c', building:'Building 1', floor:'Courtyard', plan:'Raster', file:'b1-courtyard.png'},
    {id:'mp-2', building:'Building 2', floor:'Floor 1', plan:'Raster', file:'b2-floor1.png'},
  ],
  uptown:[
    {id:'up-1', building:'Main', floor:'Floor 1', plan:'Raster', file:'main-floor1.png'},
    {id:'up-2', building:'Main', floor:'Floor 2', plan:'Raster', file:'main-floor2.png'},
  ],
  wharf:[ {id:'wh-1', building:'Main', floor:'Floor 1', plan:'None', file:''} ],
  bellvista:[ {id:'bv-1', building:'Main', floor:'Floor 1', plan:'Raster', file:'main-floor1.png'} ],
};
export const BED_TIERS: Array<{ id: string; label: string; beds: number }> = [
  {id:'studio', label:'Studio', beds:0},
  {id:'b1', label:'1 Bed', beds:1},
  {id:'b2', label:'2 Bed', beds:2},
  {id:'b3', label:'3+ Bed', beds:3},
];
export const DEFAULT_BED_COLORS: Record<string, string> = { studio:'#8A92A3', b1:'#EC4E8C', b2:'#0077AE', b3:'#4A7212' };
export const BED_SWATCHES: string[] = ['#0077AE','#EC4E8C','#4A7212','#8A6A00','#C62534','#0077AE','#8A92A3','#171A21'];
export const bedTierOf = (n: number): string => n>=3?'b3':(n===2?'b2':(n===1?'b1':'studio'));
export const AMENITY_CATEGORIES: string[] = ['Fitness Center','Pool','Yoga Studio','Dog Park','Playground','Clubhouse','Game Room','Dog Wash','Package Locker','Mail Room','Conference Room','Business Center','Leasing Center','Other'];
export const AVAIL: Record<AvailKey, PillDef> = { available:{label:'Available', v:'ok'}, almost:{label:'Almost Gone', v:'warn'}, sold:{label:'Sold Out', v:'crit'} };
export const LEASE_TERMS: number[] = [6,12,18];
const mkFp = (id: string, name: string, beds: number, baths: number, sqft: number, rent: number, dep: number, status: AvailKey, t6: number, t12: number, t18: number): Floorplan => ({ id, name, beds, baths, sqft, rent, deposit:dep, status, tourUrl:'tours.pynwheel.com/'+id, terms:{6:t6, 12:t12, 18:t18},
  gallery:['thumb'], src:{rent:'pms', deposit:'manual', sqft:'pms'} });
const mkUnit = (id: string, name: string, fpId: string, price: number, sqft: number, floor: string, building: string, avail: AvailKey, level: string, plotted: boolean, src?: Partial<Unit['src']>, px?: number, py?: number): Unit => ({ id, name, fpId, price, sqft, floor, building, avail, level, plotted,
  px:plotted?(typeof px==='number'?px:28):undefined, py:plotted?(typeof py==='number'?py:34):undefined, plevel:plotted?level:undefined,
  gallery:[], src:Object.assign({price:'pms', sqft:'pms', avail:'pms'}, src||{}) });
export const INVENTORY: Record<string, Inventory> = {
  luxe:{
    floorplans:[
      mkFp('fp-aspen','The Aspen',0,1,520,1650,500,'available',1795,1650,1595),
      mkFp('fp-birch','The Birch',1,1,720,1950,500,'available',2120,1950,1885),
      mkFp('fp-cedar','The Cedar',2,2,1100,2400,750,'almost',2610,2400,2320),
      mkFp('fp-doug','The Douglas',3,2,1450,3150,1000,'sold',3400,3150,3050),
    ],
    units:[
      mkUnit('u-1204','Unit 1204','fp-cedar',2400,1100,'Floor 12','Tower A','available','lx-12',true,{},22,32),
      mkUnit('u-1210','Unit 1210','fp-cedar',2465,1100,'Floor 12','Tower A','almost','lx-12',true,{price:'manual'},62,66),
      mkUnit('u-0810','Unit 0810','fp-birch',1950,720,'Floor 8','Tower A','available','lx-l',false,{}),
      mkUnit('u-0512','Unit 0512','fp-aspen',1650,520,'Floor 5','Tower A','available','lx-l',false,{}),
      mkUnit('u-1802','Unit 1802','fp-doug',3150,1450,'Floor 18','Tower A','sold','lx-12',false,{avail:'manual'}),
      mkUnit('u-b214','Unit B-214','fp-birch',1895,705,'Floor 2','Tower B','available','lx-b',false,{sqft:'manual'}),
    ],
    amenities:[
      { id:'am-pool', name:'Rooftop Pool', category:'Pool', level:'lx-r', gallery:['pool','thumb','pool'] },
      { id:'am-fit', name:'Fitness Center', category:'Fitness Center', level:'lx-l', gallery:['thumb','pool'] },
      { id:'am-lounge', name:'Leasing Lounge', category:'Leasing Center', level:'lx-l', gallery:['thumb'] },
    ],
    elevators:[
      { id:'ev-a', name:'Bank A', floorFrom:'Lobby', floorTo:'Floor 20', building:'Tower A', gallery:['thumb','pool'], lockGated:true, vendor:'Latch' },
      { id:'ev-b', name:'Bank B', floorFrom:'Floor 20', floorTo:'Rooftop', building:'Tower A', gallery:['thumb'], lockGated:true, vendor:'RemoteLock' },
      { id:'ev-c', name:'Tower B Bank', floorFrom:'Lobby', floorTo:'Floor 6', building:'Tower B', gallery:[], lockGated:false, vendor:'' },
    ],
  },
  cortsky:{
    floorplans:[
      mkFp('fp-sky1','Skyline One',1,1,690,2100,600,'available',2280,2100,2030),
      mkFp('fp-sky2','Skyline Two',2,2,1050,2850,850,'almost',3080,2850,2760),
    ],
    units:[
      mkUnit('u-3302','Unit 3302','fp-sky1',2100,690,'Floor 33','North Tower','available','ct-33',true,{},30,38),
      mkUnit('u-3310','Unit 3310','fp-sky2',2850,1050,'Floor 33','North Tower','almost','ct-33',false,{price:'manual'}),
      mkUnit('u-s104','Unit S-104','fp-sky1',1995,690,'Floor 1','South Tower','available','ct-s',false,{}),
    ],
    amenities:[
      { id:'am-deck', name:'Sky Deck', category:'Clubhouse', level:'ct-40', gallery:['pool','thumb'] },
      { id:'am-game', name:'Game Room', category:'Game Room', level:'ct-l', gallery:['thumb'] },
    ],
    elevators:[
      { id:'ev-n', name:'North Core', floorFrom:'Lobby', floorTo:'Floor 40', building:'North Tower', gallery:['thumb'], lockGated:true, vendor:'Latch' },
      { id:'ev-s', name:'South Core', floorFrom:'Lobby', floorTo:'Floor 12', building:'South Tower', gallery:[], lockGated:false, vendor:'' },
    ],
  },
  millpark:{
    floorplans:[ mkFp('fp-park','Parkside One',1,1,740,1795,500,'available',1950,1795,1740) ],
    units:[
      mkUnit('u-118','Unit 118','fp-park',1795,740,'Floor 1','Building 1','available','mp-1',true,{},26,44),
      mkUnit('u-226','Unit 226','fp-park',1840,740,'Floor 2','Building 2','available','mp-2',false,{}),
    ],
    amenities:[ { id:'am-rpool', name:'Resort Pool', category:'Pool', level:'mp-c', gallery:['pool','thumb'] } ],
    elevators:[ { id:'ev-b1', name:'Building 1 Lift', floorFrom:'Floor 1', floorTo:'Floor 4', building:'Building 1', gallery:[], lockGated:false, vendor:'' } ],
  },
};
(['uptown', 'wharf', 'bellvista'] as const).forEach((id) => { INVENTORY[id] ={floorplans:[], units:[], amenities:[], elevators:[]}; });
const mkTour = (stops: TourStop[], junctions: Junction[], edges: TourEdge[], startPoints?: Record<string, string>): Tour => ({ stops, junctions, edges, startPoints:startPoints||{}, published:false, publishedAt:null });
export const SEED_TOURS: Record<string, Tour> = {
  luxe: mkTour(
    [ {id:'s1', name:'Rooftop Pool', type:'amenity', icon:'wave', level:'lx-r', floorLabel:'Rooftop', distance:240, duration:4, talkingPoint:'Heated year-round, cabanas, skyline views. Open 5 AM–10 PM.', x:65, y:29},
      {id:'s2', name:'Fitness Center', type:'amenity', icon:'dumbbell', level:'lx-l', floorLabel:'1st Floor', distance:45, duration:3, talkingPoint:'24/7 resident access, Peloton bikes, free weights to 90 lb, yoga studio.', x:52, y:69},
      {id:'s3', name:'Unit 1204', type:'unit', icon:'bed', level:'lx-12', beds:2, floorLabel:'2 Bed · 2 Bath', distance:150, duration:4, talkingPoint:'Corner unit — natural light, walk-in closet, quartz kitchen. $2,400/mo.', x:78, y:75},
      {id:'s4', name:'Leasing Lounge', type:'amenity', icon:'star', level:'lx-l', floorLabel:'Lobby', distance:20, duration:2, talkingPoint:'Co-working lounge with private call booths and a coffee bar.', x:18, y:25} ],
    [ {id:'j1', x:41, y:40, level:'lx-l', label:'Elevator Core'}, {id:'j2', x:82, y:46, level:'lx-r', label:'Roof Landing'},
      {id:'j3', x:30, y:55, level:'lx-12', label:'Floor 12 Landing'}, {id:'j4', x:44, y:52, level:'lx-b', label:'Tower B Entry'} ],
    [ ['s4','j1'],['j1','s2'],['j1','j3'],['j3','s3'],['j1','j2'],['j2','s1'] ],
    { 'Tower A':'j1', 'Tower B':'j4' }
  ),
  cortsky: mkTour(
    [ {id:'s1', name:'Sky Deck', type:'amenity', icon:'star', level:'ct-40', floorLabel:'40th Floor', distance:300, duration:5, talkingPoint:'Panoramic sky deck with fire pits and skyline views.', x:60, y:30},
      {id:'s2', name:'Unit 3302', type:'unit', icon:'bed', level:'ct-33', beds:1, floorLabel:'1 Bed · 1 Bath', distance:120, duration:4, talkingPoint:'High-floor 1 bed with floor-to-ceiling glass. $2,100/mo.', x:40, y:62} ],
    [ {id:'j1', x:50, y:46, level:'ct-l', label:'Elevator Core'}, {id:'j2', x:52, y:44, level:'ct-33', label:'Floor 33 Landing'} ],
    [ ['j1','j2'],['j2','s2'],['j1','s1'] ],
    { 'North Tower':'j1' }
  ),
  millpark: mkTour(
    [ {id:'s1', name:'Resort Pool', type:'amenity', icon:'wave', level:'mp-c', floorLabel:'Courtyard', distance:180, duration:4, talkingPoint:'Resort-style saltwater pool and grilling pavilion.', x:55, y:40},
      {id:'s2', name:'Fitness Studio', type:'amenity', icon:'dumbbell', level:'mp-1', floorLabel:'Clubhouse', distance:90, duration:3, talkingPoint:'Fitness studio with on-demand classes.', x:35, y:60} ],
    [ {id:'j1', x:48, y:52, level:'mp-1', label:'Building 1 Entry'} ],
    [ ['j1','s2'],['j1','s1'] ],
    { 'Building 1':'j1' }
  ),
  uptown: mkTour([], [], [], {}),
  wharf: mkTour([], [], [], {}),
  bellvista: mkTour([], [], [], {}),
};
export const LOCK_VENDORS: Array<{ id: string; name: string; note: string }> = [
  { id:'remotelock', name:'RemoteLock / EdgeState', note:'Cloud access platform' },
  { id:'dwelo', name:'Dwelo', note:'Smart apartment hub' },
  { id:'zerv', name:'Zerv', note:'Mobile credential' },
  { id:'latch', name:'Latch', note:'Time-boxed digital keys' },
  { id:'igloohome', name:'Igloohome', note:'Offline PIN codes' },
  { id:'schlage', name:'Schlage', note:'Encode smart deadbolt' },
  { id:'yale', name:'Yale', note:'Assure lock' },
];
export const CRM_VENDOR_DEFS: Array<{ name: string; note: string }> = [
  { name:'PSI / Entrata', note:'Entrata lead inbox via PSI' },
  { name:'Yardi RentCafe', note:'RentCafe guest card API' },
  { name:'RealPage', note:'OneSite lead push' },
  { name:'Salesforce', note:'Custom lead object' },
  { name:'Knock', note:'Knock CRM prospect sync' },
  { name:'Funnel', note:'Funnel leasing CRM' },
];
export const FEED_VENDOR_DEFS: Array<{ name: string; note: string }> = [
  { name:'RealPage', note:'OneSite availability export' },
  { name:'Yardi RentCafe', note:'RentCafe unit + pricing feed' },
  { name:'AppFolio', note:'AppFolio listings API' },
  { name:'Beans', note:'Beans unit availability' },
  { name:'RentManager', note:'RentManager rmAPI' },
  { name:'Entrata / PSI', note:'Entrata unit availability' },
  { name:'Resman', note:'Resman availability export' },
  { name:'Zaremba', note:'Zaremba property feed' },
  { name:'Generic XML Feed', note:'Any MITS-compatible XML URL' },
];
export const IDV_VENDOR_DEFS: Array<{ name: string; note: string }> = [
  { name:'Persona', note:'Government ID + selfie match' },
];
export const CRM_VENDORS = CRM_VENDOR_DEFS.map(v=>v.name);
export const FEED_VENDORS = FEED_VENDOR_DEFS.map(v=>v.name);
export const VENDOR_DEFS = { crm:CRM_VENDOR_DEFS, feed:FEED_VENDOR_DEFS, idv:IDV_VENDOR_DEFS };
export const CATEGORY_META: Record<string, { label: string; sub: string; icon: string; actionLabel: string; metaLabel: string }> = {
  crm:{ label:'Lead-Sync CRM', sub:'One CRM receives every tour lead from this property', icon:'pms', actionLabel:'Re-sync Leads', metaLabel:'Leads pushed (30d)' },
  feed:{ label:'Availability / Unit-Data Feed', sub:'One feed supplies live unit, pricing, and availability data', icon:'pms', actionLabel:'Pull Feed Now', metaLabel:'Units in feed' },
  idv:{ label:'Identity Verification', sub:'Verifies a visitor before a self-guided tour begins', icon:'id', actionLabel:'Preview Consent Copy', metaLabel:'Consent copy' },
};
export const ILS_PARTNERS: Array<{ id: string; name: string; note: string }> = [
  { id:'rent', name:'Rent.com', note:'Rent Group network' },
  { id:'apartments', name:'Apartments.com', note:'CoStar network' },
  { id:'apartmentlist', name:'ApartmentList', note:'Match-based ILS' },
  { id:'propexo', name:'Propexo', note:'Unified listing API' },
];
export const PROD_LABEL: Record<string, string> = { touch:'Pynwheel Touch', tour:'Self-Guided Tour', maps:'Pynwheel Maps' };
export const TOUCH_DISPLAYS: Array<{ id: string; label: string }> = [{id:'portrait',label:'Portrait Kiosk'},{id:'landscape',label:'Landscape Kiosk'},{id:'wall',label:'Wall Display'},{id:'tablet',label:'Tablet'}];
export const IDV_PROVIDERS: Array<{ id: string; label: string }> = [{id:'persona',label:'Persona'},{id:'jumio',label:'Jumio'},{id:'proof',label:'Proof / Notarize'},{id:'manual',label:'Manual Front-Desk'},{id:'none',label:'None'}];
export const MAP_DISPLAYS: Array<{ id: string; label: string }> = [{id:'2d3d',label:'2D + 3D'},{id:'2d',label:'2D Only'},{id:'3d',label:'3D Only'},{id:'sat',label:'Satellite'}];
export interface TouchSettings { display: string; mdu: boolean; idv: string; enableLocks: boolean; startDate: string }
export interface TourSettings { startDate: string }
export interface MapsSettings { beans3d: boolean; svgMode: boolean; autoWayfind: boolean; display: string; gestureIcons: boolean }
export interface ProductSettings { touch: TouchSettings; tour: TourSettings; maps: MapsSettings }
export interface SvgOptRecord { status: string; sizeKb: number; last: string }

export const PROD_ENABLED_SEED: Record<string, Record<string, boolean>> = {};
export const PROD_SETTINGS_SEED: Record<string, ProductSettings> = {};
export const SVG_OPT_SEED: Record<string, SvgOptRecord> = {};
SEED_PROPS.forEach((p) => { const on = (r: string) =>!!r && r!=='\u2014' && r!=='—';
  PROD_ENABLED_SEED[p.id] = { touch:on(p.billing.touch), tour:on(p.billing.tour), maps:on(p.billing.maps) };
  PROD_SETTINGS_SEED[p.id] = {
    touch:{ display:'portrait', mdu:(p.buildings||[]).length>1, idv:'persona', enableLocks:p.lock==='ok', startDate:'2026-02-01' },
    tour:{ startDate:'2026-02-01' },
    maps:{ beans3d:!!p.has3D, svgMode:true, autoWayfind:true, display:p.has3D?'2d3d':'2d', gestureIcons:true } };
  const seed = [...p.id].reduce((x: number, c: string) => x + c.charCodeAt(0), 0);
  SVG_OPT_SEED[p.id] = { status:(seed%3===0?'needs':'valid'), sizeKb:130+seed%240, last:(seed%3===0?'Never':'Jul '+(9+seed%18)+', 2026') };
});
export const LOCK_SEED: Record<string, Record<string, DotState>> = {
  luxe:{ latch:'ok' },
  uptown:{ remotelock:'ok' },
  wharf:{},
  cortsky:{ latch:'ok' },
  bellvista:{ schlage:'ok' },
  millpark:{ zerv:'ok' },
};
/**
 * A stable four-character suffix for a masked credential.
 *
 * Seed data is evaluated once on the server and again in the browser, so this
 * has to be derived from the vendor id rather than randomised — otherwise the
 * two renders disagree and React discards the server HTML.
 */
const credSuffix = (vid: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < vid.length; i += 1) {
    hash = ((hash ^ vid.charCodeAt(i)) >>> 0) * 16777619 >>> 0;
  }
  return hash.toString(36).slice(-4).padStart(4, '0');
};

const mkLock = (v: DotState | undefined, vid: string, name: string, units: number): LockConnection => {
  const base = { id:vid, name, note:(LOCK_VENDORS.find(x=>x.id===vid) || { note:'' }).note };
  if(!v) return {...base, on:false, status:'Not Connected', statusV:'neutral', cred:'—', locks:0, mapped:0, lastTest:'—', instructions:false};
  const st: { status: string; statusV: Variant; lastTest: string } =
    v==='ok'?{status:'Connected', statusV:'ok', lastTest:'Passed 12m ago'} : v==='warn'?{status:'Degraded', statusV:'warn', lastTest:'Slow response'} : {status:'Auth Error', statusV:'crit', lastTest:'Failed 3h ago'};
  const n = Math.max(4, Math.round(units/(vid==='latch'?6:4)));
  return {...base, on:true, ...st, cred:vid.slice(0,2)+'_live_••••'+credSuffix(vid), locks:n, mapped:v==='ok'?n:Math.round(n*0.6), instructions:v!=='crit'};
};
export const LATCH_KEYS: Record<string, Array<{ visitor: string; unit: string; window: string; state: string; v: Variant; issued: string }>> = {
  luxe:[
    { visitor:'Jordan Ellis', unit:'Unit 1204', window:'Today 2:00–3:00 PM', state:'Active', v:'live', issued:'12m ago' },
    { visitor:'Amara Cole', unit:'Unit 0810 + Lobby', window:'Today 4:30–5:30 PM', state:'Scheduled', v:'info', issued:'1h ago' },
    { visitor:'Ben Ortiz', unit:'Unit 1512', window:'Yesterday 11:00 AM', state:'Expired', v:'neutral', issued:'1d ago' },
  ],
  cortsky:[
    { visitor:'Renee Park', unit:'Unit 2201 + Pool Deck', window:'Today 1:15–2:15 PM', state:'Active', v:'live', issued:'30m ago' },
    { visitor:'Devon Blake', unit:'Unit 0304', window:'Tomorrow 10:00 AM', state:'Scheduled', v:'info', issued:'3h ago' },
  ],
  millpark:[
    { visitor:'Kai Nomura', unit:'Unit 118', window:'Today 5:00–6:00 PM', state:'Scheduled', v:'info', issued:'2h ago' },
  ],
};
export const PROP_ANALYTICS: Record<string, { tours: number; completion: number; conversion: number; surf: number[]; dev: number[] }> = {
  luxe:      { tours:1510, completion:68, conversion:11.1, surf:[36,30,18,10,6], dev:[54,31,11,4] },
  uptown:    { tours:980,  completion:60, conversion:8.5,  surf:[30,34,14,14,8], dev:[49,36,11,4] },
  wharf:     { tours:0,    completion:0,  conversion:0,    surf:[0,0,0,0,0],     dev:[0,0,0,0] },
  cortsky:   { tours:1840, completion:71, conversion:12.4, surf:[35,24,26,11,4], dev:[62,22,12,4] },
  bellvista: { tours:420,  completion:55, conversion:6.2,  surf:[41,26,9,16,8],  dev:[57,25,14,4] },
  millpark:  { tours:1120, completion:64, conversion:9.8,  surf:[32,25,25,13,5], dev:[63,20,13,4] },
};
export const SEED_THREADS: Record<string, Array<{ who: string; name: string; text: string; when: string }>> = {
  c1:[ {who:'visitor', name:'Jordan Ellis', text:'Is the rooftop open past 10pm?', when:'2m ago'} ],
  c2:[ {who:'visitor', name:'Amara Cole', text:'Can I see 1204 today instead?', when:'6m ago'} ],
  c3:[ {who:'visitor', name:'Renee Park', text:'What\u2019s the pet fee for two cats?', when:'11m ago'} ],
  c4:[ {who:'visitor', name:'Tess Whitfield', text:'Is parking included?', when:'20m ago'},
       {who:'staff', name:'Tom Becker', text:'Covered parking is $125/mo per vehicle \u2014 I can hold a spot for you.', when:'19m ago'},
       {who:'visitor', name:'Tess Whitfield', text:'Thanks, that helps!', when:'18m ago'} ],
  c5:[ {who:'staff', name:'Marcus Hale', text:'Thursday at 2 works \u2014 I\u2019ll have the key ready.', when:'1h ago'},
       {who:'visitor', name:'Devon Blake', text:'Sounds good \u2014 see you Thursday.', when:'1h ago'} ],
  c6:[ {who:'visitor', name:'Kai Nomura', text:'Anyone available to chat?', when:'3m ago'} ],
};
export const TRANSCRIPTS: Record<number, Array<{ who: string; text: string; when: string }>> = {
  0:[ {who:'visitor', text:'Is this a good neighborhood for families with kids?', when:'Yesterday 3:12 PM'},
      {who:'concierge', text:'I can share the schools and parks within a mile \u2014 I can\u2019t characterize who a neighborhood suits.', when:'Yesterday 3:12 PM'} ],
  1:[ {who:'visitor', text:'I want to speak to a human agent right now.', when:'Yesterday 4:41 PM'},
      {who:'concierge', text:'Connecting you with the leasing team.', when:'Yesterday 4:41 PM'} ],
  2:[ {who:'visitor', text:'Can you waive the application fee if I sign today?', when:'Today 9:02 AM'},
      {who:'concierge', text:'Fee changes are set by the property \u2014 I\u2019ve flagged this for the leasing team.', when:'Today 9:02 AM'} ],
};
export const ACCESS_LOG: Array<{ lock: string; vendor: string; user: string; property: string; when: string; result: string; v: Variant }> = [
  { lock:'Latch · Unit 1204', vendor:'Latch', user:'Jordan Ellis', property:'Luxe Mile High', when:'Today 2:04 PM', result:'Granted', v:'ok' },
  { lock:'RemoteLock · Lobby Entry', vendor:'RemoteLock', user:'Jordan Ellis', property:'Luxe Mile High', when:'Today 2:01 PM', result:'Granted', v:'ok' },
  { lock:'Schlage · Unit 0907', vendor:'Schlage', user:'Amara Cole', property:'Luxe Mile High', when:'Today 1:52 PM', result:'Denied — auth error', v:'crit' },
  { lock:'Latch · Pool Deck', vendor:'Latch', user:'Renee Park', property:'Cortland Sky', when:'Today 1:31 PM', result:'Granted', v:'ok' },
  { lock:'Yale · Unit 2201', vendor:'Yale', user:'Renee Park', property:'Cortland Sky', when:'Today 1:22 PM', result:'Granted', v:'ok' },
  { lock:'Dwelo · Elevator Bank B', vendor:'Dwelo', user:'Devon Blake', property:'Cortland Sky', when:'Today 12:48 PM', result:'Denied — outside tour window', v:'crit' },
  { lock:'Zerv · Building 2 Entry', vendor:'Zerv', user:'Kai Nomura', property:'Mill Creek Parkside', when:'Today 11:36 AM', result:'Granted', v:'ok' },
  { lock:'Igloohome · Unit 0412', vendor:'Igloohome', user:'Tess Whitfield', property:'Alliance Uptown Residences', when:'Today 10:15 AM', result:'Granted', v:'ok' },
  { lock:'RemoteLock · Fitness Center', vendor:'RemoteLock', user:'Tess Whitfield', property:'Alliance Uptown Residences', when:'Today 10:09 AM', result:'Granted', v:'ok' },
  { lock:'Schlage · Unit 1103', vendor:'Schlage', user:'Marco Diaz', property:'Bell Vista', when:'Yesterday 4:41 PM', result:'Denied — lock offline', v:'crit' },
];
export const SEED_INTEG: Record<string, PropertyIntegrations> = {};
SEED_PROPS.forEach((p) => {
  const map = (v: DotState, vendor: string, key: string, ml: string, mv: string): VendorConnection => v==='ok' ? {status:'Connected', statusV:'ok', connected:true, vendor, key, metaLabel:ml, metaValue:mv, lastTest:'Passed 22m ago'}
    : v==='crit' ? {status:'Auth Error', statusV:'crit', connected:true, vendor, key, metaLabel:ml, metaValue:'Failed 3h ago', lastTest:'Failed 3h ago'}
    : v==='warn' ? {status:'Degraded', statusV:'warn', connected:true, vendor, key, metaLabel:ml, metaValue:'Slow sync', lastTest:'Slow response'}
    : {status:'Not Connected', statusV:'neutral', connected:false, vendor:'', key:'—', metaLabel:ml, metaValue:'—', lastTest:'—'};
  const ls=LOCK_SEED[p.id]||{};
  SEED_INTEG[p.id] = {
    locks: LOCK_VENDORS.map(v=>mkLock(ls[v.id], v.id, v.name, p.units)),
    idv:  map(p.idv, 'Persona', 'per_live_••••9f10', 'Consent copy', 'Configured'),
    crm:  map(p.pms, 'PSI / Entrata', 'psi_live_••••3d41', 'Leads pushed (30d)', '412'),
    feed: map(p.pms==='neutral'?'neutral':'ok', 'Yardi RentCafe', 'rc_feed_•••• 8b02', 'Units in feed', String(p.units)),
    ils:  { rent:isProdStage(p.stage), apartments:isProdStage(p.stage), apartmentlist:p.id==='luxe'||p.id==='cortsky', propexo:p.id==='cortsky' },
  };
});
export const SEED_BUILDS: Record<string, Array<{ version: string; platform: string; status: string; variant: Variant; by: string; when: string }>> = {
  luxe:[
    {version:'v5.1.4 (117)', platform:'iOS + Android', status:'Live', variant:'ok', by:'CI Pipeline', when:'6d ago'},
    {version:'v5.1.3 (116)', platform:'Android', status:'Rejected', variant:'crit', by:'Alex Morgan', when:'8d ago'},
    {version:'v5.1.2 (115)', platform:'iOS + Android', status:'Live', variant:'ok', by:'CI Pipeline', when:'21d ago'},
  ],
};
export const SEED_USERS: AppUser[] = [
  {id:'u1', name:'Alex Morgan', email:'alex@pynwheel.com', org:'— Pynwheel —', role:'Platform Admin', status:'Active', statusV:'ok', self:true},
  {id:'u2', name:'Sam Ito', email:'sam@pynwheel.com', org:'— Pynwheel —', role:'Platform Admin', status:'Active', statusV:'ok'},
  {id:'u3', name:'Dana Reyes', email:'dana@allianceres.com', org:'Alliance Residential', role:'Property Manager', status:'Active', statusV:'ok'},
  {id:'u4', name:'Priya Nair', email:'priya@cortland.com', org:'Cortland', role:'Leasing-Concierge', status:'Active', statusV:'ok'},
  {id:'u5', name:'Tom Becker', email:'tbecker@bellpartners.com', org:'Bell Partners', role:'Corporate Viewer', status:'Active', statusV:'ok'},
  {id:'u6', name:'Grace Lin', email:'grace@mcrtrust.com', org:'Mill Creek Residential', role:'Property Manager', status:'Active', statusV:'ok'},
  {id:'u7', name:'Ana Ortiz', email:'ana@willowbridge.com', org:'Willow Bridge', role:'Leasing-Concierge', status:'Pending', statusV:'warn'},
];
export const ROLE_STYLE: Record<string, { c: string; b: string }> = { 'Platform Admin':{c:'#C62534',b:'#FDEDEF'}, 'Property Manager':{c:'#7B3A87',b:'#F2E9F4'}, 'Leasing-Concierge':{c:'#4A7212',b:'#EEF5E1'}, 'Corporate Viewer':{c:'#4A5163',b:'#EEF0F4'} };
export const DOTCOLOR: Record<DotState, string> = { ok:'#5C8E1C', warn:'#C9A200', crit:'#E03B45', neutral:'#B4BAC6' };
export const STOP_ICONS: string[] = ['pin','wave','dumbbell','star','bed'];
