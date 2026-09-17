import type { PayloadAction } from '@reduxjs/toolkit';

import type { Prop } from '~/core/models/data/connect/account.data';
import { uid } from '~/core/utils/connect/format';
import { PMS_PROVIDERS, SEED_INTEG, STAGES } from '~/data/mock/core.mock';
import type { StageKey } from '~/core/models/data/connect/common.data';

import { curOrg, curProp, emptyTour } from '../demo.selectors';
import type { DemoState } from '../demo.state';

const billingOf = (touch: string, tour: string, maps: string, combined: string, month: string) => ({
  touch,
  tour,
  maps,
  combined,
  month,
  cadence: 'Monthly'
});

/** Companies, regions, portfolio groups, properties, users. */
export const accountReducers = {
  /* ---------- company ---------- */

  saveOrg(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.name ?? '').trim()) {
      state.toast = 'Enter an company name.';
      return;
    }

    if (state.editingId) {
      const org = state.orgs.find((o) => o.id === state.editingId);
      if (org) {
        org.name = form.name;
        org.contact = form.contact;
        org.email = form.email;
        org.pms.provider = form.pmsProvider;
      }
      state.toast = 'Company updated.';
    } else {
      const id = uid('org');
      state.orgs.unshift({
        id,
        name: form.name,
        users: 1,
        contact: form.contact || '—',
        email: form.email || '—',
        pms: {
          provider: form.pmsProvider || '',
          cred: form.pmsProvider
            ? `${form.pmsProvider.slice(0, 2).toLowerCase()}_live_••••${Math.random().toString(36).slice(2, 6)}`
            : '',
          pushDown: true
        },
        regions: [],
        groups: [],
        history: [
          { actor: 'Alex Morgan', action: 'created the company', when: 'just now', v: 'neutral' }
        ]
      });
      state.toast = 'Company created.';
    }

    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  deleteOrg(state: DemoState, action: PayloadAction<string>) {
    const org = state.orgs.find((o) => o.id === action.payload);
    state.orgs = state.orgs.filter((o) => o.id !== action.payload);
    state.props = state.props.filter((p) => p.orgId !== action.payload);
    if (state.orgs[0]) state.orgId = state.orgs[0].id;
    state.toast = `${org?.name ?? 'Company'} deleted.`;
  },

  toggleOrgPmsPushDown(state: DemoState) {
    const org = curOrg(state);
    if (!org) return;
    org.pms.pushDown = !org.pms.pushDown;
    state.toast = org.pms.pushDown
      ? `Company-level ${org.pms.provider || 'PMS'} credentials now push to every property.`
      : 'Properties will use their own PMS credentials.';
  },

  saveOrgPms(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.pmsKey ?? '').trim()) {
      state.toast = 'Paste the API key or secret.';
      return;
    }
    const provider = form.pmsProvider || PMS_PROVIDERS[0];
    const org = curOrg(state);
    if (org) {
      org.pms.provider = provider;
      org.pms.cred = `${provider.slice(0, 2).toLowerCase()}_live_••••${form.pmsKey.trim().slice(-4)}`;
      org.pms.pushDown = true;
      org.history.unshift({
        actor: 'Alex Morgan',
        action: `connected ${provider} company credentials`,
        when: 'just now',
        v: 'ok'
      });
    }
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `${provider} connected · pushing down to every property.`;
  },

  testOrgPms(state: DemoState) {
    const org = curOrg(state);
    if (!org?.pms.provider) return;
    state.toast = `${org.pms.provider} credential verified.`;
  },

  disconnectOrgPms(state: DemoState) {
    const org = curOrg(state);
    if (!org) return;
    org.pms.provider = '';
    org.pms.cred = '';
    org.pms.pushDown = false;
    state.toast = 'Company PMS credential removed.';
  },

  /* ---------- regions ---------- */

  saveRegion(state: DemoState) {
    const form = state.form as Record<string, string & string[]>;
    if (!(form.name ?? '').trim()) {
      state.toast = 'Enter a region name.';
      return;
    }
    const ids = (state.form.propIds as string[] | undefined) ?? [];
    const org = curOrg(state);
    if (!org) return;

    const previousName = state.editingId
      ? org.regions.find((r) => r.id === state.editingId)?.name
      : undefined;
    const record = {
      name: form.name,
      contact: form.contact || '—',
      email: form.email || '—',
      props: ids.length
    };

    if (state.editingId) {
      const index = org.regions.findIndex((r) => r.id === state.editingId);
      if (index >= 0) org.regions[index] = { ...org.regions[index], ...record };
    } else {
      org.regions.push({ id: uid('r-'), ...record });
    }

    org.history.unshift({
      actor: 'Alex Morgan',
      action: `${state.editingId ? 'updated the ' : 'created the '}${form.name} region`,
      when: 'just now',
      v: 'ok'
    });

    state.props.forEach((p) => {
      if (p.orgId !== org.id) return;
      if (ids.indexOf(p.id) >= 0) p.region = form.name;
      else if (previousName && p.region === previousName) p.region = '—';
    });

    state.toast = state.editingId ? `${form.name} updated.` : `${form.name} region created.`;
    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  deleteRegion(state: DemoState, action: PayloadAction<string>) {
    const org = curOrg(state);
    if (!org) return;
    const region = org.regions.find((r) => r.id === action.payload);
    if (!region) return;
    org.regions = org.regions.filter((r) => r.id !== action.payload);
    org.history.unshift({
      actor: 'Alex Morgan',
      action: `deleted the ${region.name} region`,
      when: 'just now',
      v: 'warn'
    });
    state.props.forEach((p) => {
      if (p.orgId === org.id && p.region === region.name) p.region = '—';
    });
    state.toast = `${region.name} deleted.`;
  },

  /* ---------- portfolio groups ---------- */

  saveGroup(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.name ?? '').trim()) {
      state.toast = 'Enter a portfolio group name.';
      return;
    }
    const ids = (state.form.propIds as string[] | undefined) ?? [];
    const org = curOrg(state);
    if (!org) return;

    const record = {
      name: form.name,
      master: form.master,
      propIds: ids,
      props: ids.length,
      video: form.video === 'Yes',
      design: form.design
    };

    if (state.editingId) {
      const index = org.groups.findIndex((g) => g.id === state.editingId);
      if (index >= 0) org.groups[index] = { ...org.groups[index], ...record };
    } else {
      org.groups.push({ id: uid('g-'), ...record });
    }

    org.history.unshift({
      actor: 'Alex Morgan',
      action: `${state.editingId ? 'updated the ' : 'created the '}${form.name} portfolio group`,
      when: 'just now',
      v: 'ok'
    });

    state.toast = state.editingId ? `${form.name} updated.` : `${form.name} portfolio group created.`;
    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  deleteGroup(state: DemoState, action: PayloadAction<string>) {
    const org = curOrg(state);
    if (!org) return;
    const group = org.groups.find((g) => g.id === action.payload);
    if (!group) return;
    org.groups = org.groups.filter((g) => g.id !== action.payload);
    org.history.unshift({
      actor: 'Alex Morgan',
      action: `deleted the ${group.name} portfolio group`,
      when: 'just now',
      v: 'warn'
    });
    state.toast = `${group.name} deleted.`;
  },

  /* ---------- property ---------- */

  saveProperty(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.name ?? '').trim()) {
      state.toast = 'Enter a property name.';
      return;
    }
    const org = state.orgs.find((o) => o.name === form.orgName) ?? state.orgs[0];

    if (state.editingId) {
      const prop = state.props.find((p) => p.id === state.editingId);
      if (prop) {
        prop.name = form.name;
        prop.city = form.city;
        prop.units = parseInt(form.units, 10) || 0;
        prop.orgId = org.id;
      }
      state.toast = 'Property updated.';
    } else {
      const id = uid('prop');
      const units = parseInt(form.units, 10) || 0;
      const prop: Prop = {
        id,
        name: form.name,
        orgId: org.id,
        region: '—',
        city: form.city || '—',
        stage: 'installed',
        lock: 'neutral',
        idv: 'neutral',
        pms: 'neutral',
        units,
        inv: { units, floorplans: 0, floorplates: 0, amenities: 0 },
        buildings: [{ name: 'Main', units }],
        has3D: false,
        billing: billingOf('$249', '—', '—', '$249', 'Pending')
      };
      state.props.unshift(prop);
      state.tours[id] = emptyTour();
      state.integ[id] = JSON.parse(JSON.stringify(SEED_INTEG.wharf));
      state.inv[id] = { floorplans: [], units: [], amenities: [], elevators: [] };
      state.toast = 'Property created.';
    }

    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  deleteProperty(state: DemoState, action: PayloadAction<string>) {
    const prop = state.props.find((p) => p.id === action.payload);
    state.props = state.props.filter((p) => p.id !== action.payload);
    delete state.tours[action.payload];
    if (state.props[0]) state.propId = state.props[0].id;
    state.toast = `${prop?.name ?? 'Property'} deleted.`;
  },

  setPropStage(state: DemoState, action: PayloadAction<StageKey>) {
    const prop = curProp(state);
    if (prop) prop.stage = action.payload;
    state.toast = `Deployment stage set to “${STAGES.find((s) => s.key === action.payload)?.label ?? ''}”.`;
  },

  togglePropMap(state: DemoState) {
    const prop = curProp(state);
    if (!prop) return;
    prop.has3D = !prop.has3D;
    state.toast = prop.has3D
      ? `3D maps enabled for ${prop.name}.`
      : '3D maps disabled — 2D map still active.';
  },

  saveRates(state: DemoState) {
    const form = state.form as Record<string, string>;
    const prop = state.props.find((p) => p.id === state.editingId);
    if (prop) {
      prop.billing = {
        ...prop.billing,
        touch: form.touch || '—',
        tour: form.tour || '—',
        maps: form.maps || '—',
        combined: form.combined || '—',
        month: form.month || 'Pending'
      };
    }
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = 'Rate card updated.';
  },

  regenQr(state: DemoState) {
    state.qrStamp = 'Regenerated just now · previous codes invalidated';
    state.toast = `New QR codes generated for ${curProp(state)?.name ?? 'this property'}.`;
  },

  /* ---------- users ---------- */

  saveUser(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.name ?? '').trim()) {
      state.toast = 'Enter a name.';
      return;
    }
    state.users.push({
      id: uid('u'),
      name: form.name,
      email: form.email || '—',
      org: form.org,
      role: form.role,
      status: 'Pending',
      statusV: 'warn'
    });
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `Invite sent to ${form.email || form.name}.`;
  },

  removeUser(state: DemoState, action: PayloadAction<string>) {
    const user = state.users.find((u) => u.id === action.payload);
    if (!user) return;
    if (user.self) {
      state.toast = "You can't remove yourself.";
      return;
    }
    state.users = state.users.filter((u) => u.id !== action.payload);
    state.toast = `${user.name} removed.`;
  }
};
