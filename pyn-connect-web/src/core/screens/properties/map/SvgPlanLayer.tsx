'use client';

import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import type { FloorSvgDoc, PlotTarget } from '~/core/utils/map/floorSvg';
import type { PolygonDescriptor } from '~/core/utils/generator/map/mapPanels.generator';

const FILL_ASSIGNED = '#E8F4FB';
const FILL_HOVER = '#CFE7F4';
const STROKE_ACTIVE = '#0077AE';

interface Props {
  doc: FloorSvgDoc;
  polygons: PolygonDescriptor[];
  /** Manual Plot is on: hovering a polygon highlights it as a drop target. */
  plotOn: boolean;
  /** Something is selected to drop, so a polygon click drops it. */
  dropping: boolean;
  onPolygonDown: (target: PlotTarget) => void;
  onPolygonHover: (code: string | null) => void;
}

interface Original {
  fill: string;
  stroke: string;
  strokeWidth: string;
  cursor: string;
}

/**
 * The floor SVG itself, mounted once from the parsed text and kept across
 * renders, with its plottable shapes wired for hover and click the way the
 * legacy plotting page wires them (`svgHandler.js`): the shapes are found
 * again by the selectors the parser recorded, styled in place when something
 * sits on them or the pointer is over them, and restored otherwise.
 */
export const SvgPlanLayer = ({ doc, polygons, plotOn, dropping, onPolygonDown, onPolygonHover }: Props) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const elements = useRef(new Map<string, Element>());
  const byElement = useRef(new Map<Element, PlotTarget>());
  const originals = useRef(new Map<Element, Original>());
  const hovered = useRef<string | null>(null);

  const byKey = useMemo(() => new Map(polygons.map((polygon) => [polygon.key, polygon])), [polygons]);

  // Mount the document once per SVG text.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const parsed = new DOMParser().parseFromString(doc.text, 'image/svg+xml');
    const root = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
    root.removeAttribute('width');
    root.removeAttribute('height');
    root.setAttribute('viewBox', `${doc.viewBox.x} ${doc.viewBox.y} ${doc.viewBox.w} ${doc.viewBox.h}`);
    root.setAttribute('preserveAspectRatio', 'none');
    root.setAttribute('class', 'bo-map__svgdoc');
    root.setAttribute('focusable', 'false');
    host.replaceChildren(root);

    const found = new Map<string, Element>();
    const reverse = new Map<Element, PlotTarget>();
    const saved = new Map<Element, Original>();
    doc.targets.forEach((target) => {
      let element: Element | null = null;
      try {
        element = root.querySelector(target.selector);
      } catch {
        element = null;
      }
      if (!element) return;
      found.set(target.key, element);
      reverse.set(element, target);
      const style = (element as SVGElement).style;
      saved.set(element, { fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, cursor: style.cursor });
    });
    elements.current = found;
    byElement.current = reverse;
    originals.current = saved;

    return () => {
      host.replaceChildren();
      elements.current = new Map();
      byElement.current = new Map();
      originals.current = new Map();
    };
  }, [doc]);

  // Restyle the shapes whenever what sits on them, or the pointer, changes.
  useEffect(() => {
    elements.current.forEach((element, key) => {
      const original = originals.current.get(element);
      const style = (element as SVGElement).style;
      const polygon = byKey.get(key);
      if (!original) return;
      const active = polygon && (polygon.filled || polygon.hover || polygon.selected);
      if (!active) {
        style.fill = original.fill;
        style.stroke = original.stroke;
        style.strokeWidth = original.strokeWidth;
        style.cursor = plotOn && dropping ? 'copy' : original.cursor;
        return;
      }
      style.fill = polygon.hover ? FILL_HOVER : polygon.filled ? FILL_ASSIGNED : original.fill;
      style.stroke = polygon.hover || polygon.selected ? STROKE_ACTIVE : original.stroke;
      style.strokeWidth = polygon.hover || polygon.selected ? '3' : original.strokeWidth;
      style.cursor = plotOn && dropping ? 'copy' : 'pointer';
    });
  }, [byKey, dropping, plotOn]);

  const targetOf = (event: ReactPointerEvent<HTMLDivElement>): PlotTarget | null => {
    let node = event.target as Element | null;
    while (node && node !== hostRef.current) {
      const target = byElement.current.get(node);
      if (target) return target;
      node = node.parentElement;
    }
    return null;
  };

  return (
    <div
      ref={hostRef}
      className="bo-map__svglayer"
      data-testid="plan-svg"
      onPointerDown={(event) => {
        const target = targetOf(event);
        if (!target) return;
        event.stopPropagation();
        onPolygonDown(target);
      }}
      onPointerMove={(event) => {
        if (!plotOn) return;
        const code = targetOf(event)?.code ?? null;
        if (code !== hovered.current) {
          hovered.current = code;
          onPolygonHover(code);
        }
      }}
      onPointerLeave={() => {
        if (hovered.current !== null) {
          hovered.current = null;
          onPolygonHover(null);
        }
      }}
    />
  );
};
