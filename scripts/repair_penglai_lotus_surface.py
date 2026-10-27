"""对 HF 薄壳做离线实体重采样，消除相互重叠的薄片和减面裂口。"""
import sys,json,base64
from pathlib import Path
import numpy as np
import trimesh
from scipy import ndimage
from scipy.spatial import cKDTree
from skimage.measure import marching_cubes
raw,packed,output=sys.argv[1:]
d=json.load(open(packed));scene=trimesh.load(raw,force='scene',process=False)
mesh=scene.to_geometry();yaw=d['yaw'];c,s=np.cos(yaw),np.sin(yaw)
v=np.asarray(mesh.vertices)@np.array([[c,0,-s],[0,1,0],[s,0,c]])
v=(v-np.array(d['sourceNormalization']['center']))*d['sourceNormalization']['scale']
mesh=trimesh.Trimesh(vertices=v,faces=mesh.faces,process=True)
pitch=max(mesh.extents)/300
vox=mesh.voxelized(pitch,method='subdivide');a=np.pad(vox.matrix,3)
a=ndimage.binary_closing(a,iterations=1);a=ndimage.binary_fill_holes(a)
verts,faces,_,_=marching_cubes(a.astype(np.float32),.5,spacing=(pitch,)*3)
verts+=vox.transform[:3,3]-3*pitch
m=trimesh.Trimesh(vertices=verts,faces=faces,process=True)
trimesh.smoothing.filter_taubin(m,lamb=.35,nu=.36,iterations=4)
m=m.simplify_quadric_decimation(face_count=18000,aggression=4)
m.fix_normals()
p=np.array(m.vertices,dtype=np.float32);n=np.array(m.vertex_normals,dtype=np.float32)
fit=float(np.ptp(p[:,0]));p/=fit;d['sourceNormalization']['scale']/=fit
valid=np.linalg.norm(n,axis=1)>.1
if not valid.all():
 tree=cKDTree(p[valid]);_,nearest=tree.query(p[~valid]);n[~valid]=n[valid][nearest]
n/=np.linalg.norm(n,axis=1)[:,None]
lo=p.min(0);hi=p.max(0)
q=np.round((p-lo)/(hi-lo)*65535).astype('<u2');normal=np.round(np.clip(n,-1,1)*32767).astype('<i2');idx=np.array(m.faces,dtype='<u2')
def b64(a):return base64.b64encode(a.tobytes()).decode()
d.update(vertices=len(p),triangles=len(m.faces),min=lo.tolist(),max=hi.tolist(),position=b64(q),normal=b64(normal),uv=b64(np.zeros((len(p),2),dtype='<u2')),index=b64(idx),surfaceRepair={'method':'voxelized closed shell, Taubin smoothing, quadric reduction','pitch':pitch,'watertight':bool(m.is_watertight),'faces':len(m.faces)})
for key in ['textureBake','uvChart']:d.pop(key,None)
Path(output).parent.mkdir(parents=True,exist_ok=True);Path(output).write_text(json.dumps(d,separators=(',',':'))+'\n');print(d['surfaceRepair'],len(p))
