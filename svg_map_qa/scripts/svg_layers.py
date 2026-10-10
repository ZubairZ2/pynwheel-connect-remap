"""Prints the shapes under layers whose decoded id matches a regex: tag, fill/stroke, closed, bbox, size.

Usage: python3 -I svg_layers.py <file.svg> <id-regex> [max-rows]
"""
import re
import sys
import xml.etree.ElementTree as ET

NUM = re.compile(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?')


def local(tag):
    return tag.split('}', 1)[1] if '}' in tag else tag


def decode_id(value):
    value = re.sub(r'_x([0-9A-Fa-f]{2})_', lambda m: chr(int(m.group(1), 16)), value or '')
    value = re.sub(r'_\d{12,}_?$', '', value)
    return value.rstrip('_')


def bbox_of(el):
    tag = local(el.tag)
    nums = []
    if tag == 'path':
        d = el.get('d') or ''
        # crude: absolute coordinates dominate Figma exports (M/L/C/H/V with absolute numbers)
        nums = [float(n) for n in NUM.findall(d)]
        closed = 'Z' in d.upper()
    elif tag in ('polygon', 'polyline'):
        nums = [float(n) for n in NUM.findall(el.get('points') or '')]
        closed = tag == 'polygon'
    elif tag == 'rect':
        x, y, w, h = (float(el.get(k) or 0) for k in ('x', 'y', 'width', 'height'))
        return (x, y, x + w, y + h, True)
    elif tag == 'line':
        nums = [float(el.get(k) or 0) for k in ('x1', 'y1', 'x2', 'y2')]
        closed = False
    else:
        return None
    if len(nums) < 4:
        return None
    xs = nums[0::2]
    ys = nums[1::2]
    return (min(xs), min(ys), max(xs), max(ys), closed)


def main():
    path, pattern = sys.argv[1], sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 40
    root = ET.fromstring(open(path, 'rb').read())
    parents = {c: p for p in root.iter() for c in p}
    rx = re.compile(pattern, re.I)
    shown = 0
    for el in root.iter():
        cid = el.get('id')
        if not cid or not rx.search(decode_id(cid)):
            continue
        # chain of ancestor ids
        chain = []
        node = el
        while node in parents:
            node = parents[node]
            if node.get('id'):
                chain.append(decode_id(node.get('id')))
        print(f"\n## {local(el.tag)}#{decode_id(cid)}  under: {' > '.join(reversed(chain))}  attrs: " + ', '.join(f'{k}={v[:30]}' for k, v in el.attrib.items() if k in ('fill', 'stroke', 'stroke-width', 'transform', 'opacity', 'fill-opacity', 'display')))
        shapes = [s for s in el.iter() if local(s.tag) in ('path', 'polygon', 'polyline', 'rect', 'line', 'circle', 'ellipse')]
        print(f'   shapes: {len(shapes)}')
        for s in shapes[:limit]:
            bb = bbox_of(s)
            size = f'{bb[2]-bb[0]:.0f}x{bb[3]-bb[1]:.0f} at ({bb[0]:.0f},{bb[1]:.0f}) closed={bb[4]}' if bb else '?'
            d = s.get('d') or s.get('points') or ''
            print(f"   - {local(s.tag)}#{decode_id(s.get('id') or '')} fill={s.get('fill')} stroke={s.get('stroke')} sw={s.get('stroke-width')} tr={(s.get('transform') or '')[:25]} {size} dlen={len(d)} d='{d[:70]}'")
        shown += 1
        if shown > 60:
            break


main()
