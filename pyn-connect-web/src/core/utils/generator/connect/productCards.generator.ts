import { plural } from '~/core/utils/connect/format';
import {
  IDV_PROVIDERS,
  ILS_PARTNERS,
  MAP_DISPLAYS,
  STAGE_PILL,
  TOUCH_DISPLAYS
} from '~/data/mock/core.mock';
import { curInv, curProp, curTour, levels } from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';

const labelOf = (list: Array<{ id: string; label: string }>, id: string | undefined) =>
  list.find((x) => x.id === id)?.label ?? '';

export const productEnabled = (state: DemoState, key: string): boolean =>
  !!state.prodEnabled[state.propId]?.[key];

/**
 * The three product cards on Property detail, each with its inline settings.
 * Toggle state, expansion and every setting live in the demo slice.
 */
export const generateProductCards = (state: DemoState) => {
  const prop = curProp(state);
  const tour = curTour(state);
  const inv = curInv(state);
  const levelList = levels(state);
  const enabled = state.prodEnabled[state.propId] ?? {};
  const expandedMap = state.prodExpanded[state.propId] ?? {};
  const settings = (state.prodSettings[state.propId] ?? {}) as unknown as Record<
    string,
    Record<string, string | boolean>
  >;

  const defs = [
    {
      id: 'touch',
      name: 'Pynwheel Touch',
      icon: 'grid',
      metric: `${plural(prop.inv.units, 'unit')} · ${plural(levelList.length, 'floorplate')}`
    },
    { id: 'tour', name: 'Self-Guided Tour', icon: 'pin', metric: plural(tour.stops.length, 'tour stop') },
    {
      id: 'maps',
      name: 'Pynwheel Maps',
      icon: 'map',
      metric: `${plural(tour.stops.length + inv.amenities.length, 'pin')} · ${plural(tour.edges.length, 'path')}`
    }
  ];

  return defs.map((def) => {
    const on = !!enabled[def.id];
    const expanded = on && !!expandedMap[def.id];
    const st = settings[def.id] ?? {};

    return {
      ...def,
      enabled: on,
      toggleBg: on ? 'var(--bo-accent)' : '#CDD2DB',
      knob: on ? '21px' : '3px',
      expanded,
      caret: expanded ? '–' : '+',
      showCaret: on,
      iconBg: on ? 'var(--bo-accent-soft)' : '#EEF0F4',
      iconColor: on ? 'var(--bo-accent)' : 'var(--bo-subtle)',
      nameColor: on ? 'var(--bo-ink)' : 'var(--bo-muted)',
      isTouch: def.id === 'touch',
      isTour: def.id === 'tour',
      isMaps: def.id === 'maps',

      /* Touch */
      tDisplay: st.display as string,
      tDisplayLabel: labelOf(TOUCH_DISPLAYS, st.display as string),
      tMdu: st.mdu as boolean,
      tMduBg: st.mdu ? 'var(--bo-accent)' : '#CDD2DB',
      tMduKnob: st.mdu ? '20px' : '3px',
      tIdv: st.idv as string,
      tLocks: st.enableLocks as boolean,
      tLocksBg: st.enableLocks ? 'var(--bo-accent)' : '#CDD2DB',
      tLocksKnob: st.enableLocks ? '20px' : '3px',
      tStart: st.startDate as string,

      /* Tour */
      tourStart: st.startDate as string,

      /* Maps */
      mBeans: st.beans3d as boolean,
      mBeansBg: st.beans3d ? 'var(--bo-accent)' : '#CDD2DB',
      mBeansKnob: st.beans3d ? '20px' : '3px',
      mSvg: st.svgMode as boolean,
      mSvgBg: st.svgMode ? 'var(--bo-accent)' : '#CDD2DB',
      mSvgKnob: st.svgMode ? '20px' : '3px',
      mWayfind: st.autoWayfind as boolean,
      mWayfindBg: st.autoWayfind ? 'var(--bo-accent)' : '#CDD2DB',
      mWayfindKnob: st.autoWayfind ? '20px' : '3px',
      mDisplay: st.display as string,
      mGestures: st.gestureIcons as boolean,
      mGesturesBg: st.gestureIcons ? 'var(--bo-accent)' : '#CDD2DB',
      mGesturesKnob: st.gestureIcons ? '20px' : '3px'
    };
  });
};

export const generateProductSummary = (state: DemoState): string => {
  const enabled = state.prodEnabled[state.propId] ?? {};
  const names = (
    [
      ['touch', 'Touch'],
      ['tour', 'Self-Guided Tour'],
      ['maps', 'Maps']
    ] as const
  )
    .filter(([key]) => enabled[key])
    .map(([, label]) => label);

  if (!names.length) return 'No products enabled yet · toggle one on in the Products card';
  return `${STAGE_PILL[curProp(state).stage].label} · ${names.join(' + ')} enabled for this property`;
};

export const generateInventoryCards = (state: DemoState) => {
  const prop = curProp(state);
  return [
    { tab: 'units', label: 'Units', value: String(prop.inv.units), icon: 'bed' },
    { tab: 'floorplans', label: 'Floorplans', value: String(prop.inv.floorplans), icon: 'grid' },
    { tab: 'floorplates', label: 'Floorplates', value: String(levels(state).length), icon: 'properties' },
    { tab: 'amenities', label: 'Amenities', value: String(prop.inv.amenities), icon: 'star' }
  ];
};

export const generateIlsDetailPartners = (state: DemoState) => {
  const row = state.integ[state.propId];
  return ILS_PARTNERS.map((partner) => {
    const on = !!row?.ils[partner.id];
    return {
      id: partner.id,
      name: partner.name,
      on,
      statusLabel: on ? 'Syndicating' : 'Paused',
      toggleBg: on ? 'var(--bo-accent)' : '#CDD2DB',
      knob: on ? '20px' : '3px'
    };
  });
};

export const PRODUCT_OPTIONS = {
  touchDisplayOptions: TOUCH_DISPLAYS,
  idvProviderOptions: IDV_PROVIDERS,
  mapDisplayOptions: MAP_DISPLAYS
};
