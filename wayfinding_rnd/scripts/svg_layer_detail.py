"""Shapes under layers whose id matches a regex: tag, id, fill, stroke, stroke-width, bbox (from absolute numbers in d), approx length of d, closed."""
import sys, re, xml.etree.ElementTree as ET
NUM=re.compile(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?')
def local(t): return t.split('}',1)[1] if '}' in t else t
path, rx = sys.argv[1], re.compile(sys.argv[2]); maxrows=int(sys.argv[3]) if len(sys.argv)>3 else 30
root=ET.parse(path).getroot()
parent={c:p for p in root.iter() for c in p}
def chain(e):
    out=[]; 
    while e is not None and e is not root:
        if e.get('id'): out.append(e.get('id'))
        e=parent.get(e)
    return out
def bbox(e):
    t=local(e.tag)
    if t=='path': nums=[float(n) for n in NUM.findall(e.get('d') or '')]
    elif t in('polygon','polyline'): nums=[float(n) for n in NUM.findall(e.get('points') or '')]
    elif t=='rect':
        x,y,w,h=(float(e.get(k) or 0) for k in('x','y','width','height')); return (x,y,x+w,y+h)
    else: return None
    xs=nums[0::2]; ys=nums[1::2]
    if not xs or not ys: return None
    return (min(xs),min(ys),max(xs),max(ys))
rows=0
for e in root.iter():
    ids=chain(e)
    if not any(rx.search(i) for i in ids): continue
    t=local(e.tag)
    if t not in('path','rect','polygon','polyline','line','circle','ellipse','text','image','use'): continue
    d=e.get('d') or e.get('points') or ''
    b=bbox(e)
    print(t, repr(e.get('id')), 'under', '/'.join(reversed(ids[1:4])) , 'fill=%s stroke=%s sw=%s'%(e.get('fill'),e.get('stroke'),e.get('stroke-width')), 'closed=%s'%('Z' in d.upper()), 'bbox='+str(tuple(round(v) for v in b) if b else None), 'dlen=%d'%len(d), 'tf=%s'%e.get('transform'))
    rows+=1
    if rows>=maxrows: break
