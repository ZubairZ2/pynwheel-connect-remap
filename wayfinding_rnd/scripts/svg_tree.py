"""Print the named structure of an SVG: root attrs, every element with an id (depth, tag, id, child count, fill/stroke, how many leaf shapes beneath)."""
import sys, re, xml.etree.ElementTree as ET
from collections import Counter
def local(t): return t.split('}',1)[1] if '}' in t else t
path=sys.argv[1]; maxdepth=int(sys.argv[2]) if len(sys.argv)>2 else 3
root=ET.parse(path).getroot()
print('ROOT', {k:v for k,v in root.attrib.items() if k in ('viewBox','width','height')})
tags=Counter(local(e.tag) for e in root.iter()); print('TAGS', dict(tags))
ids=[e.get('id') for e in root.iter() if e.get('id')]
print('IDS total', len(ids), 'unique', len(set(ids)))
def leafs(e):
    return Counter(local(c.tag) for c in e.iter() if local(c.tag) in ('path','rect','polygon','polyline','line','circle','ellipse','text','image','use'))
def style(e):
    s={}
    for k in ('fill','stroke','stroke-width','opacity','display','transform','fill-rule','clip-path','filter'):
        if e.get(k) is not None: s[k]=e.get(k)[:40]
    st=e.get('style')
    if st: s['style']=st[:60]
    return s
def walk(e,d=0):
    if d>maxdepth: return
    for c in e:
        t=local(c.tag)
        if c.get('id') or t=='g' and d<2:
            print('  '*d, t, repr(c.get('id')), 'kids=%d'%len(c), dict(leafs(c)), style(c))
        if t in ('g','svg','defs','clipPath','mask'):
            walk(c,d+1)
walk(root)
