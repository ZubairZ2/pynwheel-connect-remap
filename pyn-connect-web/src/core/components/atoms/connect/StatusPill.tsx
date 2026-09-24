import type { Variant } from '~/core/models/data/connect/common.data';

/**
 * The design system's StatusPill (StatusPill.dc.html), 1:1 — including its
 * label→bucket vocabulary, so `variant="Past Due"` resolves the same way it
 * does in the design.
 */
const MAP: Record<string, string[]> = {
  ok: ['ok', 'connected', 'active', 'live', 'success', 'healthy', 'synced', 'approved', 'paid', 'online', 'enabled'],
  warn: ['warn', 'warning', 'pending', 'building', 'trialing', 'queued', 'in review', 'submitted', 'degraded', 'review'],
  crit: ['crit', 'critical', 'error', 'rejected', 'past due', 'down', 'failed', 'revoked', 'disabled', 'offline'],
  info: ['info', 'draft', 'new'],
  neutral: ['neutral', 'not built', 'not configured', 'not started', 'none', 'n/a', 'archived']
};

const SKIN: Record<string, { bg: string; fg: string; dot: string }> = {
  ok: { bg: '#EEF5E1', fg: '#4A7212', dot: '#5C8E1C' },
  warn: { bg: '#FFF4D4', fg: '#8A6A00', dot: '#C9A200' },
  crit: { bg: '#FDEDEF', fg: '#C62534', dot: '#E03B45' },
  info: { bg: '#F2E9F4', fg: '#7B3A87', dot: '#EC4E8C' },
  neutral: { bg: '#EEF0F4', fg: '#4A5163', dot: '#8A92A3' }
};

export const bucketOf = (variant?: string): keyof typeof SKIN => {
  const value = (variant ?? '').toLowerCase();
  for (const key of Object.keys(MAP)) {
    if (MAP[key].includes(value)) return key as keyof typeof SKIN;
  }
  return 'neutral';
};

interface Props {
  variant?: Variant | string;
  label?: string;
}

export const StatusPill = ({ variant, label }: Props) => {
  const skin = SKIN[bucketOf(variant)];
  const text = label != null ? label : variant ?? 'Status';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '999px',
        font: "700 11px/1 'Manrope', sans-serif",
        background: skin.bg,
        color: skin.fg,
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: skin.dot }} />
      {text}
    </span>
  );
};
