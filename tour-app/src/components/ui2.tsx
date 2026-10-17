import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/* ───────── The design refresh's building blocks (October 17, 2026) ───────── */

/** A small uppercase section label ("DATE", "PHOTOS"). */
export const Eyebrow = ({ children, className }: { children: ReactNode; className?: string }) => <div className={`pw-eyebrow${className ? ` ${className}` : ''}`}>{children}</div>;

/** A pill chip that is on or off (the design's `chip(on)`). */
export const Chip = ({ on, onClick, children, size = 'md', className }: { on: boolean; onClick: () => void; children: ReactNode; size?: 'sm' | 'md'; className?: string }) => (
  <button type="button" className={`pw-chip pw-chip--${size}${on ? ' pw-chip--on' : ''}${className ? ` ${className}` : ''}`} onClick={onClick} aria-pressed={on}>
    {children}
  </button>
);

/** The segmented control on a grey track (tour length, text / email, list / map). */
export const Segmented = <T extends string>({ options, value, onChange, dark = false }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (id: T) => void; dark?: boolean }) => (
  <div className={`pw-seg${dark ? ' pw-seg--dark' : ''}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="tablist">
    {options.map((o) => (
      <button key={o.id} type="button" role="tab" aria-selected={value === o.id} className={`pw-seg__btn${value === o.id ? ' pw-seg__btn--on' : ''}`} onClick={() => onChange(o.id)}>
        {o.label}
      </button>
    ))}
  </div>
);

/** A row in a bordered list: icon circle, title + sub, trailing chevron or badge. */
export const LinkRow = ({ icon, title, sub, badge, onClick, danger = false, trailing }: { icon?: IconName; title: ReactNode; sub?: ReactNode; badge?: ReactNode; onClick: () => void; danger?: boolean; trailing?: ReactNode }) => (
  <button type="button" className={`pw-linkrow${danger ? ' pw-linkrow--danger' : ''}`} onClick={onClick}>
    {icon ? (
      <span className="pw-linkrow__icon">
        <Icon name={icon} size={16} />
      </span>
    ) : null}
    <span className="pw-linkrow__text">
      <span className="pw-linkrow__title">{title}</span>
      {sub ? <span className="pw-linkrow__sub">{sub}</span> : null}
    </span>
    {badge != null ? <span className="pw-linkrow__badge">{badge}</span> : null}
    {trailing ?? <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />}
  </button>
);

/** The round 34 px action button with a primary-coloured glyph (call, chat). */
export const RoundAction = ({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) => (
  <button type="button" className="pw-roundaction" aria-label={label} title={label} onClick={onClick}>
    <Icon name={icon} size={15} />
  </button>
);

/** A numbered step row ("1 · Pick a property and a time"). */
export const NumberedStep = ({ n, title, sub, tone = 'primary' }: { n: ReactNode; title: ReactNode; sub?: ReactNode; tone?: 'primary' | 'soft' }) => (
  <div className="pw-numstep">
    <span className={`pw-numstep__n pw-numstep__n--${tone}`}>{n}</span>
    <span className="pw-numstep__text">
      <span className="pw-numstep__title">{title}</span>
      {sub ? <span className="pw-numstep__sub">{sub}</span> : null}
    </span>
  </div>
);

/** The warm-yellow callout the design uses for warnings (never red chrome); `info` and `live` are its calm siblings. */
export const Callout = ({ title, body, action, tone = 'warn' }: { title?: ReactNode; body: ReactNode; action?: ReactNode; tone?: 'warn' | 'info' | 'live' }) => (
  <div className={`pw-callout pw-callout--${tone}`}>
    {tone === 'warn' ? <Icon name="warning" size={16} className="pw-callout__icon" /> : tone === 'live' ? <Icon name="check" size={14} className="pw-callout__icon pw-callout__icon--check" strokeWidth={3} /> : <Icon name="bell" size={16} className="pw-callout__icon" />}
    <div className="pw-callout__text">
      {title ? <div className="pw-callout__title">{title}</div> : null}
      <div className="pw-callout__body">{body}</div>
      {action ? <div className="pw-callout__action">{action}</div> : null}
    </div>
  </div>
);

/** A status pill in one of the design's tones. */
export const TonePill = ({ tone, children }: { tone: 'primary' | 'live' | 'warn' | 'muted' | 'danger'; children: ReactNode }) => <span className={`pw-tonepill pw-tonepill--${tone}`}>{children}</span>;

/** The grey "demo" caption under a UI-only feature. */
export const DemoNote = ({ children }: { children: ReactNode }) => <div className="pw-demonote">{children}</div>;
