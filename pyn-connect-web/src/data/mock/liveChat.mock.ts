/** Live Chat demo data, lifted from the design. */
import type { ChatStaff, Convo } from '~/core/models/data/connect/engagement.data';

// ---- Live Chat ----
export const SEED_CHAT_STAFF: ChatStaff[] = [
  { id:'s1', name:'Dana Reyes', role:'Property Manager', propId:'luxe', online:true, inRotation:true, unread:2, active:1 },
  { id:'s2', name:'Marcus Hale', role:'Leasing-Concierge', propId:'luxe', online:true, inRotation:true, unread:0, active:2 },
  { id:'s3', name:'Ana Ortiz', role:'Leasing-Concierge', propId:'luxe', online:false, inRotation:true, unread:0, active:0 },
  { id:'s4', name:'Tom Becker', role:'Leasing-Concierge', propId:'uptown', online:true, inRotation:true, unread:1, active:1 },
  { id:'s5', name:'Grace Lin', role:'Property Manager', propId:'millpark', online:true, inRotation:false, unread:0, active:0 },
  { id:'s6', name:'Priya Nair', role:'Property Manager', propId:'cortsky', online:true, inRotation:true, unread:1, active:1 },
  { id:'s7', name:'Luis Fuentes', role:'Leasing-Concierge', propId:'cortsky', online:false, inRotation:false, unread:0, active:0 },
];
export const SEED_CONVOS: Convo[] = [
  { id:'c1', visitor:'Jordan Ellis', propId:'luxe', staff:'Marcus Hale', last:'Is the rooftop open past 10pm?', when:'2m ago', unread:2, state:'active' },
  { id:'c2', visitor:'Amara Cole', propId:'luxe', staff:'Dana Reyes', last:'Can I see 1204 today instead?', when:'6m ago', unread:1, state:'active' },
  { id:'c3', visitor:'Renee Park', propId:'cortsky', staff:'Priya Nair', last:'What\u2019s the pet fee for two cats?', when:'11m ago', unread:1, state:'active' },
  { id:'c4', visitor:'Tess Whitfield', propId:'uptown', staff:'Tom Becker', last:'Thanks, that helps!', when:'18m ago', unread:0, state:'active' },
  { id:'c5', visitor:'Devon Blake', propId:'luxe', staff:'Marcus Hale', last:'Sounds good \u2014 see you Thursday.', when:'1h ago', unread:0, state:'closed' },
  { id:'c6', visitor:'Kai Nomura', propId:'millpark', staff:'\u2014', last:'Anyone available to chat?', when:'3m ago', unread:1, state:'unassigned' },
];

