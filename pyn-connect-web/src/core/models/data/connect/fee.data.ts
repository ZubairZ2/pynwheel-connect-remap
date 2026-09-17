export type FeeUnitKey = 'flat' | 'applicant' | 'pet' | 'vehicle' | 'month';
export type PcLogicKey = 'fixed' | 'range' | 'percent' | 'unittype' | 'varies';
export type PcFreqKey = 'monthly' | 'onetime' | 'situational';
export type PcMultKey = 'none' | 'applicant' | 'pet';

/** The simple estimator row used by the legacy fee editor. */
export interface Fee {
  id: string;
  label: string;
  amount: number;
  unit: FeeUnitKey;
  on: boolean;
}

export interface FeeSet {
  published: boolean;
  draftDirty: boolean;
  fees: Fee[];
}

/** The richer fee used by the Pricing Calculator builder. */
export interface PcFee {
  id: string;
  label: string;
  logic: PcLogicKey;
  base: number;
  max: number;
  freq: PcFreqKey;
  mult: PcMultKey;
  visible: boolean;
  qtyEnabled: boolean;
  qtyMin: number;
  qtyMax: number;
  displayText: string;
  preText: string;
  postText: string;
}

export interface PcCategory {
  id: string;
  name: string;
  fees: PcFee[];
}

export interface PcSet {
  published: boolean;
  draftDirty: boolean;
  cats: PcCategory[];
}
