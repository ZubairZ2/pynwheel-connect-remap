'use client';

import { useCallback, useMemo, useState, type DragEvent } from 'react';

import type { ProductKey } from '~/core/models/data/connect/common.data';
import type { LaunchActionKind, LaunchCard, LaunchPriority, LaunchStageKey } from '~/core/models/data/connect/launchBoard.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import {
  EMPTY_LAUNCH_FILTERS,
  filterLaunchCards,
  generateLaunchCardView,
  generateLaunchColumns,
  generateLaunchDrawer,
  generateLaunchOrgOptions,
  generateLaunchProductOptions,
  generateLaunchStats,
  generateLaunchSummary,
  hasLaunchFilters,
  memberOf,
  stageOf,
  type LaunchFilters,
  type LaunchView
} from '~/core/utils/generator/connect/launchBoard.generator';
import { LB_ACTION_STYLE, LB_CARDS, LB_STAGES, LB_TEAM, LB_TODAY } from '~/data/mock/launchBoard.mock';

interface HandoffDraft {
  kind: LaunchActionKind;
  assignee: string;
  title: string;
  note: string;
}

/**
 * Launch Board state. Everything is local to the page: the cards start from
 * the demo fixture and every move, tick, assignment, hand-off and note stays
 * in React state until the page reloads. No request is ever sent, and the
 * toasts say so.
 */
