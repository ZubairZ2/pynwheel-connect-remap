import { PAGE_TYPES } from '~/data/mock/content.mock';
import { REPORT_DEFS, SURFACES } from '~/data/mock/analytics.mock';
import {
  ACCESS_LOG,
  ILS_PARTNERS,
  PROP_ANALYTICS,
  STAGE_PILL
} from '~/data/mock/core.mock';
import { DAYS, HOLD_STYLE, SYNC_STYLE, TYPE_LABEL } from '~/data/mock/scheduling.mock';
import { plural } from '~/core/utils/connect/format';
import type { DemoState } from '~/core/store/demo/demo.state';

import { scopedProps } from './analytics.generator';

/** Builds a report as rows of cells — header row first, as the CSV export expects. */
export const generateReportRows = (state: DemoState, id: string): string[][] => {
  const props = scopedProps(state);

  if (id === 'unplotted') {
    const out = [['Property', 'Item', 'Type', 'Building', 'Floor', 'Reason']];
    props.forEach((prop) => {
      const inv = state.inv[prop.id] ?? { units: [], amenities: [], floorplans: [], elevators: [] };
      inv.units
        .filter((u) => !u.plotted)
        .forEach((u) => out.push([prop.name, u.name, 'Unit', u.building, u.floor, 'Not placed on a site plan']));
      inv.amenities
        .filter((a) => !a.plotted)
        .forEach((a) => out.push([prop.name, a.name, 'Amenity', '—', '—', 'Not placed on a site plan']));
    });
    return out;
  }

  if (id === 'access') {
    const out = [['Lock', 'Vendor', 'User', 'Property', 'When', 'Result']];
    ACCESS_LOG.forEach((e) => out.push([e.lock, e.vendor, e.user, e.property, e.when, e.result]));
    return out;
  }

  if (id === 'bookings') {
    const out = [['Visitor', 'Property', 'Day', 'Time', 'Type', 'CRM', 'Sync', 'Card hold']];
    state.bookings.forEach((b) =>
      out.push([
        b.visitor,
        state.props.find((p) => p.id === b.propId)?.name ?? '—',
        DAYS[b.day],
        b.time,
        TYPE_LABEL[b.type],
        b.crm,
        SYNC_STYLE[b.sync].label,
        HOLD_STYLE[b.hold].label
      ])
    );
    return out;
  }

  if (id === 'account') {
    const out = [['Company', 'Property', 'City', 'Stage', 'Touch', 'Self-Guided', 'Maps', 'Combined', 'Billing month']];
    props.forEach((prop) => {
      const org = state.orgs.find((o) => o.id === prop.orgId);
      out.push([
        org?.name ?? '—',
        prop.name,
        prop.city,
        STAGE_PILL[prop.stage].label,
        prop.billing.touch,
        prop.billing.tour,
        prop.billing.maps,
        prop.billing.combined,
        prop.billing.month
      ]);
    });
    return out;
  }

  if (id === 'sessions') {
    const out = [['Property', 'Surface', 'Sessions', 'Completion', 'Lead to lease']];
    props.forEach((prop) => {
      const a = PROP_ANALYTICS[prop.id] ?? { tours: 0, completion: 0, conversion: 0, surf: [0, 0, 0, 0, 0], dev: [] };
      SURFACES.forEach((surface, i) =>
        out.push([
          prop.name,
          surface.label,
          String(Math.round((a.tours * (a.surf[i] ?? 0)) / 100)),
          `${a.completion}%`,
          `${a.conversion}%`
        ])
      );
    });
    return out;
  }

  if (id === 'webpages') {
    const out = [['Property', 'Page', 'Type', 'Detail', 'On homepage']];
    props.forEach((prop) =>
      (state.pages[prop.id] ?? []).forEach((page) =>
        out.push([prop.name, page.title, PAGE_TYPES[page.type].label, page.detail, page.onHome ? 'Yes' : 'No'])
      )
    );
    return out;
  }

  if (id === 'partner') {
    const out = [['Property', 'Partner', 'Syndicating']];
    props.forEach((prop) => {
      const row = state.integ[prop.id];
      ILS_PARTNERS.forEach((partner) =>
        out.push([prop.name, partner.name, row?.ils[partner.id] ? 'Yes' : 'No'])
      );
    });
    return out;
  }

  const out = [['Property', 'Rating', 'Comment']];
  props.forEach((prop) =>
    out.push([prop.name, '4.6', 'Post-tour feedback not yet collected for this property'])
  );
  return out;
};

export const generateReportRowDescriptors = (state: DemoState) =>
  REPORT_DEFS.map((def) => {
    const run = state.reportRuns[def.id];
    const job = state.reportJobs[def.id] ?? { state: 'idle' as const, rows: 0 };

    return {
      ...def,
      lastRun: run ? run.when : 'Never generated',
      lastBy: run ? `by ${run.by}` : '—',
      hasRun: !!run,
      runV: run ? 'ok' : 'neutral',
      isIdle: job.state === 'idle',
      isGenerating: job.state === 'generating',
      isReady: job.state === 'ready',
      readyLabel: job.state === 'ready' ? `${plural(job.rows, 'row')} · ${def.fmt} ready` : '',
      downloadLabel: def.fmt === 'CSV' ? 'Download CSV' : `Download ${def.fmt}`
    };
  });

/** Serialises report rows as RFC 4180 CSV. */
export const toCsv = (rows: string[][]): string =>
  rows
    .map((row) =>
      row.map((cell) => (/[",]/.test(String(cell)) ? `"${String(cell).replace(/"/g, '""')}"` : String(cell))).join(',')
    )
    .join('\r\n');
