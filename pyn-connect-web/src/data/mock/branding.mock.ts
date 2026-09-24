/** Design System & Branding demo data, lifted from the design. */
import type { PropertyTheme, StarterTheme } from '~/core/models/data/connect/branding.data';

// ---- Design System & Branding ----
export const STARTER_THEMES: StarterTheme[] = [
  { id:'signature', name:'Pynwheel Signature', primary:'#0077AE', secondary:'#1F1F1F', note:'Blue blade \u00b7 platform default' },
  { id:'slate', name:'Modern Slate', primary:'#3F4A5A', secondary:'#8C97A8', note:'Cool neutral, corporate' },
  { id:'evergreen', name:'Evergreen', primary:'#4A7212', secondary:'#A8CE7A', note:'Green blade \u00b7 garden-style communities' },
  { id:'coastal', name:'Coastal', primary:'#0090D0', secondary:'#7FC6E8', note:'Blue blade \u00b7 waterfront properties' },
  { id:'sunset', name:'Sunset Coral', primary:'#E03B45', secondary:'#FFC53D', note:'Bright, lifestyle-forward' },
  { id:'noir', name:'Urban Noir', primary:'#1F1F1F', secondary:'#6E6E6E', note:'High-contrast, luxury high-rise' },
  { id:'plum', name:'Deep Plum', primary:'#7B3A87', secondary:'#C29ACA', note:'Purple blade \u00b7 boutique, design-led' },
  { id:'sand', name:'Pinwheel Gold', primary:'#8A6A00', secondary:'#E3CE8A', note:'Gold blade \u00b7 warm and classic' },
];
export const FONT_FAMILIES: string[] = ['Manrope','Montserrat','Blinker','Manuale'];
export const FONT_WEIGHTS: string[] = ['Regular 400','Medium 500','SemiBold 600','Bold 700'];
export const HERO_MEDIA: Array<{ id: string; label: string; note: string }> = [
  { id:'images', label:'Static Image Set', note:'3\u20136 stills, cross-faded' },
  { id:'video', label:'Looping Video', note:'Muted MP4 loop, 10\u201320s' },
];
export const NAV_BTN_STYLES: Array<{ id: string; label: string }> = [
  { id:'solid', label:'Solid Fill' },
  { id:'outline', label:'Outline' },
  { id:'soft', label:'Soft Tint' },
];
export const MARKER_SIZES: string[] = ['Small','Medium','Large'];
export const SEED_THEME: Record<string, PropertyTheme> = {
  luxe:{ theme:'noir', primary:'#1F1F1F', secondary:'#6E6E6E', font:'Manrope', weight:'Bold 700', size:16, align:'left', navStyle:'solid', markerColor:'#0077AE', markerSize:'Medium', hero:'video', kickoff:true, logoPrimary:true, logoSecondary:true },
  uptown:{ theme:'signature', primary:'#0077AE', secondary:'#1F1F1F', font:'Manrope', weight:'SemiBold 600', size:16, align:'left', navStyle:'solid', markerColor:'#0077AE', markerSize:'Medium', hero:'images', kickoff:true, logoPrimary:true, logoSecondary:false },
  wharf:{ theme:'coastal', primary:'#0090D0', secondary:'#7FC6E8', font:'Montserrat', weight:'Bold 700', size:16, align:'center', navStyle:'outline', markerColor:'#0090D0', markerSize:'Medium', hero:'images', kickoff:false, logoPrimary:false, logoSecondary:false },
  cortsky:{ theme:'plum', primary:'#7B3A87', secondary:'#C29ACA', font:'Manrope', weight:'Bold 700', size:18, align:'left', navStyle:'soft', markerColor:'#7B3A87', markerSize:'Large', hero:'video', kickoff:true, logoPrimary:true, logoSecondary:true },
  bellvista:{ theme:'evergreen', primary:'#4A7212', secondary:'#A8CE7A', font:'Manrope', weight:'SemiBold 600', size:14, align:'left', navStyle:'solid', markerColor:'#4A7212', markerSize:'Small', hero:'images', kickoff:false, logoPrimary:true, logoSecondary:false },
  millpark:{ theme:'sand', primary:'#8A6A00', secondary:'#E3CE8A', font:'Manrope', weight:'Bold 700', size:16, align:'left', navStyle:'soft', markerColor:'#8A6A00', markerSize:'Medium', hero:'images', kickoff:true, logoPrimary:true, logoSecondary:true },
};
export const KICKOFF_PALETTE: string[] = ['#0077AE','#4A7212','#0090D0','#7B3A87','#8A6A00','#1F1F1F'];

