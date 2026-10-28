"""离线封闭 HF 岩体薄片，保留原始 GLB；结果供同源颜色投射使用。"""
import trimesh,numpy as np,json
from pathlib import Path
import sys
raw=Path(sys.argv[1]);b=Path(sys.argv[2]);b.mkdir(parents=True,exist_ok=True)
m=trimesh.load(raw,force='mesh');pitch=float(m.extents.max()/190)
from scipy.ndimage import binary_closing,binary_fill_holes
v=m.voxelized(pitch)
padded=np.pad(v.matrix,3)
solid=binary_fill_holes(binary_closing(padded,iterations=2))[3:-3,3:-3,3:-3]
v=trimesh.voxel.VoxelGrid(solid,transform=v.transform)
s=v.marching_cubes;s.apply_transform(v.transform)
trimesh.smoothing.filter_taubin(s,lamb=.45,nu=.5,iterations=3)
# Largest connected solid is the crag; sub-voxel export fragments are rejected.
parts=s.split(only_watertight=False);s=max(parts,key=lambda p:p.volume)
r={'rawFaces':len(m.faces),'pitch':pitch,'components':len(parts),'faces':len(s.faces),'watertight':bool(s.is_watertight),'extents':s.extents.tolist()}
(b/'solid_crag.json').write_text(json.dumps({'positions':s.vertices.reshape(-1).tolist(),'normals':s.vertex_normals.reshape(-1).tolist(),'index':s.faces.reshape(-1).tolist()}))
(b/'solid_crag_report.json').write_text(json.dumps(r,indent=2));print(r)
