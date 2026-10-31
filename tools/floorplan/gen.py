import re, json, sys
sys.path.insert(0,'.')
import nodes
from reg import M
OX,OY=330,20
P='../../data/venue-data.js'
s=open(P).read()
def T(p): return [round(p[0]-OX), round(p[1]-OY)]
def TM(x,y): return [round(M[0,0]*x+M[0,1]*y+M[0,2]-OX), round(M[1,0]*x+M[1,1]*y+M[1,2]-OY)]
# blocks の pos を図面の座標へ
a=s.index('  blocks: ['); b=s.index('  qrCodes')
blk=re.sub(r'pos: \[(\d+), (\d+)\]', lambda m: 'pos: %s' % json.dumps(TM(int(m.group(1)),int(m.group(2)))).replace(',',', '), s[a:b])
s=s[:a]+blk+s[b:]
# nodes
lines=['  nodes: [']
cur=None
heads={'gate':'','ring':'','core':'','lounge':''}
for id,name,floor,pos,typ,tent in nodes.nodes:
    t=', tentative: true' if tent else ''
    lines.append('    { id: "%s", name: "%s", floor: "%s", pos: %s, type: "%s"%s },' % (id,name,floor,json.dumps(T(pos)).replace(',',', '),typ,t))
lines[-1]=lines[-1].rstrip(',')
lines.append('  ],\n')
a=s.index('  nodes: ['); b=s.index('  /*', a)
s=s[:a]+'\n'.join(lines)+'\n'+s[b:]
# edges
el=['  edges: [']
el.append(',\n'.join('    ["%s", "%s", "%s"]'%e for e in nodes.edges))
el.append('  ],\n')
a=s.index('  edges: ['); b=s.index('  /*', a)
s=s[:a]+'\n'.join(el)+'\n'+s[b:]
open(P,'w').write(s)
