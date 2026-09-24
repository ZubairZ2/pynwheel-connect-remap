/** Tour Scheduling demo data, lifted from the design. */
import type { Variant } from '~/core/models/data/connect/common.data';
import type {
  AbandonedTour,
  Booking,
  DayHours,
  GdprKey,
  HelpSection,
  HoldKey,
  HoldStyle,
  TourType,
  TourTypeKey,
  Visitor
} from '~/core/models/data/connect/scheduling.data';

// ---- Tour Scheduling ----
export const DEF_HOURS: Record<string, DayHours> = { Mon:{on:true,open:'09:00',close:'18:00'}, Tue:{on:true,open:'09:00',close:'18:00'}, Wed:{on:true,open:'09:00',close:'18:00'}, Thu:{on:true,open:'09:00',close:'18:00'}, Fri:{on:true,open:'09:00',close:'18:00'}, Sat:{on:true,open:'10:00',close:'16:00'}, Sun:{on:false,open:'10:00',close:'16:00'} };
export const DAY_KEYS: string[] = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const mkTourType = (o: Partial<TourType>): TourType => Object.assign({ expanded:false,
  behavior:{ chat:true, idVerify:true, autoZoom:true, camera:false, restricted:false },
  hours:JSON.parse(JSON.stringify(DEF_HOURS)) } as TourType, o);
