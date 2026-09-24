import { initials, plural } from '~/core/utils/connect/format';
import { PMS_PROVIDERS, PMS_VENDOR_NOTES, STAGE_PILL } from '~/data/mock/core.mock';
import { curOrg, propCount } from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';

/** The company header shared by Company detail, Regions and Portfolio Groups. */
export const generateOrgView = (state: DemoState) => {
  const org = curOrg(state);
  const properties = propCount(state, org?.id ?? '');

  return {
    ...org,
    initials: initials(org?.name),
    properties,
    regionCount: org?.regions.length ?? 0,
    groupCount: org?.groups.length ?? 0,
    pmsProvider: org?.pms.provider || 'Not configured',
    pmsCred: org?.pms.cred || '—',
    pmsPush: org?.pms.pushDown ?? false,
    pmsV: org?.pms.provider ? 'ok' : 'neutral',
    pmsHasProvider: !!org?.pms.provider,
    regionLabel: plural(org?.regions.length ?? 0, 'region'),
    groupLabel: plural(org?.groups.length ?? 0, 'portfolio group'),
    propertyLabel: plural(properties, 'property', 'properties')
  };
};

export const generateOrgPmsSummary = (state: DemoState): string => {
  const org = curOrg(state);
  if (!org?.pms.provider) {
    return 'No company credential — each property authenticates on its own';
  }
  return `${org.pms.provider} · one company credential at a time · ${
    org.pms.pushDown ? 'pushing down to every property' : 'push-down off'
  }`;
};

export const generateOrgPmsVendors = (state: DemoState) => {
  const org = curOrg(state);

  return PMS_PROVIDERS.map((name) => {
    const on = org?.pms.provider === name;
    return {
      name,
      note: PMS_VENDOR_NOTES[name] ?? 'PMS connector',
      on,
      notOn: !on,
      statusV: on ? 'ok' : 'neutral',
      status: on ? 'Connected' : 'Not Connected',
      cred: on ? org?.pms.cred || '—' : '—',
      lastTest: on ? 'Passed 2d ago' : 'Never tested',
      cardBorder: on ? 'var(--bo-accent)' : 'var(--bo-line)',
      cardBg: on ? 'var(--bo-accent-soft)' : '#fff'
    };
  });
};

export const generateOrgProperties = (state: DemoState) => {
  const org = curOrg(state);
  return state.props
    .filter((p) => p.orgId === org?.id)
    .map((prop) => ({
      ...prop,
      status: STAGE_PILL[prop.stage].label,
      statusV: STAGE_PILL[prop.stage].v
    }));
};

export const generateRegionRows = (state: DemoState) => {
  const org = curOrg(state);
  return (org?.regions ?? []).map((region) => {
    const names = state.props
      .filter((p) => p.orgId === org.id && p.region === region.name)
      .map((p) => p.name);
    return {
      ...region,
      propNames: names.length ? names.join(', ') : 'No properties assigned',
      propCount: String(names.length)
    };
  });
};

export const generateGroupRows = (state: DemoState) => {
  const org = curOrg(state);
  return (org?.groups ?? []).map((group) => ({
    ...group,
    videoLabel: group.video ? 'Loop video set' : 'No loop video',
    designLabel: group.design || 'Pynwheel Signature',
    propNames: group.propIds?.length
      ? state.props.filter((p) => (group.propIds ?? []).indexOf(p.id) >= 0).map((p) => p.name).join(', ')
      : `${group.props} properties assigned`,
    url: `go.pynwheel.com/${group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  }));
};
