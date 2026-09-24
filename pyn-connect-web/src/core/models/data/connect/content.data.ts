export type PageTypeKey = 'embed' | 'link' | 'gallery' | 'slideshow';

export interface ContentPage {
  id: string;
  title: string;
  type: PageTypeKey;
  detail: string;
  onHome: boolean;
}

export interface HomeTile {
  id: string;
  label: string;
  icon: string;
  cropped: boolean;
}

export interface BrochureLink {
  id: string;
  label: string;
  url: string;
  on: boolean;
}

export interface Neighborhood {
  center: string;
  radius: number;
  cats: string[];
  calls: number;
}

export interface PoiResult {
  name: string;
  cat: string;
  dist: string;
  rating: string;
}
