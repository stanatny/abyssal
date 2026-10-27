"""离线封闭生成兽类的薄片破面；保留源文件、材质投射空间与处理参数。"""
import argparse, base64, json
from pathlib import Path
import numpy as np
import trimesh
from scipy import ndimage
from skimage.measure import marching_cubes

parser = argparse.ArgumentParser()
parser.add_argument('input'); parser.add_argument('output')
parser.add_argument('--pitch',type=float,default=.0025)
parser.add_argument('--lushu-tail',action='store_true',help='Close thin mane/tail ribbons for the Lushu source only')
a=parser.parse_args();d=json.loads(Path(a.input).read_text())
q=np.frombuffer(base64.b64decode(d['position']),dtype='<u2').reshape(-1,3)
v=np.array(d['min'])+q/65535*(np.array(d['max'])-d['min'])
f=np.frombuffer(base64.b64decode(d['index']),dtype='<u2').reshape(-1,3)
m=trimesh.Trimesh(v,f,process=True);vox=m.voxelized(a.pitch)
pad=4;surface=np.pad(vox.matrix,pad);solid=ndimage.binary_fill_holes(ndimage.binary_closing(surface,iterations=1))
field=ndimage.gaussian_filter(solid.astype(np.float32),.55)
if a.lushu_tail:
    # The horsehair source consists of overlapping paper-thin ribbons. Keep limbs
    # and trunk untouched; regularize only the distal red tail into a continuous tuft.
    z=(np.arange(solid.shape[2])-pad)*a.pitch+vox.transform[2,3]
    region=np.clip((z-.22)/.06,0,1)[None,None,:]
    tail=ndimage.binary_closing(solid,iterations=4)
    tail=ndimage.binary_fill_holes(tail)
    field=field*(1-region)+ndimage.gaussian_filter(tail.astype(np.float32),1.3)*region
v,f,_,_=marching_cubes(field,.5,spacing=(a.pitch,)*3,allow_degenerate=False);v+=vox.transform[:3,3]-pad*a.pitch
m=trimesh.Trimesh(v,f,process=True);parts=m.split(only_watertight=False);m=max(parts,key=lambda p:len(p.faces))
trimesh.smoothing.filter_taubin(m,lamb=.35,nu=.36,iterations=3)
print('before reduction',len(m.faces),m.is_watertight,flush=True)
Path(a.output).parent.mkdir(parents=True,exist_ok=True)
if m.volume<0:m.invert()
m.export(str(Path(a.output).with_suffix('.ply')))
Path(a.output).with_suffix('.source.json').write_text(json.dumps(d))
print("Dense outward surface exported for topology-constrained reduction and source-color rebake",flush=True)
