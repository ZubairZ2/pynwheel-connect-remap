/** Pricing Calculator demo data, lifted from the design. */
import type {
  FeeSet,
  FeeUnitKey,
  PcFee,
  PcFreqKey,
  PcLogicKey,
  PcMultKey,
  PcSet
} from '~/core/models/data/connect/fee.data';

// ---- Pricing Calculator ----
export const FEE_UNITS: Record<FeeUnitKey, string> = { flat:'per application', applicant:'per applicant', pet:'per pet', vehicle:'per vehicle', month:'per month' };
export const SEED_FEES: Record<string, FeeSet> = {
  luxe:{ published:true, draftDirty:false, fees:[
    { id:'f1', label:'Application Fee', amount:75, unit:'applicant', on:true },
    { id:'f2', label:'Administrative Fee', amount:250, unit:'flat', on:true },
    { id:'f3', label:'Security Deposit', amount:500, unit:'flat', on:true },
    { id:'f4', label:'Pet Fee (non-refundable)', amount:400, unit:'pet', on:true },
    { id:'f5', label:'Pet Rent', amount:35, unit:'pet', on:true },
    { id:'f6', label:'Reserved Parking', amount:150, unit:'vehicle', on:true },
    { id:'f7', label:'Storage Unit', amount:75, unit:'month', on:false },
  ]},
  uptown:{ published:true, draftDirty:true, fees:[
    { id:'f1', label:'Application Fee', amount:60, unit:'applicant', on:true },
    { id:'f2', label:'Administrative Fee', amount:200, unit:'flat', on:true },
    { id:'f3', label:'Pet Fee (non-refundable)', amount:350, unit:'pet', on:true },
    { id:'f4', label:'Covered Parking', amount:125, unit:'vehicle', on:true },
  ]},
  wharf:{ published:false, draftDirty:true, fees:[
    { id:'f1', label:'Application Fee', amount:50, unit:'applicant', on:true },
    { id:'f2', label:'Administrative Fee', amount:175, unit:'flat', on:true },
  ]},
  cortsky:{ published:true, draftDirty:false, fees:[
    { id:'f1', label:'Application Fee', amount:85, unit:'applicant', on:true },
    { id:'f2', label:'Administrative Fee', amount:300, unit:'flat', on:true },
    { id:'f3', label:'Security Deposit', amount:750, unit:'flat', on:true },
    { id:'f4', label:'Pet Fee (non-refundable)', amount:450, unit:'pet', on:true },
    { id:'f5', label:'Pet Rent', amount:40, unit:'pet', on:true },
    { id:'f6', label:'Valet Parking', amount:200, unit:'vehicle', on:true },
  ]},
  bellvista:{ published:false, draftDirty:false, fees:[
    { id:'f1', label:'Application Fee', amount:55, unit:'applicant', on:true },
    { id:'f2', label:'Administrative Fee', amount:150, unit:'flat', on:true },
  ]},
  millpark:{ published:true, draftDirty:false, fees:[
    { id:'f1', label:'Application Fee', amount:65, unit:'applicant', on:true },
    { id:'f2', label:'Administrative Fee', amount:225, unit:'flat', on:true },
    { id:'f3', label:'Pet Fee (non-refundable)', amount:375, unit:'pet', on:true },
    { id:'f4', label:'Pet Rent', amount:30, unit:'pet', on:true },
    { id:'f5', label:'Reserved Parking', amount:110, unit:'vehicle', on:true },
  ]},
};

// ---- Pricing Calculator (rich fee builder) ----
export const PC_LOGIC: Record<PcLogicKey, string> = { fixed:'Fixed', range:'Range', percent:'Percentage', unittype:'Unit Type', varies:'Varies' };
export const PC_FREQ: Record<PcFreqKey, string> = { monthly:'Monthly', onetime:'One-Time', situational:'Situational' };
export const PC_MULT: Record<PcMultKey, string> = { none:'None', applicant:'Per Applicant', pet:'Per Pet' };
const mkPFee = (id: string, label: string, logic: PcLogicKey, base: number, max: number, freq: PcFreqKey, mult: PcMultKey, visible: boolean, o?: Partial<PcFee>): PcFee => Object.assign({
  id, label, logic, base, max, freq, mult, visible,
  qtyEnabled:false, qtyMin:1, qtyMax:1, displayText:'', preText:'', postText:'' } as PcFee, o||{});
export const SEED_PCALC: Record<string, PcSet> = {
  luxe:{ published:true, draftDirty:false, cats:[
    { id:'c-move', name:'Application & Move-In', fees:[
      mkPFee('p1','Application Fee','fixed',75,0,'onetime','applicant',true,{displayText:'Per adult applicant, non-refundable.', postText:'Paid at time of application.'}),
      mkPFee('p2','Administrative Fee','fixed',250,0,'onetime','none',true,{postText:'One-time, due at lease signing.'}),
      mkPFee('p3','Security Deposit','range',500,1500,'onetime','none',true,{preText:'Deposit is credit-based.', displayText:'Refundable. Amount set after screening.'}),
      mkPFee('p4','Amenity Fee','percent',3,0,'onetime','none',false,{displayText:'3% of first month rent.'}),
    ]},
    { id:'c-pet', name:'Pet Fees', fees:[
      mkPFee('p5','Pet Fee (non-refundable)','fixed',400,0,'onetime','pet',true,{qtyEnabled:true, qtyMin:0, qtyMax:2, displayText:'Two-pet maximum.'}),
      mkPFee('p6','Pet Rent','fixed',35,0,'monthly','pet',true,{qtyEnabled:true, qtyMin:0, qtyMax:2}),
      mkPFee('p7','Breed Restrictions Apply','varies',0,0,'situational','none',true,{displayText:'Certain breeds restricted \u2014 ask the leasing office.'}),
    ]},
    { id:'c-park', name:'Parking & Storage', fees:[
      mkPFee('p8','Reserved Parking','fixed',150,0,'monthly','none',true,{qtyEnabled:true, qtyMin:0, qtyMax:2}),
      mkPFee('p9','Storage Unit','unittype',75,0,'monthly','none',false,{displayText:'Price varies by unit size (S/M/L).'}),
    ]},
  ]},
};
const seedPcalcFromFees = (): void => {
  const FREQ_OF: Record<FeeUnitKey, PcFreqKey> = { applicant:'onetime', flat:'onetime', pet:'monthly', vehicle:'monthly', month:'monthly' };
  const MULT_OF: Record<FeeUnitKey, PcMultKey> = { applicant:'applicant', pet:'pet', flat:'none', vehicle:'none', month:'none' };
  Object.keys(SEED_FEES).forEach((pid) => { if(SEED_PCALC[pid]) return; const src=SEED_FEES[pid];
    SEED_PCALC[pid]={ published:src.published, draftDirty:src.draftDirty, cats:[{ id:'c-fees', name:'Fees & Deposits',
      fees:src.fees.map((f, i) => mkPFee('p'+(i+1), f.label, /deposit/i.test(f.label)?'range':'fixed', f.amount, /deposit/i.test(f.label)?f.amount*3:0,
        FREQ_OF[f.unit]||'onetime', MULT_OF[f.unit]||'none', f.on, f.unit==='vehicle'?{qtyEnabled:true, qtyMin:0, qtyMax:2}:{})) }] };
  });
};
seedPcalcFromFees();

