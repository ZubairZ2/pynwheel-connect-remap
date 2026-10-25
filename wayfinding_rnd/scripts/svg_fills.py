"""Histogram of fill colours weighted by bbox area, and the largest shapes, for a flattened file."""
import sys, re, xml.etree.ElementTree as ET
from collections import defaultdict
NUM=re.compile(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?')
def local(t): return t.split('}',1)[1] if '}' in t else t
root=ET.parse(sys.argv[1]).getroot()
parent={c:p for p in root.iter() for c in p}
def indefs(e):
    while e is not None:
        if local(e.tag) in ('defs','clipPath','mask','pattern','filter'): return True
        e=parent.get(e)
    return False
agg=defaultdict(lambda:[0,0.0]); big=[]
for e in root.iter():
    t=local(e.tag)
    if t not in ('path','rect','polygon') or indefs(e): continue
    if t=='path': nums=[float(n) for n in NUM.findall(e.get('d') or '')]
    elif t=='polygon': nums=[float(n) for n in NUM.findall(e.get('points') or '')]
    else:
        x,y,w,h=(float(e.get(k) or 0) for k in('x','y','width','height')); nums=[x,y,x+w,y+h]
    xs=nums[0::2]; ys=nums[1::2]
    if not xs: continue
    area=(max(xs)-min(xs))*(max(ys)-min(ys))
    key=(e.get('fill'), e.get('stroke'), e.get('stroke-width'), e.get('fill-opacity') or e.get('opacity'))
    agg[key][0]+=1; agg[key][1]+=area
    big.append((area,t,e.get('id'),key,(round(min(xs)),round(min(ys)),round(max(xs)),round(max(ys))),len(e.get('d') or ''), 'Z' in (e.get('d') or 'Z').upper()))
print('fill/stroke groups by total bbox area:')
for k,(n,a) in sorted(agg.items(), key=lambda kv:-kv[1][1])[:25]: print('  n=%4d area=%10.0f'%(n,a), k)
print('largest shapes:')
for row in sorted(big, key=lambda r:-r[0])[:25]: print('  ', row)