export const useLaunchBoard = () => {
  const dispatch = useAppDispatch();
  const [cards, setCards] = useState<LaunchCard[]>(LB_CARDS);
  const [filters, setFilters] = useState<LaunchFilters>(EMPTY_LAUNCH_FILTERS);
  const [view, setView] = useState<LaunchView>('board');
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LaunchStageKey | null>(null);
  const [handoff, setHandoff] = useState<HandoffDraft | null>(null);

  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);

  const update = useCallback((id: string, change: (card: LaunchCard) => Partial<LaunchCard>) => {
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...change(card) } : card)));
  }, []);

  const log = (card: LaunchCard, text: string): LaunchCard['history'] => [{ who: 'zubair', text, when: 'Today' }, ...card.history];

  const visible = useMemo(() => filterLaunchCards(cards, filters), [cards, filters]);
  const columns = useMemo(() => generateLaunchColumns(visible), [visible]);
  const rows = useMemo(() => visible.map(generateLaunchCardView), [visible]);
  const stats = useMemo(() => generateLaunchStats(cards), [cards]);
  const orgOptions = useMemo(() => generateLaunchOrgOptions(cards), [cards]);
  const productOptions = useMemo(() => generateLaunchProductOptions(), []);
  const summary = generateLaunchSummary(visible.length, cards.length, filters);
  const openCard = openId ? cards.find((card) => card.id === openId) ?? null : null;
  const drawer = useMemo(() => (openCard ? generateLaunchDrawer(openCard) : null), [openCard]);

  /* ── filters ─────────────────────────────────────────────────────── */

  const patchFilters = (patch: Partial<LaunchFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const toggleIn = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  /* ── moves ───────────────────────────────────────────────────────── */

  const moveCard = useCallback(
    (id: string, stage: LaunchStageKey) => {
      const card = cards.find((row) => row.id === id);
      if (!card || card.stage === stage) return;
      const target = stageOf(stage);
      update(id, (current) => ({
        stage,
        checksDone: 0,
        assignee: current.assignee ?? target.owner,
        history: log(current, `Moved to ${target.label}`)
      }));
      toast(`${card.name} moved to ${target.label} · demo board, nothing is saved`);
    },
    [cards, toast, update]
  );

  const onDragStart = (id: string) => (event: DragEvent) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDragId(id);
  };
  const onDragOver = (stage: LaunchStageKey) => (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (overStage !== stage) setOverStage(stage);
  };
  const onDragLeave = (stage: LaunchStageKey) => () => {
    if (overStage === stage) setOverStage(null);
  };
  const onDrop = (stage: LaunchStageKey) => (event: DragEvent) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || dragId;
    if (id) moveCard(id, stage);
    setDragId(null);
    setOverStage(null);
  };
  const onDragEnd = () => {
    setDragId(null);
    setOverStage(null);
  };

  /* ── drawer edits ────────────────────────────────────────────────── */

  const toggleCheck = (index: number) => {
    if (!openCard) return;
    update(openCard.id, (current) => ({ checksDone: index < current.checksDone ? index : index + 1 }));
  };

  const advance = () => {
    if (!drawer?.nextStage || !openCard) return;
    moveCard(openCard.id, drawer.nextStage.key);
  };

  const setAssignee = (memberId: string) => {
    if (!openCard) return;
    const member = memberOf(memberId || null);
    update(openCard.id, (current) => ({
      assignee: member?.id ?? null,
      history: log(current, member ? `Assigned to ${member.name}` : 'Unassigned')
    }));
  };

  const setPriority = (priority: LaunchPriority) => openCard && update(openCard.id, () => ({ priority }));
  const setDue = (due: string) => openCard && due && update(openCard.id, () => ({ due }));
  const setNotes = (notes: string) => openCard && update(openCard.id, () => ({ notes }));

  const toggleProduct = (product: ProductKey) => {
    if (!openCard) return;
    update(openCard.id, (current) => {
      const order: ProductKey[] = ['touch', 'tour', 'maps'];
      const next = toggleIn(current.products, product);
      return { products: order.filter((key) => next.includes(key)) };
    });
  };

  const openHandoff = (kind: LaunchActionKind) =>
    setHandoff({ kind, assignee: kind === 'bug' ? 'zubair' : kind === 'qa' ? 'jennifer' : 'alex', title: '', note: '' });
  const patchHandoff = (patch: Partial<HandoffDraft>) => setHandoff((current) => (current ? { ...current, ...patch } : current));
  const cancelHandoff = () => setHandoff(null);
  const submitHandoff = () => {
    if (!openCard || !handoff || !handoff.title.trim()) return;
    const style = LB_ACTION_STYLE[handoff.kind];
    const who = memberOf(handoff.assignee)?.name ?? handoff.assignee;
    update(openCard.id, (current) => ({
      action: { kind: handoff.kind, title: handoff.title.trim(), assignee: handoff.assignee, note: handoff.note.trim(), opened: 'Today' },
      history: log(current, `Raised a ${style.label.toLowerCase()}: ${handoff.title.trim()} → ${who}`)
    }));
    setHandoff(null);
    toast(`${style.label} handed to ${who} · demo board, nothing is saved`);
  };
  const resolveAction = () => {
    if (!openCard?.action) return;
    const label = LB_ACTION_STYLE[openCard.action.kind].label;
    update(openCard.id, (current) => ({ action: null, history: log(current, `Resolved the ${label.toLowerCase()}: ${current.action?.title ?? ''}`) }));
    toast(`${label} resolved · demo board, nothing is saved`);
  };

  return {
    today: LB_TODAY,
    stages: LB_STAGES,
    team: LB_TEAM,
    stats,
    filters,
    filtered: hasLaunchFilters(filters),
    orgOptions,
    productOptions,
    summary,
    view,
    columns,
    rows,
    drawer,
    handoff,
    dragId,
    overStage,
    actions: {
      setQuery: (query: string) => patchFilters({ query }),
      toggleOrg: (id: string) => patchFilters({ orgs: toggleIn(filters.orgs, id) }),
      clearOrgs: () => patchFilters({ orgs: [] }),
      toggleProductFilter: (id: ProductKey) => patchFilters({ products: toggleIn(filters.products, id) }),
      togglePerson: (id: string) => patchFilters({ people: toggleIn(filters.people, id) }),
      setPriorityFilter: (priority: LaunchFilters['priority']) => patchFilters({ priority }),
      toggleOverdue: () => patchFilters({ overdueOnly: !filters.overdueOnly }),
      clearFilters: () => setFilters(EMPTY_LAUNCH_FILTERS),
      setView,
      open: (id: string) => {
        setHandoff(null);
        setOpenId(id);
      },
      close: () => {
        setHandoff(null);
        setOpenId(null);
      },
      moveCard,
      onDragStart,
      onDragOver,
      onDragLeave,
      onDrop,
      onDragEnd,
      toggleCheck,
      advance,
      setAssignee,
      setPriority,
      setDue,
      setNotes,
      toggleProduct,
      openHandoff,
      patchHandoff,
      cancelHandoff,
      submitHandoff,
      resolveAction
    }
  };
};

export type LaunchBoardController = ReturnType<typeof useLaunchBoard>;
