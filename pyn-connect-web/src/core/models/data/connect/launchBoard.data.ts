import type { ProductKey } from './common.data';

/**
 * The Launch Board (Back Office design, Oct 13, 2026): every property that is
 * being launched, on a seven-stage board from the order to the orientation.
 *
 * Demo-only for now. The CMS records five lifecycle milestones per community
 * (Property Detail's lifecycle); it has no columns for the order, payment,
 * pre-production, installation or orientation stages, nor assignees,
 * priorities, due dates, checklists or hand-offs. The fixture in
 * `src/data/mock/launchBoard.mock.ts` is the only source until it does.
 */
export type LaunchStageKey = 'order' | 'payment' | 'preprod' | 'production' | 'release' | 'installation' | 'orientation';

export type LaunchPriority = 'high' | 'normal' | 'low';

export type LaunchActionKind = 'request' | 'bug' | 'qa';

export interface LaunchStage {
  key: LaunchStageKey;
  num: number;
  label: string;
  short: string;
  desc: string;
  /** Target days in the stage. */
  slaDays: number;
  /** Team member who owns the stage by default. */
  owner: string;
  /** What has to be true before the card moves on. */
  checks: string[];
}

export interface LaunchTeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface LaunchAction {
  kind: LaunchActionKind;
  title: string;
  assignee: string;
  note: string;
  opened: string;
}

export interface LaunchHistoryEntry {
  who: string;
  text: string;
  when: string;
}

export interface LaunchCard {
  id: string;
  name: string;
  org: string;
  orgId: string;
  city: string;
  units: number;
  products: ProductKey[];
  stage: LaunchStageKey;
  /** Team member id, or null when nobody has it. */
  assignee: string | null;
  priority: LaunchPriority;
  /** ISO date the current stage should be done by. */
  due: string;
  /** ISO date the card entered the board. */
  createdAt: string;
  /** How many of the stage's checks are ticked, in order. */
  checksDone: number;
  action: LaunchAction | null;
  notes: string;
  history: LaunchHistoryEntry[];
  /** A real community id when the card stands for a property Connect can open. */
  propertyHref: string | null;
}
