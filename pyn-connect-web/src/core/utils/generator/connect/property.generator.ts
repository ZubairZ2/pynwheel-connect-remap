import { plural } from '~/core/utils/connect/format';
import { STAGES, STAGE_IDX, STAGE_PILL } from '~/data/mock/core.mock';
import { curProp, curTour } from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';
import type { Prop } from '~/core/models/data/connect/account.data';

export interface PropertyView extends Prop {
  org: string;
  status: string;
  statusV: string;
  stageLabel: string;
  pub: string;
  pubV: string;
  pubDetail: string;
}

/**
 * The property header every property-scoped screen shows: the record plus its
 * company name, lifecycle pill and tour-publish state.
 */
export const generatePropertyView = (state: DemoState): PropertyView => {
  const prop = curProp(state);
  const tour = curTour(state);
  const published = tour.published;

  return {
    ...prop,
    org: state.orgs.find((o) => o.id === prop?.orgId)?.name ?? '—',
    status: STAGE_PILL[prop.stage].label,
    statusV: STAGE_PILL[prop.stage].v,
    stageLabel: STAGES.find((s) => s.key === prop.stage)?.label ?? '',
    pub: published ? 'Published' : 'Not Published',
    pubV: published ? 'ok' : 'neutral',
    pubDetail: published
      ? `Live on the touch app · ${tour.stops.length} stops`
      : tour.stops.length
        ? `${tour.stops.length} stops staged · not yet published`
        : 'No stops configured yet'
  };
};

/** The five-step deployment tracker on Property detail. */
export const generateStageSteps = (state: DemoState) => {
  const current = STAGE_IDX(curProp(state).stage);

  return STAGES.map((stage, index) => ({
    key: stage.key,
    label: stage.short,
    full: stage.label,
    desc: stage.desc,
    num: index + 1,
    done: index < current,
    current: index === current,
    circleBg: index <= current ? 'var(--bo-accent)' : '#fff',
    circleBorder: index <= current ? 'var(--bo-accent)' : 'var(--bo-line)',
    circleColor: index <= current ? '#fff' : 'var(--bo-subtle)',
    lineBg: index < current ? 'var(--bo-accent)' : 'var(--bo-line)',
    labelColor:
      index === current ? 'var(--bo-ink)' : index < current ? 'var(--bo-muted)' : 'var(--bo-subtle)',
    labelWeight: index === current ? '800' : '700'
  }));
};

export const generateBuildingSummary = (state: DemoState) => {
  const buildings = curProp(state).buildings ?? [];
  return {
    propBuildings: buildings,
    propMultiBuilding: buildings.length > 1,
    propBuildingLabel: plural(buildings.length, 'building')
  };
};
