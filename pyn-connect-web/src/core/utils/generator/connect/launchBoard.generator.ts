import type { ProductKey } from '~/core/models/data/connect/common.data';
import type {
  LaunchActionKind,
  LaunchCard,
  LaunchPriority,
  LaunchStage,
  LaunchStageKey,
  LaunchTeamMember
} from '~/core/models/data/connect/launchBoard.data';
import { initials } from '~/core/utils/connect/format';
import {
  LB_ACTION_STYLE,
  LB_PRODUCT_STYLE,
  LB_STAGES,
  LB_STAGE_KEYS,
  LB_TEAM,
  LB_TODAY
} from '~/data/mock/launchBoard.mock';
import type { FilterOption } from '../listing.types';

/**
 * Pure view-model functions for the Launch Board (Back Office design,
 * Oct 13, 2026). They take the cards the hook holds in local state and return
 * what the screen draws: stats, filter options, columns, list rows and the
 * drawer. Nothing here reads the store or the network.
 */

export type LaunchView = 'board' | 'list';

export interface LaunchFilters {
  query: string;
  orgs: string[];
  products: ProductKey[];
  people: string[];
  priority: 'all' | LaunchPriority;
  overdueOnly: boolean;
}

export const EMPTY_LAUNCH_FILTERS: LaunchFilters = {
  query: '',
  orgs: [],
  products: [],
  people: [],
  priority: 'all',
  overdueOnly: false
};

export const PRIORITY_OPTIONS: { id: LaunchFilters['priority']; label: string }[] = [
  { id: 'all', label: 'Any priority' },
  { id: 'high', label: 'High priority' },
  { id: 'normal', label: 'Normal priority' },
  { id: 'low', label: 'Low priority' }
];

export const PRIORITY_LABEL: Record<LaunchPriority, string> = { high: 'High', normal: 'Normal', low: 'Low' };

const DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Whole days from `from` to `to` (ISO dates); positive when `to` is later. */
export const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

export const formatShortDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

export const stageOf = (key: LaunchStageKey): LaunchStage => LB_STAGES.find((stage) => stage.key === key) ?? LB_STAGES[0];
export const stageIndex = (key: LaunchStageKey): number => LB_STAGE_KEYS.indexOf(key);
export const nextStageOf = (key: LaunchStageKey): LaunchStage | null => LB_STAGES[stageIndex(key) + 1] ?? null;

/** The design's `isProdStage`: from In Production on, the property is live. */
export const isLiveStage = (key: LaunchStageKey): boolean => stageIndex(key) >= 3;

/** Overdue: the stage's due date has passed and the launch is not finished. */
export const isOverdue = (card: LaunchCard): boolean => card.stage !== 'orientation' && daysBetween(card.due, LB_TODAY) > 0;

export const memberOf = (id: string | null): LaunchTeamMember | null => LB_TEAM.find((member) => member.id === id) ?? null;

export const memberInitials = (member: LaunchTeamMember | null): string => (member ? initials(member.name) : '?');

/* ── filters ─────────────────────────────────────────────────────────── */

export const filterLaunchCards = (cards: LaunchCard[], filters: LaunchFilters): LaunchCard[] => {
  const query = filters.query.trim().toLowerCase();
  return cards.filter((card) => {
    if (query && !`${card.name} ${card.org} ${card.city}`.toLowerCase().includes(query)) return false;
    if (filters.orgs.length && !filters.orgs.includes(card.orgId)) return false;
    if (filters.products.length && !filters.products.some((product) => card.products.includes(product))) return false;
    if (filters.people.length && !filters.people.includes(card.assignee ?? '')) return false;
    if (filters.priority !== 'all' && card.priority !== filters.priority) return false;
    if (filters.overdueOnly && !isOverdue(card)) return false;
    return true;
  });
};

export const hasLaunchFilters = (filters: LaunchFilters): boolean =>
  filters.query.trim().length > 0 ||
  filters.orgs.length > 0 ||
  filters.products.length > 0 ||
  filters.people.length > 0 ||
  filters.priority !== 'all' ||
  filters.overdueOnly;

