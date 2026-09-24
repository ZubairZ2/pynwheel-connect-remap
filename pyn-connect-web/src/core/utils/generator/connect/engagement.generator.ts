import { initials } from '~/core/utils/connect/format';
import { RESIDENT_TARGETS } from '~/data/mock/residents.mock';
import { curCfg, curResident } from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';

/* ---------------- Resident Access ---------------- */

export const generateResidentList = (state: DemoState) => {
  const current = curResident(state);
  return (state.residents[state.propId] ?? []).map((resident) => {
    const selected = resident.id === current?.id;
    return {
      ...resident,
      initials: initials(resident.name),
      sel: selected,
      grantCount: Object.values(resident.grants).filter(Boolean).length,
      border: selected ? 'var(--bo-accent)' : 'var(--bo-line)',
      bg: selected ? 'var(--bo-accent-soft)' : '#fff'
    };
  });
};

export const generateResidentView = (state: DemoState) => {
  const resident = curResident(state);
  if (!resident) {
    return { name: '—', unit: '—', phone: '—', since: '—', initials: '—', grantCount: 0 };
  }
  return {
    ...resident,
    initials: initials(resident.name),
    grantCount: Object.values(resident.grants).filter(Boolean).length
  };
};

export const generateGrantRows = (state: DemoState) => {
  const resident = curResident(state);
  if (!resident) return [];

  return RESIDENT_TARGETS.map((target) => ({
    label: target,
    on: !!resident.grants[target],
    toggleBg: resident.grants[target] ? 'var(--bo-accent)' : '#CDD2DB',
    knob: resident.grants[target] ? '21px' : '3px',
    note: target === 'Unit' ? `Unit ${resident.unit} · phone as key` : 'Shared amenity door',
    icon: target === 'Unit' ? 'bed' : 'lock'
  }));
};

/* ---------------- Favorites & eBrochure ---------------- */

export const generateBrochureView = (state: DemoState) => {
  const cfg = curCfg(state);
  return {
    cfg,
    cfgLogoOptions: [
      { id: 'primary', label: 'Primary logo' },
      { id: 'secondary', label: 'Secondary logo' },
      { id: 'none', label: 'No logo' }
    ],
    cfgLogoShown: cfg?.logo !== 'none',
    cfgBodyShown: !!cfg?.body,
    cfgBccEmpty: (cfg?.bcc.length ?? 0) === 0
  };
};

/* ---------------- Live Chat ---------------- */

const CONVO_LABEL: Record<string, string> = { active: 'Active', unassigned: 'Unassigned', closed: 'Closed' };
const CONVO_VARIANT: Record<string, string> = { active: 'live', unassigned: 'crit', closed: 'neutral' };

export const generateChatStats = (state: DemoState) => [
  { label: 'Active conversations', value: String(state.convos.filter((c) => c.state === 'active').length), sub: 'staff currently replying' },
  { label: 'Unassigned', value: String(state.convos.filter((c) => c.state === 'unassigned').length), sub: 'waiting for a human' },
  { label: 'Unread messages', value: String(state.convos.reduce((sum, c) => sum + c.unread, 0)), sub: 'across all properties' },
  { label: 'Staff online', value: String(state.chatStaff.filter((s) => s.online && s.inRotation).length), sub: 'online and in rotation' }
];

export const generateChatFilters = (state: DemoState) =>
  [{ id: 'all', label: 'All Properties' }, ...state.props.map((p) => ({ id: p.id, label: p.name }))].map(
    (tab) => ({
      ...tab,
      active: state.chatPropFilter === tab.id,
      bg: state.chatPropFilter === tab.id ? 'var(--bo-ink)' : '#fff',
      color: state.chatPropFilter === tab.id ? '#fff' : 'var(--bo-muted)',
      border: state.chatPropFilter === tab.id ? 'var(--bo-ink)' : 'var(--bo-line)'
    })
  );

const propertyName = (state: DemoState, id: string) =>
  state.props.find((p) => p.id === id)?.name ?? '—';

export const generateChatConvos = (state: DemoState) =>
  state.convos
    .filter((c) => state.chatPropFilter === 'all' || c.propId === state.chatPropFilter)
    .map((convo) => ({
      ...convo,
      property: propertyName(state, convo.propId),
      hasUnread: convo.unread > 0,
      isUnassigned: convo.state === 'unassigned',
      stateLabel: CONVO_LABEL[convo.state],
      stateV: CONVO_VARIANT[convo.state],
      border:
        convo.id === state.threadId
          ? 'var(--bo-accent)'
          : convo.state === 'unassigned'
            ? '#F9DCE0'
            : 'var(--bo-line)',
      bg:
        convo.id === state.threadId
          ? 'var(--bo-accent-soft)'
          : convo.state === 'unassigned'
            ? '#FDEDEF'
            : '#fff'
    }));

export const generateThread = (state: DemoState) => {
  const convo = state.convos.find((c) => c.id === state.threadId);
  if (!convo) return { visitor: '—', property: '—', staff: '—', stateLabel: '', stateV: 'neutral', lines: [] };

  return {
    visitor: convo.visitor,
    property: propertyName(state, convo.propId),
    staff: convo.staff,
    stateLabel: CONVO_LABEL[convo.state],
    stateV: CONVO_VARIANT[convo.state],
    lines: (state.threads[convo.id] ?? []).map((line) => ({
      ...line,
      isVisitor: line.who === 'visitor',
      align: line.who === 'visitor' ? 'flex-start' : 'flex-end',
      bg: line.who === 'visitor' ? '#EEF0F4' : 'var(--bo-accent-soft)',
      color: line.who === 'visitor' ? 'var(--bo-ink)' : 'var(--bo-accent)'
    }))
  };
};

export const generateChatStaffRows = (state: DemoState) =>
  state.chatStaff
    .filter((s) => state.chatPropFilter === 'all' || s.propId === state.chatPropFilter)
    .map((staff) => ({
      ...staff,
      initials: initials(staff.name),
      property: propertyName(state, staff.propId),
      dot: staff.online ? '#5C8E1C' : '#B4BAC6',
      statusLabel: staff.online ? 'Online' : 'Offline',
      toggleBg: staff.inRotation ? 'var(--bo-accent)' : '#CDD2DB',
      knob: staff.inRotation ? '21px' : '3px',
      loadLabel: staff.active === 1 ? '1 active chat' : `${staff.active} active chats`
    }));

/** The property picker several portfolio-wide screens share. */
export const generatePropOptions = (state: DemoState) =>
  state.props.map((prop) => ({ id: prop.id, name: prop.name }));
