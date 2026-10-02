import type { SvgEl } from '~/core/utils/wayfinding/hallways/svg/svgTree';

/**
 * The hallway engine's element tree read from SVG text without a browser,
 * for the Node-side tests: the browser builds the same tree from DOMParser
 * (`parseSvgTree`). A small XML reader — declarations, comments, DOCTYPE
 * (with its internal entities, which Illustrator writes), CDATA, quoted
 * attributes, character references — that throws on a malformed file.
 */

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const decode = (value: string, entities: Record<string, string>): string =>
  value.replace(/&(#x[0-9a-fA-F]+|#\d+|[A-Za-z_][\w.-]*);/g, (match, ref: string) => {
    if (ref[0] === '#') return String.fromCodePoint(ref[1] === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10));
    return entities[ref] ?? XML_ENTITIES[ref] ?? match;
  });

const DROPPED = new Set(['href', 'xlink:href']);

export const readSvgTree = (text: string): SvgEl => {
  const entities: Record<string, string> = {};
  let root: SvgEl | null = null;
  const stack: SvgEl[] = [];
  let i = 0;
  const appendText = (raw: string) => {
    const top = stack[stack.length - 1];
    if (top) top.text += raw;
  };
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt < 0) {
      appendText(decode(text.slice(i), entities));
      break;
    }
    if (lt > i) appendText(decode(text.slice(i, lt), entities));
    if (text.startsWith('<!--', lt)) {
      const end = text.indexOf('-->', lt + 4);
      if (end < 0) throw new Error('unterminated comment');
      i = end + 3;
    } else if (text.startsWith('<![CDATA[', lt)) {
      const end = text.indexOf(']]>', lt + 9);
      if (end < 0) throw new Error('unterminated CDATA');
      appendText(text.slice(lt + 9, end));
      i = end + 3;
    } else if (text.startsWith('<?', lt)) {
      const end = text.indexOf('?>', lt + 2);
      if (end < 0) throw new Error('unterminated declaration');
      i = end + 2;
    } else if (text.startsWith('<!DOCTYPE', lt) || text.startsWith('<!doctype', lt)) {
      const open = text.indexOf('[', lt);
      const close = text.indexOf('>', lt);
      if (open >= 0 && open < close) {
        const end = text.indexOf(']>', open);
        if (end < 0) throw new Error('unterminated DOCTYPE');
        const subset = text.slice(open + 1, end);
        for (const match of subset.matchAll(/<!ENTITY\s+([\w.-]+)\s+(?:"([^"]*)"|'([^']*)')\s*>/g)) entities[match[1]] = match[2] ?? match[3] ?? '';
        i = end + 2;
      } else {
        i = close + 1;
      }
    } else if (text[lt + 1] === '/') {
      const end = text.indexOf('>', lt);
      const name = text.slice(lt + 2, end).trim().toLowerCase();
      const top = stack.pop();
      if (!top || top.tag !== name.replace(/^.*:/, '')) throw new Error(`mismatched </${name}>`);
      i = end + 1;
    } else {
      const tagMatch = /^<([A-Za-z_][\w:.-]*)/.exec(text.slice(lt, lt + 200));
      if (!tagMatch) throw new Error('bad tag');
      let j = lt + tagMatch[0].length;
      const attrs: Record<string, string> = {};
      let selfClosing = false;
      for (;;) {
        while (/\s/.test(text[j] ?? '')) j += 1;
        if (text[j] === '/' && text[j + 1] === '>') {
          selfClosing = true;
          j += 2;
          break;
        }
        if (text[j] === '>') {
          j += 1;
          break;
        }
        const nameMatch = /^[^\s=/>]+/.exec(text.slice(j, j + 200));
        if (!nameMatch) throw new Error('bad attribute');
        const name = nameMatch[0];
        j += name.length;
        while (/\s/.test(text[j] ?? '')) j += 1;
        if (text[j] !== '=') throw new Error('attribute without value');
        j += 1;
        while (/\s/.test(text[j] ?? '')) j += 1;
        const quote = text[j];
        if (quote !== '"' && quote !== "'") throw new Error('unquoted attribute');
        const end = text.indexOf(quote, j + 1);
        if (end < 0) throw new Error('unterminated attribute');
        if (!DROPPED.has(name)) attrs[name] = decode(text.slice(j + 1, end), entities);
        j = end + 1;
      }
      const parent = stack[stack.length - 1] ?? null;
      const el: SvgEl = { tag: tagMatch[1].replace(/^.*:/, '').toLowerCase(), attrs, children: [], parent, text: '' };
      if (parent) parent.children.push(el);
      else if (!root) root = el;
      else throw new Error('more than one root');
      if (!selfClosing) stack.push(el);
      i = j;
    }
  }
  if (stack.length) throw new Error('unclosed element');
  if (!root || (root as SvgEl).tag !== 'svg') throw new Error('not an SVG document');
  return root;
};