export const generateLaunchOrgOptions = (cards: LaunchCard[]): FilterOption[] => {
  const seen = new Map<string, string>();
  cards.forEach((card) => seen.set(card.orgId, card.org));
  return [...seen.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
};

export const generateLaunchProductOptions = (): { id: ProductKey; label: string; color: string }[] =>
  (Object.keys(LB_PRODUCT_STYLE) as ProductKey[]).map((key) => ({ id: key, label: LB_PRODUCT_STYLE[key].label, color: LB_PRODUCT_STYLE[key].color }));

/* ── stats ───────────────────────────────────────────────────────────── */

export interface LaunchStat {
  id: 'inProgress' | 'overdue' | 'live' | 'unassigned';
  label: string;
  value: number;
  color: string;
}

export const generateLaunchStats = (cards: LaunchCard[]): LaunchStat[] => [
  { id: 'inProgress', label: 'In progress', value: cards.filter((card) => card.stage !== 'orientation').length, color: 'var(--bo-accent)' },
  { id: 'overdue', label: 'Overdue', value: cards.filter(isOverdue).length, color: '#C62534' },
  { id: 'live', label: 'Live', value: cards.filter((card) => isLiveStage(card.stage)).length, color: '#4A7212' },
  { id: 'unassigned', label: 'Unassigned', value: cards.filter((card) => !card.assignee).length, color: '#B98900' }
];

/* ── cards ───────────────────────────────────────────────────────────── */

export interface LaunchCardView {
  id: string;
  name: string;
  org: string;
  meta: string;
  products: { key: ProductKey; label: string; color: string; bg: string }[];
  action: { kind: LaunchActionKind; label: string; title: string; color: string; bg: string; icon: string } | null;
  checks: { done: number; total: number; pct: number };
  due: { label: string; color: string };
  age: string;
  assignee: LaunchTeamMember | null;
  assigneeInitials: string;
  priority: LaunchPriority;
  overdue: boolean;
  stage: LaunchStageKey;
  stageLabel: string;
  href: string | null;
}

const dueOf = (card: LaunchCard): { label: string; color: string } => {
  const days = daysBetween(LB_TODAY, card.due);
  if (card.stage === 'orientation' && days < 0) return { label: `Done ${formatShortDate(card.due)}`, color: 'var(--bo-subtle)' };
  if (days < 0) return { label: `Overdue · ${Math.abs(days)}d`, color: '#C62534' };
  if (days === 0) return { label: 'Due today', color: '#B98900' };
  if (days <= 3) return { label: `Due ${formatShortDate(card.due)}`, color: '#B98900' };
  return { label: `Due ${formatShortDate(card.due)}`, color: 'var(--bo-subtle)' };
};

export const generateLaunchCardView = (card: LaunchCard): LaunchCardView => {
  const stage = stageOf(card.stage);
  const total = stage.checks.length;
  const done = Math.min(card.checksDone, total);
  const assignee = memberOf(card.assignee);
  const action = card.action
    ? { kind: card.action.kind, title: card.action.title, ...LB_ACTION_STYLE[card.action.kind] }
    : null;

  return {
    id: card.id,
    name: card.name,
    org: card.org,
    meta: `${card.city} · ${card.units} units`,
    products: card.products.map((key) => ({ key, ...LB_PRODUCT_STYLE[key] })),
    action,
    checks: { done, total, pct: total ? Math.round((done / total) * 100) : 0 },
    due: dueOf(card),
    age: `${Math.max(0, daysBetween(card.createdAt, LB_TODAY))}d on board`,
    assignee,
    assigneeInitials: memberInitials(assignee),
    priority: card.priority,
    overdue: isOverdue(card),
    stage: card.stage,
    stageLabel: stage.label,
    href: card.propertyHref
  };
};

export interface LaunchColumn {
  stage: LaunchStage;
  cards: LaunchCardView[];
  count: number;
  overdue: number;
}

export const generateLaunchColumns = (cards: LaunchCard[]): LaunchColumn[] =>
  LB_STAGES.map((stage) => {
    const inStage = cards.filter((card) => card.stage === stage.key);
    return {
      stage,
      cards: inStage.map(generateLaunchCardView),
      count: inStage.length,
      overdue: inStage.filter(isOverdue).length
    };
  });

export const generateLaunchSummary = (visible: number, total: number, filters: LaunchFilters): string => {
  const base = visible === total ? `${total} launches across ${LB_STAGES.length} stages` : `Showing ${visible} of ${total} launches`;
  return hasLaunchFilters(filters) ? `${base} · filtered` : base;
};

/* ── drawer ──────────────────────────────────────────────────────────── */

export interface LaunchDrawerView {
  card: LaunchCard;
  view: LaunchCardView;
  stage: LaunchStage;
  checks: { index: number; label: string; done: boolean }[];
  allChecked: boolean;
  nextStage: LaunchStage | null;
  owner: LaunchTeamMember | null;
  ownerWhy: string;
  late: boolean;
  lateLabel: string | null;
  action: (LaunchCard['action'] & { style: (typeof LB_ACTION_STYLE)[LaunchActionKind]; assigneeName: string }) | null;
  history: { who: LaunchTeamMember | null; whoInitials: string; text: string; when: string }[];
}

export const generateLaunchDrawer = (card: LaunchCard): LaunchDrawerView => {
  const stage = stageOf(card.stage);
  const view = generateLaunchCardView(card);
  const owner = memberOf(stage.owner);
  const overdueDays = daysBetween(card.due, LB_TODAY);

  return {
    card,
    view,
    stage,
    checks: stage.checks.map((label, index) => ({ index, label, done: index < card.checksDone })),
    allChecked: card.checksDone >= stage.checks.length,
    nextStage: nextStageOf(card.stage),
    owner,
    ownerWhy: owner ? `${owner.name} owns every launch in ${stage.label} (${owner.role}). Target ${stage.slaDays} days.` : `Target ${stage.slaDays} days in this stage.`,
    late: isOverdue(card),
    lateLabel: isOverdue(card) ? `${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} past the ${stage.short} target of ${stage.slaDays} days` : null,
    action: card.action
      ? { ...card.action, style: LB_ACTION_STYLE[card.action.kind], assigneeName: memberOf(card.action.assignee)?.name ?? card.action.assignee }
      : null,
    history: card.history.map((entry) => {
      const who = memberOf(entry.who);
      return { who, whoInitials: memberInitials(who), text: entry.text, when: entry.when };
    })
  };
};

export const ACTION_KINDS: LaunchActionKind[] = ['request', 'bug', 'qa'];
