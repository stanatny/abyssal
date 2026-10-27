"""Fit sleeve ownership on welded HF topology, preserving UV seam agreement.

Run after conversion/rebake; no texture, position or index changes. Broad hanging
sleeves overlap the torso in XY, so axis-only weights stretch their inner edge.
"""
import base64
import json
import sys
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import spsolve

path = sys.argv[1]
d = json.load(open(path))
q = np.frombuffer(base64.b64decode(d['position']), '<u2').reshape(-1, 3)
unique, inverse = np.unique(q, axis=0, return_inverse=True)
p = np.array(d['min']) + unique / 65535 * (np.array(d['max']) - d['min'])
tri = inverse[np.frombuffer(base64.b64decode(d['index']), '<u2').reshape(-1, 3)]
e = np.concatenate([tri[:, [0,1]], tri[:, [1,2]], tri[:, [2,0]]])
e = np.unique(np.sort(e, axis=1), axis=0)
e = e[e[:,0] != e[:,1]]
length = np.linalg.norm(p[e[:,0]]-p[e[:,1]], axis=1)
w = 1 / np.maximum(length, .0001)
a = coo_matrix((np.r_[w,w], (np.r_[e[:,0],e[:,1]], np.r_[e[:,1],e[:,0]])), shape=(len(p),len(p))).tocsr()
x,y,z = p.T
# Strong arm seeds include the lower hanging sleeve. The central torso, head,
# boots and robe are fixed; the shoulder attachment is a smooth harmonic blend.
arm = (abs(x) > .19) & (y > -.06) & (y < .14)
body = (abs(x) < .045) | (y < -.39) | (y > .275)
fixed = arm | body
unknown = np.flatnonzero(~fixed)
f = arm.astype(float)
l = diags(np.asarray(a.sum(axis=1)).ravel()) - a
# Tiny regularizer makes isolated generated fragments deterministic.
f[unknown] = spsolve(l[unknown][:,unknown] + diags(np.full(len(unknown), 1e-8)), -l[unknown][:,fixed] @ f[fixed])
f = np.clip(f, 0, 1)
d['sleeveOwnership'] = base64.b64encode(np.rint(f[inverse]*65535).astype('<u2').tobytes()).decode()
d['sleeveBinding'] = 'welded-topology harmonic ownership v1'
with open(path,'w') as out: json.dump(d,out,separators=(',',':'))
print(json.dumps({'weldedVertices':len(p),'armSeeds':int(arm.sum()),'torsoSeeds':int(body.sum()),'bytes':len(inverse)*2}))