export const TOUR_TYPES: TourType[] = [
  mkTourType({ id:'self', label:'Self-Guided', icon:'pin', note:'Visitor tours unaccompanied through the touch app', dailyCap:24, slotCap:3, on:true,
    behavior:{ chat:true, idVerify:true, autoZoom:true, camera:true, restricted:false } }),
  mkTourType({ id:'guided', label:'Person-Guided', icon:'users', note:'Leasing staff leads the walkthrough', dailyCap:10, slotCap:1, on:true,
    behavior:{ chat:false, idVerify:false, autoZoom:true, camera:false, restricted:false } }),
  mkTourType({ id:'virtual', label:'Virtual / Remote', icon:'video', note:'Live video tour hosted by an agent', dailyCap:8, slotCap:2, on:true,
    behavior:{ chat:true, idVerify:false, autoZoom:false, camera:false, restricted:true } }),
];
export const BEHAVIOR_DEFS: Array<{ key: keyof TourType['behavior']; label: string; desc: string }> = [
  { key:'chat', label:'In-App Chat / Concierge', desc:'Live human concierge available during the tour' },
  { key:'idVerify', label:'ID Verification Required', desc:'Verify a government ID before the tour starts' },
  { key:'autoZoom', label:'Auto-Zoom on Map', desc:'Map follows the visitor and zooms to the active stop' },
  { key:'camera', label:'Camera Button Enabled', desc:'Visitor can capture photos from inside the app' },
  { key:'restricted', label:'Restricted Access Mode', desc:'Limits doors and areas to the booked route only' },
];
export const TYPE_STYLE: Record<TourTypeKey, { c: string; b: string }> = { self:{c:'#7B3A87',b:'#F2E9F4'}, guided:{c:'#4A7212',b:'#EEF5E1'}, virtual:{c:'#7B3A87',b:'#F2E9F4'} };
export const TYPE_LABEL: Record<TourTypeKey, string> = { self:'Self-Guided', guided:'Person-Guided', virtual:'Virtual' };
export const SYNC_STYLE: Record<string, { label: string; v: Variant }> = { created:{label:'Created in CRM', v:'ok'}, updated:{label:'Updated in CRM', v:'info'}, cancelled:{label:'Cancelled in CRM', v:'crit'}, pending:{label:'Sync Pending', v:'warn'} };
export const SEED_BOOKINGS: Booking[] = [
  { id:'b1', day:0, time:'9:30 AM', visitor:'Jordan Ellis', email:'j.ellis@gmail.com', phone:'(303) 555-0184', type:'self', propId:'luxe', crm:'Yardi RentCafe', sync:'created', hold:'held', r1:'sent', r2:'sent' },
  { id:'b2', day:0, time:'11:00 AM', visitor:'Amara Cole', email:'amara.cole@outlook.com', phone:'(303) 555-0119', type:'guided', propId:'luxe', crm:'Yardi RentCafe', sync:'updated', hold:'held', r1:'sent', r2:'pending' },
  { id:'b3', day:0, time:'2:15 PM', visitor:'Devon Blake', email:'dblake@proton.me', phone:'(404) 555-0277', type:'self', propId:'cortsky', crm:'Knock', sync:'created', hold:'released', r1:'sent', r2:'sent' },
  { id:'b4', day:1, time:'10:00 AM', visitor:'Renee Park', email:'renee.park@gmail.com', phone:'(404) 555-0342', type:'virtual', propId:'cortsky', crm:'Knock', sync:'created', hold:'n/a', r1:'sent', r2:'pending' },
  { id:'b5', day:1, time:'1:00 PM', visitor:'Kai Nomura', email:'kai.n@gmail.com', phone:'(512) 555-0421', type:'self', propId:'millpark', crm:'Funnel', sync:'pending', hold:'held', r1:'pending', r2:'pending' },
  { id:'b6', day:2, time:'9:00 AM', visitor:'Tess Whitfield', email:'tessw@icloud.com', phone:'(214) 555-0166', type:'guided', propId:'uptown', crm:'Yardi RentCafe', sync:'created', hold:'held', r1:'pending', r2:'pending' },
  { id:'b7', day:2, time:'3:30 PM', visitor:'Marco Diaz', email:'m.diaz@gmail.com', phone:'(704) 555-0198', type:'self', propId:'bellvista', crm:'Funnel', sync:'cancelled', hold:'refunded', r1:'sent', r2:'pending' },
  { id:'b8', day:3, time:'11:30 AM', visitor:'Priya Raman', email:'p.raman@gmail.com', phone:'(512) 555-0533', type:'virtual', propId:'millpark', crm:'Funnel', sync:'created', hold:'n/a', r1:'pending', r2:'pending' },
  { id:'b9', day:4, time:'10:30 AM', visitor:'Sam Okafor', email:'sokafor@gmail.com', phone:'(303) 555-0611', type:'self', propId:'luxe', crm:'Yardi RentCafe', sync:'created', hold:'held', r1:'pending', r2:'pending' },
  { id:'b10', day:4, time:'4:00 PM', visitor:'Nina Brandt', email:'nina.b@gmail.com', phone:'(214) 555-0705', type:'guided', propId:'uptown', crm:'Yardi RentCafe', sync:'updated', hold:'held', r1:'pending', r2:'pending' },
];
export const SEED_VISITORS: Visitor[] = [
  { id:'v1', name:'Jordan Ellis', email:'j.ellis@gmail.com', phone:'(303) 555-0184', propId:'luxe', lastTour:'Aug 1, 2026', gdpr:'none' },
  { id:'v2', name:'Amara Cole', email:'amara.cole@outlook.com', phone:'(303) 555-0119', propId:'luxe', lastTour:'Aug 1, 2026', gdpr:'requested' },
  { id:'v3', name:'Devon Blake', email:'dblake@proton.me', phone:'(404) 555-0277', propId:'cortsky', lastTour:'Jul 30, 2026', gdpr:'none' },
  { id:'v4', name:'Renee Park', email:'renee.park@gmail.com', phone:'(404) 555-0342', propId:'cortsky', lastTour:'Jul 29, 2026', gdpr:'none' },
  { id:'v5', name:'Kai Nomura', email:'kai.n@gmail.com', phone:'(512) 555-0421', propId:'millpark', lastTour:'Jul 28, 2026', gdpr:'requested' },
  { id:'v6', name:'Tess Whitfield', email:'tessw@icloud.com', phone:'(214) 555-0166', propId:'uptown', lastTour:'Jul 27, 2026', gdpr:'none' },
  { id:'v7', name:'Marco Diaz', email:'m.diaz@gmail.com', phone:'(704) 555-0198', propId:'bellvista', lastTour:'Jul 24, 2026', gdpr:'removed' },
  { id:'v8', name:'Priya Raman', email:'p.raman@gmail.com', phone:'(512) 555-0533', propId:'millpark', lastTour:'Jul 22, 2026', gdpr:'none' },
  { id:'v9', name:'Sam Okafor', email:'sokafor@gmail.com', phone:'(303) 555-0611', propId:'luxe', lastTour:'Jul 20, 2026', gdpr:'none' },
  { id:'v10', name:'Nina Brandt', email:'nina.b@gmail.com', phone:'(214) 555-0705', propId:'uptown', lastTour:'Jul 18, 2026', gdpr:'requested' },
];
export const GDPR_STYLE: Record<GdprKey, { label: string; v: Variant }> = { none:{label:'Active', v:'ok'}, requested:{label:'Removal Requested', v:'warn'}, removed:{label:'Data Removed', v:'neutral'} };
export const HELP_SECTIONS: HelpSection[] = [
  { id:'properties', name:'Properties & Inventory', icon:'properties', blurb:'Floorplates, floor plans, units, amenities and plotting', items:[
    { id:'h1', title:'Setting Up a New Property', kind:'article', len:'5 min read' },
    { id:'h2', title:'Plotting Units & Amenities on the Map', kind:'video', len:'4:12' },
    { id:'h3', title:'Manual Overrides vs PMS Sync', kind:'article', len:'3 min read' },
  ]},
  { id:'scheduling', name:'Tour Scheduling', icon:'calendar', blurb:'Bookings, tour types, behavior settings and the visitor directory', items:[
    { id:'h4', title:'Configuring Tour Types & Capacity', kind:'article', len:'6 min read' },
    { id:'h5', title:'Behavior Settings & Visiting Hours', kind:'video', len:'5:30' },
    { id:'h6', title:'Handling GDPR Data-Removal Requests', kind:'article', len:'4 min read' },
  ]},
  { id:'pricing', name:'Pricing Calculator', icon:'calc', blurb:'Fee categories, pricing logic and the embeddable widget', items:[
    { id:'h7', title:'Building a Move-In Cost Estimator', kind:'video', len:'6:48' },
    { id:'h8', title:'Fee Logic: Fixed, Range, Percentage & More', kind:'article', len:'5 min read' },
    { id:'h9', title:'Publishing & Embedding the Widget', kind:'article', len:'3 min read' },
  ]},
  { id:'integrations', name:'Integrations', icon:'integrations', blurb:'Locks, lead-sync CRMs and availability feeds', items:[
    { id:'h10', title:'Connecting a Smart-Lock Vendor', kind:'video', len:'4:55' },
    { id:'h11', title:'Switching Availability Feeds Safely', kind:'article', len:'4 min read' },
    { id:'h12', title:'ILS Syndication Bulk Upload', kind:'article', len:'6 min read' },
  ]},
  { id:'branding', name:'Design & White-Label', icon:'builds', blurb:'Branding, logo cropping and white-label build pipeline', items:[
    { id:'h13', title:'Uploading & Cropping Property Logos', kind:'video', len:'3:20' },
    { id:'h14', title:'Optimizing Floor SVGs for the Kiosk', kind:'article', len:'4 min read' },
  ]},
  { id:'admin', name:'Users, Billing & Reports', icon:'users', blurb:'Roles, rate-card rollup, analytics and reports', items:[
    { id:'h15', title:'Roles & Permissions Explained', kind:'article', len:'5 min read' },
    { id:'h16', title:'Reading the Billing Rollup', kind:'article', len:'3 min read' },
    { id:'h17', title:'Scoping Analytics by Region', kind:'video', len:'4:04' },
  ]},
];
export const HOLD_STYLE: Record<HoldKey, HoldStyle> = {
  held:{label:'$50 hold placed', v:'info', note:'Authorized at booking · released after the tour'},
  released:{label:'$50 hold released', v:'ok', note:'Tour completed · authorization voided'},
  refunded:{label:'$50 refunded', v:'ok', note:'Booking cancelled · refund issued by Stripe'},
  'n/a':{label:'No card hold', v:'neutral', note:'Virtual tours skip the card-hold step'},
};
export const ABANDONED: AbandonedTour[] = [
  { visitor:'Casey Lindqvist', propId:'luxe', stop:'Unit 1204', idle:'1h 42m', started:'12:18 PM' },
  { visitor:'Owen Diaz', propId:'millpark', stop:'Fitness Center', idle:'1h 06m', started:'1:04 PM' },
];
export const SLOT_TIMES: string[] = ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM'];
export const DAYS: string[] = ['Mon Mar 2','Tue Mar 3','Wed Mar 4','Thu Mar 5','Fri Mar 6'];
export const PUBLISH_KEY = 'pynwheel_published_tours';

