import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pynwheel Connect',
  description: 'The back office behind Self-Guided Tour, Pynwheel Map and Pynwheel Touch.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The fonts (Manrope for the UI, Inter for Beans floor SVG labels) are served
  // from this origin through @font-face rules in globals.css: a stylesheet from
  // fonts.googleapis.com in this head blocked every first paint until Google
  // answered (performance audit, October 11, 2026: C4).
  //
  // suppressHydrationWarning on <body> only: browser extensions (Grammarly's
  // data-gr-* attributes, ColorZilla's cz-shortcut-listen) add attributes to
  // the body before React hydrates, and React 19 logs a hydration mismatch for
  // them in development. The flag covers that one element's attributes, not
  // its children, so real mismatches in the page tree still get reported.
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
