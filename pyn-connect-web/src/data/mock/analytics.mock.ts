/** Analytics & Reports demo data, lifted from the design. */
import type {
  DeviceSlice,
  ReportDef,
  ReportRun,
  Surface
} from '~/core/models/data/connect/engagement.data';

// ---- Analytics & Reports ----
export const DATE_RANGES: string[] = ['Last 7 days','Last 30 days','Last 90 days','Year to date','Custom'];
export const SURFACES: Surface[] = [
  { id:'maps', label:'Maps', note:'Interactive site map', sessions:14820, pct:34, delta:'+8.2%' },
  { id:'touch', label:'Touch / Kiosk', note:'On-site leasing office', sessions:11640, pct:27, delta:'+4.1%' },
  { id:'selfguided', label:'Self-Guided Tour App', note:'Visitor phone app', sessions:9310, pct:21, delta:'+16.4%' },
  { id:'sdk', label:'Embeddable SDK Map', note:'Partner websites', sessions:5470, pct:13, delta:'+22.9%' },
  { id:'web', label:'Web Embed', note:'Property marketing site', sessions:2180, pct:5, delta:'-1.8%' },
];
export const DEVICE_SPLIT: DeviceSlice[] = [
  { label:'Mobile', pct:58, color:'var(--bo-accent)' },
  { label:'Kiosk', pct:27, color:'#EC4E8C' },
  { label:'Desktop', pct:11, color:'#4A7212' },
  { label:'Tablet', pct:4, color:'#8A92A3' },
];
export const REPORT_DEFS: ReportDef[] = [
  { id:'webpages', name:'Webpages Report', note:'Page-level traffic and engagement per property', fmt:'CSV', cadence:'On demand' },
  { id:'sessions', name:'Sessions Report', note:'Every session with surface, device, duration, and outcome', fmt:'CSV', cadence:'On demand' },
  { id:'unplotted', name:'Unplotted Units Report', note:'Units in inventory not yet placed on a map', fmt:'CSV', cadence:'Weekly' },
  { id:'feedback', name:'Tour Feedback Report', note:'Post-tour ratings and free-text comments', fmt:'CSV', cadence:'Monthly' },
  { id:'partner', name:'Partner Performance Report', note:'ILS syndication and referral traffic by partner', fmt:'XLSX', cadence:'Monthly' },
  { id:'account', name:'Account Summary', note:'Properties, deployment stage, and billing rates per company', fmt:'PDF', cadence:'Monthly' },
  { id:'access', name:'Lock Access Report', note:'All lock events by property, user, and result', fmt:'CSV', cadence:'On demand' },
  { id:'bookings', name:'Bookings Report', note:'Scheduled tours, types, capacity use, and CRM sync state', fmt:'CSV', cadence:'Weekly' },
];
export const SEED_REPORT_RUNS: Record<string, ReportRun> = {
  unplotted:{ when:'Ran 2d ago', by:'Alex Morgan' },
  sessions:{ when:'Ran 6h ago', by:'Grace Lin' },
  account:{ when:'Ran 3w ago', by:'Alex Morgan' },
};
