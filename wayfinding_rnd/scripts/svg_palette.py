"""Per named BG layer: the (fill, stroke, stroke-width) combinations of its leaf shapes, with counts and closed/open — the Beans drawing conventions."""
import sys, re, xml.etree.ElementTree as ET
from collections import Counter
def local(t): return t.split('}',1)[1] if '}' in t else t
root=ET.parse(sys.argv[1]).getroot()
parent={c:p for p in root.iter() for c in p}
def named_layer(e):
    # nearest ancestor (or self) that is a direct child of a 'BG'/'Amenities'/'Units' group, or a top-level named group
    chain=[]
    n=e
    while n is not None and n is not root:
        chain.append(n); n=parent.get(n)
    for i,n in enumerate(chain):
        p=parent.get(n)
        if p is not None and p.get('id') in ('BG',) : return 'BG/'+(n.get('id') or '?')
        if p is not None and p.get('id') in ('Amenities','Units'): return p.get('id')+'/*'
    top=chain[-2] if len(chain)>=2 else chain[-1]
    return 'top:'+(top.get('id') or '?')
agg={}
for e in root.iter():
    t=local(e.tag)
    if t not in('path','rect','polygon','polyline','line','circle'): continue
    n=e
    skip=False
    while n is not None:
        if local(n.tag) in('defs','clipPath','pattern','mask','filter'): skip=True; break
        n=parent.get(n)
    if skip: continue
    layer=named_layer(e)
    d=e.get('d') or ''
    key=(e.get('fill'), e.get('stroke'), e.get('stroke-width'), 'closed' if (t in('polygon','rect','circle') or 'Z' in d.upper()) else 'open')
    agg.setdefault(layer, Counter())[key]+=1
for layer, c in agg.items():
    print(layer)
    for k,v in c.most_common(6): print('   %4d'%v, k)
