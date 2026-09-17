import { plural } from '~/core/utils/connect/format';
import { initials } from '~/core/utils/connect/format';
import { ILS_PARTNERS, ROLE_STYLE, isProdStage } from '~/data/mock/core.mock';
import { HELP_SECTIONS } from '~/data/mock/scheduling.mock';
import type { DemoState } from '~/core/store/demo/demo.state';

/* ---------------- Users & Roles ---------------- */

export const generateUserRows = (state: DemoState) =>
  state.users.map((user) => {
    const skin = ROLE_STYLE[user.role] ?? ROLE_STYLE['Corporate Viewer'];
    return { ...user, initials: initials(user.name), roleColor: skin.c, roleBg: skin.b };
  });

/* ---------------- Help & Tutorials ---------------- */

export const generateHelpCount = (): string => {
  const total = HELP_SECTIONS.reduce((sum, section) => sum + section.items.length, 0);
  return `${total} guides in ${HELP_SECTIONS.length} sections`;
};

export const generateHelpSections = (query: string) => {
  const needle = query.trim().toLowerCase();

  return HELP_SECTIONS.map((section) => {
    const items = section.items.filter(
      (item) => !needle || `${item.title} ${section.name}`.toLowerCase().includes(needle)
    );
    return {
      name: section.name,
      icon: section.icon,
      blurb: section.blurb,
      count: plural(items.length, 'guide'),
      items: items.map((item) => ({
        title: item.title,
        kind: item.kind,
        meta: `${item.kind === 'video' ? 'Video · ' : 'Article · '}${item.len}`,
        kindIcon: item.kind === 'video' ? 'play' : 'article',
        kindBg: item.kind === 'video' ? 'var(--bo-accent-soft)' : '#EEF0F4',
        kindColor: item.kind === 'video' ? 'var(--bo-accent)' : 'var(--bo-muted)'
      }))
    };
  }).filter((section) => section.items.length > 0);
};

export const generateHelpEmpty = (query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return HELP_SECTIONS.every(
    (section) =>
      section.items.filter((item) => `${item.title} ${section.name}`.toLowerCase().includes(needle))
        .length === 0
  );
};

/* ---------------- SVG Maps Optimizer ---------------- */

export const generateSvgOptSummary = (state: DemoState): string => {
  const need = state.props.filter((p) => state.svgPropOpt[p.id]?.status === 'needs').length;
  return need
    ? `${need} ${need === 1 ? 'property needs' : 'properties need'} optimization`
    : 'All properties optimized';
};

export const generateSvgOptRows = (state: DemoState) =>
  state.props.map((prop) => {
    const record = state.svgPropOpt[prop.id] ?? { status: 'valid', sizeKb: 180, last: '—' };
    const need = record.status === 'needs';
    return {
      id: prop.id,
      name: prop.name,
      org: state.orgs.find((o) => o.id === prop.orgId)?.name ?? '—',
      statusV: need ? 'warn' : 'ok',
      statusLabel: need ? 'Needs Optimization' : 'Valid',
      size: `${record.sizeKb} KB`,
      last: record.last,
      btnLabel: need ? 'Optimize' : 'Re-optimize',
      btnBorder: need ? 'var(--bo-accent)' : 'var(--bo-line)',
      btnBg: need ? 'var(--bo-accent-soft)' : '#fff',
      btnColor: need ? 'var(--bo-accent)' : 'var(--bo-muted)'
    };
  });

/* ---------------- Partner Configuration ---------------- */

export const generatePartnerSummary = (state: DemoState): string => {
  let on = 0;
  let total = 0;
  state.props.forEach((prop) => {
    const row = state.integ[prop.id];
    ILS_PARTNERS.forEach((partner) => {
      total += 1;
      if (row?.ils[partner.id]) on += 1;
    });
  });
  return `${on} of ${total} syndication channels active`;
};

export const generatePartnerRows = (state: DemoState) =>
  state.props.map((prop) => {
    const row = state.integ[prop.id];
    return {
      id: prop.id,
      name: prop.name,
      org: state.orgs.find((o) => o.id === prop.orgId)?.name ?? '—',
      cells: ILS_PARTNERS.map((partner) => {
        const on = !!row?.ils[partner.id];
        return {
          partnerId: partner.id,
          on,
          bg: on ? 'var(--bo-accent)' : '#CDD2DB',
          knob: on ? '21px' : '3px'
        };
      })
    };
  });

/* ---------------- AI Services ---------------- */

export const generateAiProps = (state: DemoState) =>
  state.props
    .filter((prop) => isProdStage(prop.stage))
    .map((prop) => ({
      id: prop.id,
      name: prop.name,
      kb: state.aiOn[prop.id] ? 'Trained · 42 docs' : 'Not trained',
      kbV: state.aiOn[prop.id] ? 'ok' : 'neutral',
      flagged: prop.id === 'cortsky' ? '2' : prop.id === 'millpark' ? '1' : '0',
      flagColor: prop.id === 'cortsky' || prop.id === 'millpark' ? '#C62534' : '#8A92A3',
      on: !!state.aiOn[prop.id]
    }));

export const AI_REVIEW_QUEUE = [
  { property: 'Cortland Sky', reason: 'Fair-Housing', tagColor: '#C62534', tagBg: '#FDEDEF', excerpt: 'Is this a good neighborhood for families with kids?' },
  { property: 'Cortland Sky', reason: 'Escalation', tagColor: '#8A6A00', tagBg: '#FFF4D4', excerpt: 'I want to speak to a human agent right now.' },
  { property: 'Mill Creek Parkside', reason: 'Guardrail', tagColor: '#8A6A00', tagBg: '#FFF4D4', excerpt: 'Can you waive the application fee if I sign today?' }
];
