/**
 * The SVG adapter works on a plain element tree, not the DOM: tag, raw
 * attributes, children, parent and the element's own text. The browser
 * builds it from `DOMParser` (`parseSvgTree`); tests build the same tree
 * from a file. Like the POC's adapter it never needs a layout engine — no
 * `getBBox`, no `getCTM` — so every phase is a pure function of the tree.
 */

export interface SvgEl {
  tag: string;
  attrs: Record<string, string>;
  children: SvgEl[];
  parent: SvgEl | null;
  /** The element's own text (its direct text nodes). */
  text: string;
}

/** Attributes the engine never reads and that can be megabytes (embedded raster backgrounds). */
const DROPPED_ATTRS = new Set(['href', 'xlink:href']);

export const attr = (el: SvgEl, name: string): string | null => el.attrs[name] ?? null;

export const idOf = (el: SvgEl): string => el.attrs.id ?? '';

/** Every descendant, depth first, in document order. */
export const descendants = (el: SvgEl): SvgEl[] => {
  const out: SvgEl[] = [];
  const stack = [...el.children].reverse();
  while (stack.length) {
    const node = stack.pop()!;
    out.push(node);
    for (let i = node.children.length - 1; i >= 0; i -= 1) stack.push(node.children[i]);
  }
  return out;
};

export const contains = (ancestor: SvgEl, el: SvgEl): boolean => {
  let node: SvgEl | null = el;
  while (node) {
    if (node === ancestor) return true;
    node = node.parent;
  }
  return false;
};

export const textContent = (el: SvgEl): string => el.text + el.children.map(textContent).join('');

/** `display="none"`, or a `display: none` / `visibility: hidden` style: Illustrator hides a file's other floors this way. */
export const isHidden = (el: SvgEl): boolean => {
  const style = el.attrs.style ?? '';
  return el.attrs.display === 'none' || /display\s*:\s*none/i.test(style) || el.attrs.visibility === 'hidden' || /visibility\s*:\s*hidden/i.test(style);
};

/** An element or one of its ancestors is hidden. */
export const isHiddenInTree = (el: SvgEl): boolean => {
  let node: SvgEl | null = el;
  while (node) {
    if (isHidden(node)) return true;
    node = node.parent;
  }
  return false;
};

/** The tree of a parsed DOM element (browser). */
export const fromDomElement = (root: Element): SvgEl => {
  const build = (element: Element, parent: SvgEl | null): SvgEl => {
    const attrs: Record<string, string> = {};
    for (const attribute of Array.from(element.attributes)) {
      if (!DROPPED_ATTRS.has(attribute.name)) attrs[attribute.name] = attribute.value;
    }
    const node: SvgEl = { tag: (element.localName || element.tagName).toLowerCase(), attrs, children: [], parent, text: '' };
    let text = '';
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 1) node.children.push(build(child as Element, node));
      else if (child.nodeType === 3 || child.nodeType === 4) text += child.nodeValue ?? '';
    }
    node.text = text;
    return node;
  };
  return build(root, null);
};

export type SvgParse = { ok: true; root: SvgEl } | { ok: false; reason: 'empty' | 'invalid' | 'not-svg' };

/** Parses floor SVG text in the browser. Empty, unparseable and non-SVG files are told apart. */
export const parseSvgTree = (text: string): SvgParse => {
  if (!text || !text.trim()) return { ok: false, reason: 'empty' };
  let parsed: Document;
  try {
    parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (parsed.getElementsByTagName('parsererror').length) return { ok: false, reason: 'invalid' };
  const root = parsed.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg') return { ok: false, reason: 'not-svg' };
  return { ok: true, root: fromDomElement(root) };
};
