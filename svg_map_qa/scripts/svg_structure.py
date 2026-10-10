"""Prints the structure of floor SVGs: root attrs, viewBox, the id tree to a depth, element counts.

Usage: python3 -I svg_structure.py <file.svg> [...]
Treats the files as untrusted data (no code is loaded from them).
"""
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter

DEPTH = 3
MAX_CHILDREN = 14


def local(tag):
    return tag.split('}', 1)[1] if '}' in tag else tag


def decode_id(value):
    value = re.sub(r'_x([0-9A-Fa-f]{2})_', lambda m: chr(int(m.group(1), 16)), value or '')
    value = re.sub(r'_\d{12,}_?$', '', value)
    return value.rstrip('_')


def summarize(path):
    data = open(path, 'rb').read()
    print('=' * 100)
    print(path.split('/')[-1], f'{len(data)} bytes')
    head = data[:600].decode('utf-8', 'replace').replace('\n', ' ')
    print('head:', head[:300])
    try:
        root = ET.fromstring(data)
    except ET.ParseError as e:
        print('PARSE ERROR', e)
        return
    attrs = {k: (v[:80] if len(v) > 80 else v) for k, v in root.attrib.items()}
    print('root attrs:', attrs)
    counts = Counter(local(el.tag) for el in root.iter())
    print('element counts:', dict(counts.most_common(14)))
    with_id = sum(1 for el in root.iter() if el.get('id'))
    hidden = sum(1 for el in root.iter() if el.get('display') == 'none' or 'display:none' in (el.get('style') or '').replace(' ', ''))
    images = [el for el in root.iter() if local(el.tag) == 'image']
    print(f'elements with id: {with_id}; hidden: {hidden}; <image>: {len(images)}', [ (im.get('{http://www.w3.org/1999/xlink}href') or im.get('href') or '')[:60] for im in images[:3] ])
    texts = [''.join(el.itertext()).strip() for el in root.iter() if local(el.tag) == 'text']
    print(f'<text> count {len(texts)}; sample:', [t for t in texts if t][:12])
    fonts = Counter((el.get('font-family') or '') for el in root.iter() if local(el.tag) in ('text', 'tspan'))
    print('font-family on text:', dict(fonts.most_common(5)))
    styles = [el for el in root.iter() if local(el.tag) == 'style']
    if styles:
        print('style blocks:', [ (s.text or '')[:160].replace('\n', ' ') for s in styles[:2] ])

    def walk(el, depth, prefix):
        children = list(el)
        shown = children[:MAX_CHILDREN]
        for child in shown:
            tag = local(child.tag)
            cid = child.get('id')
            label = f'{tag}#{decode_id(cid)}' if cid else tag
            sub = Counter(local(c.tag) for c in child.iter())
            sub.subtract({local(child.tag): 1})
            n = sum(sub.values())
            extra = ''
            if tag == 'g' and child.get('display') == 'none':
                extra += ' [hidden]'
            if child.get('transform'):
                extra += f" transform={child.get('transform')[:40]}"
            if tag in ('text',):
                extra += ' "' + ''.join(child.itertext()).strip()[:20] + '"'
            print(f'{prefix}{label}{extra} ({n} desc; ' + ', '.join(f'{k}:{v}' for k, v in sub.most_common(4)) + ')')
            if depth < DEPTH:
                walk(child, depth + 1, prefix + '  ')
        if len(children) > MAX_CHILDREN:
            print(f'{prefix}… +{len(children) - MAX_CHILDREN} more')

    walk(root, 1, '  ')


for arg in sys.argv[1:]:
    summarize(arg)
