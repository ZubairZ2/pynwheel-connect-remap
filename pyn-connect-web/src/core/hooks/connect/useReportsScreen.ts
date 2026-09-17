'use client';

import { useMemo } from 'react';

import { DATE_RANGES, REPORT_DEFS } from '~/data/mock/analytics.mock';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector, useAppStore } from '~/core/store/hooks';
import { generateScopeSummary } from '~/core/utils/generator/connect/analytics.generator';
import {
  generateReportRowDescriptors,
  generateReportRows,
  toCsv
} from '~/core/utils/generator/connect/reports.generator';

export const useReportsScreen = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const demo = useAppSelector((s) => s.demo);

  const reportRows = useMemo(
    () =>
      generateReportRowDescriptors(demo).map((row) => ({
        ...row,
        run: () => {
          dispatch(demoActions.startReport(row.id));
          window.setTimeout(() => {
            const rows = generateReportRows(store.getState().demo, row.id).length - 1;
            dispatch(demoActions.finishReport({ id: row.id, name: row.name, rows }));
          }, 1300);
        },
        download: () => {
          const def = REPORT_DEFS.find((d) => d.id === row.id);
          if (def && def.fmt !== 'CSV') {
            dispatch(
              demoActions.showToast(
                `${def.fmt} rendering runs on the export service — the download starts in your browser.`
              )
            );
            return;
          }
          try {
            const csv = toCsv(generateReportRows(store.getState().demo, row.id));
            const blob = new Blob([csv], { type: 'text/csv' });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = `${row.id}-report.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            window.setTimeout(() => {
              URL.revokeObjectURL(anchor.href);
              anchor.remove();
            }, 500);
            dispatch(demoActions.showToast(`${row.id}-report.csv downloaded.`));
          } catch {
            dispatch(demoActions.showToast('Download blocked by the browser — try again.'));
          }
        }
      })),
    [demo, dispatch, store]
  );

  return {
    dateRange: demo.dateRange,
    dateRanges: DATE_RANGES,
    onDateRange: (event: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.setDateRange(event.target.value)),
    scopeSummary: generateScopeSummary(demo),
    reportRows
  };
};
