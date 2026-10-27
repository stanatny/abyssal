import json,base64,numpy as np,trimesh
from scipy.spatial import cKDTree
from pathlib import Path
import sys
from scipy import ndimage as nd
from skimage.measure import marching_cubes
# Build conservative closed cores from the generated surfaces; visible skins stay unchanged.
p=Path(sys.argv[1]);h={};report=[]
for kind in ["gate_dragon","peng","gilded_cloud_carp","taotie"]:
 d=json.load(open(p/(kind+'.json')));a=np.array(d['positions']).reshape(-1,3);faces=np.array(d['indices']).reshape(-1,3)
 source=trimesh.Trimesh(a,faces,process=False);pitch=max(source.extents)/128;vox=source.voxelized(pitch)
 solid=nd.binary_fill_holes(nd.binary_closing(np.pad(vox.matrix,3),iterations=3));inset=nd.binary_erosion(solid,iterations=2)
 labels,count=nd.label(inset);sizes=np.bincount(labels.ravel());sizes[0]=0;field=nd.gaussian_filter((labels==sizes.argmax()).astype(np.float32),.9)
 v,f,_,_=marching_cubes(field,.5,spacing=(pitch,)*3,gradient_direction='ascent',step_size=6,allow_degenerate=False)
 v+=vox.transform[:3,3]-3*pitch;m=trimesh.Trimesh(v,f,process=True);trimesh.smoothing.filter_laplacian(m,iterations=2,volume_constraint=False);assert m.is_watertight
 v=m.vertices;_,near=cKDTree(a).query(v);low=v.min(0);sz=v.max(0)-low
 pack=lambda a,t:base64.b64encode(np.array(a,dtype=t).tobytes()).decode()
 h[d['key']]={'position':pack(np.rint((v-low)/sz*65535),'<u2'),'index':pack(m.faces,'<u2'),'nearest':pack(near,'<u2'),'low':low.tolist(),'span':sz.tolist()}
 report.append({'kind':kind,'faces':len(m.faces),'closed':m.is_watertight,'volume':m.volume,'method':'Voxel-filled inset body core'})
json.dump(h,open(p/"hulls.json","w"));json.dump(report,open(p/"loft_report.json","w"),indent=2);print(report)
