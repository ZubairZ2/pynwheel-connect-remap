'use client';

import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useMemo, useRef } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curLevel } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';
import {
  generateAutoPlotReport,
  generateEdgeLines,
  generateInvPins,
  generateLevelNodeCount,
  generateMapHint,
  generateMapLevels,
  generateMapNodes,
  generateMapTools,
  generatePlanView,
  generatePlotQueue,
  generatePlotSummary,
  generateSelPin,
  generateSelection
} from '~/core/utils/generator/connect/mapEditor.generator';
import {
  generateBedLegend,
  generateStartPointRows,
  generateStartPointsMissing,
  generateVerticalLinks
} from '~/core/utils/generator/connect/tour.generator';

export const useMapEditorScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const level = curLevel(demo);

  /** Pointer position as a percentage of the plan surface. */
  const relPos = useCallback((event: { clientX: number; clientY: number }) => {
    const element = mapRef.current;
    if (!element) return { x: 50, y: 50 };
    const rect = element.getBoundingClientRect();
    return {
      x: Math.max(2, Math.min(98, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(2, Math.min(98, ((event.clientY - rect.top) / rect.height) * 100))
    };
  }, []);

  const mapTools = useMemo(
    () => generateMapTools(demo).map((tool) => ({ ...tool, pick: () => dispatch(demoActions.pickTool(tool.id)) })),
    [demo, dispatch]
  );

  const onNodeDown = (id: string) => (event: ReactPointerEvent<Element>) => {
    event.stopPropagation();
    if (demo.mapTool === 'edge') {
      if (!demo.edgeFrom) dispatch(demoActions.startEdge(id));
      else if (demo.edgeFrom === id) dispatch(demoActions.startEdge(null));
      else dispatch(demoActions.connectNodes({ from: demo.edgeFrom, to: id }));
      return;
    }
    if (demo.mapTool === 'move') {
      dispatch(demoActions.startNodeDrag(id));
      try {
        (event.currentTarget as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
          event.pointerId
        );
      } catch {
        /* pointer capture is best-effort */
      }
      return;
    }
    dispatch(demoActions.selectNode(id));
  };

  const mapNodes = useMemo(
    () => generateMapNodes(demo).map((node) => ({ ...node, down: onNodeDown(node.nodeId) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demo, dispatch]
  );

  const invPins = useMemo(
    () =>
      generateInvPins(demo).map((pin) => ({
        ...pin,
        down: (event: ReactPointerEvent<Element>) => {
          event.stopPropagation();
          if (demo.mapTool === 'move') {
            dispatch(demoActions.startPinDrag({ kind: pin.kind, id: pin.id }));
            try {
              (event.currentTarget as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
                event.pointerId
              );
            } catch {
              /* pointer capture is best-effort */
            }
          } else {
            dispatch(demoActions.selectPin({ kind: pin.kind, id: pin.id }));
          }
        }
      })),
    [demo, dispatch]
  );

  const plotQueue = useMemo(
    () =>
      generatePlotQueue(demo).map((item) => ({
        ...item,
        pick: () => {
          dispatch(demoActions.armPlot({ kind: item.kind, id: item.id }));
          dispatch(demoActions.showToast(`Click the plan to place ${item.name}.`));
        }
      })),
    [demo, dispatch]
  );

  const bedLegend = useMemo(
    () =>
      generateBedLegend(demo).map((tier) => ({
        ...tier,
        swatches: tier.swatches.map((swatch) => ({
          ...swatch,
          pick: () => dispatch(demoActions.setBedColor({ tier: tier.id, color: swatch.c }))
        }))
      })),
    [demo, dispatch]
  );

  const selPin = generateSelPin(demo);

  return {
    prop: generatePropertyView(demo),
    mapRef,
    mapTools,
    mapCursor: demo.mapTool === 'junction' ? 'copy' : demo.mapTool === 'move' ? 'grab' : 'default',
    mapHint: generateMapHint(demo),
    mapNodes,
    invPins,
    edgeLines: generateEdgeLines(demo),
    mapLevels: generateMapLevels(demo).map((row) => ({
      ...row,
      pick: () => dispatch(demoActions.pickLevel(row.id))
    })),
    ...generatePlanView(demo),
    ...generateSelection(demo),
    ...generatePlotSummary(demo),
    plotQueue,
    bedLegend,
    hasSelPin: !!demo.selectedPin,
    selPin,
    levelNodeCount: generateLevelNodeCount(demo),
    hasAutoPlotReport: !!demo.autoPlotReport,
    autoPlotReport: generateAutoPlotReport(demo),
    dismissAutoPlot: () => dispatch(demoActions.dismissAutoPlot()),
    startPointRows: generateStartPointRows(demo),
    startPointsMissing: generateStartPointsMissing(demo),
    startPointsMissingLabel: 'Automatic routing is disabled until every building has a starting point.',
    verticalLinks: generateVerticalLinks(demo),
    hasVerticalLinks: generateVerticalLinks(demo).length > 0,

    /* pointer plumbing */
    onMapDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if ((event.target as Element).closest('[data-node]')) return;
      if (demo.mapTool === 'plot' && demo.plotTarget) {
        dispatch(demoActions.placePin(relPos(event)));
        return;
      }
      if (demo.mapTool === 'junction') {
        dispatch(demoActions.addJunction(relPos(event)));
        return;
      }
      dispatch(demoActions.selectNode(null));
    },
    onMapMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (demo.dragPin) {
        dispatch(demoActions.dragPinTo(relPos(event)));
        return;
      }
      if (demo.draggingId) dispatch(demoActions.dragNodeTo(relPos(event)));
    },
    onMapUp: () => dispatch(demoActions.endDrag()),

    /* selection editing */
    onSelLabel: (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(demoActions.renameSelectedNode(event.target.value)),
    deleteSelected: () => dispatch(demoActions.deleteSelectedNode()),
    setStartPoint: () => dispatch(demoActions.setStartPoint()),
    removePin: () => {
      const item = selPin;
      actions.confirm({
        title: `Remove ${item.name} from the plan?`,
        msg: `The pin is deleted and ${item.name} returns to the unplotted list. Visitors stop seeing it on the map once you publish.`,
        label: 'Remove Pin',
        action: { type: demoActions.removePin.type }
      });
    },
    movePinToThisFloor: () => dispatch(demoActions.movePinToThisFloor()),
    clearPlotTarget: () => dispatch(demoActions.clearPlotTarget()),

    /* plan assets */
    uploadSvg: () => dispatch(demoActions.applyPlanUpload({ levelId: demo.levelId, slot: 'svg' })),
    uploadRaster: () => dispatch(demoActions.applyPlanUpload({ levelId: demo.levelId, slot: 'bg' })),
    optimizeCurSvg: () => actions.optimizeSvg(demo.levelId),
    clearPlan: () =>
      actions.confirm({
        title: `Remove the site plan for ${level?.building} · ${level?.floor}?`,
        msg: 'Pins already placed on this floor stay in inventory but stop rendering until a new plan is uploaded.',
        label: 'Remove Plan',
        action: { type: demoActions.clearPlan.type }
      }),
    onPlanDragOver: (event: DragEvent) => {
      event.preventDefault();
      if (!demo.svgDrag) dispatch(demoActions.setSvgDrag(true));
    },
    onPlanDragLeave: (event: DragEvent) => {
      event.preventDefault();
      if (demo.svgDrag) dispatch(demoActions.setSvgDrag(false));
    },
    onPlanDrop: (event: DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0]?.name ?? '';
      const slot = file ? (/\.svg$/i.test(file) ? 'svg' : 'bg') : demo.dropSlot === 'bg' ? 'bg' : 'svg';
      dispatch(demoActions.applyPlanUpload({ levelId: demo.levelId, slot, file: file || undefined }));
    },
    dropBorder: demo.svgDrag ? 'var(--bo-accent)' : 'var(--bo-line)',
    dropBg: demo.svgDrag ? 'var(--bo-accent-soft)' : 'transparent',
    dropLabel: demo.svgDrag ? 'Drop to upload' : 'Drag an .svg site plan here',
    pickDropSvg: () => dispatch(demoActions.setDropSlot('svg')),
    pickDropBg: () => dispatch(demoActions.setDropSlot('bg')),
    dropSlotSvgBg: demo.dropSlot !== 'bg' ? 'var(--bo-ink)' : '#fff',
    dropSlotSvgColor: demo.dropSlot !== 'bg' ? '#fff' : 'var(--bo-muted)',
    dropSlotBgBg: demo.dropSlot === 'bg' ? 'var(--bo-ink)' : '#fff',
    dropSlotBgColor: demo.dropSlot === 'bg' ? '#fff' : 'var(--bo-muted)',

    /* grid + navigation */
    toggleGrid: () => dispatch(demoActions.toggleGrid()),
    gridToggleBg: demo.gridOn ? 'var(--bo-accent)' : '#CDD2DB',
    gridKnob: demo.gridOn ? '21px' : '3px',
    gridDisplay: demo.gridOn ? 'block' : 'none',
    autoPlot: actions.autoPlot,
    publishTour: actions.publishTour,
    goTourSetup: actions.goTourSetup,
    goInventoryUnits: () => actions.goInventory('units'),
    backToProperty: () => actions.openProp(demo.propId),
    goProperties: () => actions.go(CONNECT_ROUTES.properties)
  };
};
