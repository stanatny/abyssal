import json,base64,numpy as np,trimesh
from scipy.spatial import cKDTree
from pathlib import Path
import sys
from scipy import ndimage as nd
from skimage.measure import marching_cubes
# Usage: export the three final body surfaces, then pass their directory here.
p=Path(sys.argv[1]);h={};report=[]
d=json.load(open(p/'kun.json'));a=np.array(d['positions']).reshape(-1,3);faces=np.array(d['indices']).reshape(-1,3)
source=trimesh.Trimesh(a,faces,process=False);pitch=max(source.extents)/128;vox=source.voxelized(pitch)
solid=nd.binary_fill_holes(nd.binary_closing(np.pad(vox.matrix,3),iterations=3));inset=nd.binary_erosion(solid,iterations=2)
labels,count=nd.label(inset);sizes=np.bincount(labels.ravel());sizes[0]=0;field=nd.gaussian_filter((labels==sizes.argmax()).astype(np.float32),.9)
v,f,_,_=marching_cubes(field,.5,spacing=(pitch,)*3,gradient_direction='ascent',step_size=6,allow_degenerate=False)
v+=vox.transform[:3,3]-3*pitch;m=trimesh.Trimesh(v,f,process=True);trimesh.smoothing.filter_laplacian(m,iterations=2,volume_constraint=False);assert m.is_watertight
v=m.vertices;_,near=cKDTree(a).query(v);low=v.min(0);sz=v.max(0)-low
pack=lambda a,t:base64.b64encode(np.array(a,dtype=t).tobytes()).decode()
h[d['key']]={'position':pack(np.rint((v-low)/sz*65535),'<u2'),'index':pack(m.faces,'<u2'),'nearest':pack(near,'<u2'),'low':low.tolist(),'span':sz.tolist()}
report.append({'kind':'kun','faces':len(m.faces),'closed':m.is_watertight,'volume':m.volume,'method':'Voxel-filled inset body core'})
for kind,span in [('bashe',(-.44,.43)),('kui',(-.34,.34))]:
 d=json.load(open(p/(kind+'.json')));a=np.array(d['positions']).reshape(-1,3);v=[];f=[];rings=36;around=16
 for i,z in enumerate(np.linspace(*span,rings)):
  points=a[np.abs(a[:,2]-z)<.025];points=points[np.abs(points[:,0])<(.3 if kind=='kui' else 1)]
  if kind=='kui': points=points[points[:,1]>-.015]
  lo,hi=np.quantile(points[:,:2],[.04,.96],axis=0);cx,cy=(lo+hi)/2;rx,ry=(hi-lo)*.32
  taper=np.sin(np.pi*(i+.7)/(rings+.4))**.25
  for j in range(around):
   angle=j*2*np.pi/around;v.append([cx+rx*np.cos(angle)*taper,cy+ry*np.sin(angle)*taper,z])
 for i in range(rings-1):
  for j in range(around):
   n=(j+1)%around;a0=i*around+j;b0=i*around+n;c0=(i+1)*around+j;d0=(i+1)*around+n;f.extend([[a0,b0,c0],[b0,d0,c0]])
 for start,flip in [(0,True),((rings-1)*around,False)]:
  center=np.mean(v[start:start+around],axis=0);idx=len(v);v.append(center)
  for j in range(around):
   tri=[idx,start+j,start+(j+1)%around];f.append(tri[::-1] if flip else tri)
 m=trimesh.Trimesh(v,f,process=True);m.fix_normals();assert m.is_watertight
 v=m.vertices;_,near=cKDTree(a).query(v);low=v.min(0);sz=v.max(0)-low
 def pack(a,t):return base64.b64encode(np.array(a,dtype=t).tobytes()).decode()
 h[d['key']]={'position':pack(np.rint((v-low)/sz*65535),'<u2'),'index':pack(m.faces,'<u2'),'nearest':pack(near,'<u2'),'low':low.tolist(),'span':sz.tolist()}
 report.append({'kind':kind,'faces':len(m.faces),'vertices':len(v),'closed':m.is_watertight,'volume':m.volume,'bounds':m.bounds.tolist(),'source':'Conservative inset rings fitted to the generated trunk; excludes appendages and preserves visible skin.'})
json.dump(h,open(p/'hulls.json','w'));json.dump(report,open(p/'loft_report.json','w'),indent=2);print(report)
