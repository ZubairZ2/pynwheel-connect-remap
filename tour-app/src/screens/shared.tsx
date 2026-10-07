import type { ReactNode } from 'react';
import { HomeIndicator, StatusArea } from '~/components/chrome';

/**
 * The two screen shells of the reference: the light one (white, dark
 * status bar glyphs, scrolling body, an optional footer above the home
 * indicator) and the dark one (black or a photo, white glyphs, absolutely
 * positioned content).
 */

export const LightShell = ({ children, footer, scroll = true, className, bodyClassName }: { children: ReactNode; footer?: ReactNode; scroll?: boolean; className?: string; bodyClassName?: string }) => (
  <div className={`pw-screen${className ? ` ${className}` : ''}`}>
    <StatusArea />
    <div className={`pw-screen__body${scroll ? ' pw-screen__body--scroll' : ''}${bodyClassName ? ` ${bodyClassName}` : ''}`}>{children}</div>
    {footer}
    <HomeIndicator />
  </div>
);

export const DarkShell = ({ children, className, background, statusBar = true }: { children: ReactNode; className?: string; background?: ReactNode; statusBar?: boolean }) => (
  <div className={`pw-screen pw-screen--dark${className ? ` ${className}` : ''}`}>
    {background}
    {statusBar ? <StatusArea dark /> : <div className="pw-status" aria-hidden />}
    {children}
  </div>
);

export const SectionLabel = ({ children, className }: { children: ReactNode; className?: string }) => <div className={`pw-sectionlabel${className ? ` ${className}` : ''}`}>{children}</div>;

/** Strips the trailing dummy marker from a value, for places where the marker is drawn separately. */
export const plain = (value: string): string => value.replace(/ \*$/, '');
