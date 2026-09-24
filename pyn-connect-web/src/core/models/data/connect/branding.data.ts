export interface StarterTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  note: string;
}

export interface PropertyTheme {
  theme: string;
  primary: string;
  secondary: string;
  font: string;
  weight: string;
  size: number;
  align: 'left' | 'center' | 'right';
  navStyle: string;
  markerColor: string;
  markerSize: string;
  hero: string;
  kickoff: boolean;
  logoPrimary: boolean;
  logoSecondary: boolean;
}
