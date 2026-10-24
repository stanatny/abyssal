from PIL import Image,ImageFilter
from pathlib import Path
import json,hashlib,sys
p=Path(sys.argv[1]).resolve();kinds=sys.argv[2:];repo=Path.cwd();out=repo/'src/assets/textures';out.mkdir(exist_ok=True)
r=[]
for kind in kinds:
 for channel in ['color','height']:
  path=p/'baked'/f'{kind}_{channel}.png';im=Image.open(path).convert('RGBA');a=im.getchannel('A');hist=a.histogram();missing=sum(hist[:250])/(im.width*im.height)
  assert missing < .004,(kind,missing,'Reject a perforated surface')
  # 微小投影边界覆盖使用相邻像素扩边，不引入另一个生成素材。
  if missing:
   import numpy as np
   from scipy.ndimage import distance_transform_edt
   data=np.array(im);mask=data[:,:,3]<250;idx=distance_transform_edt(mask,return_distances=False,return_indices=True);data[mask]=data[idx[0][mask],idx[1][mask]];im=Image.fromarray(data)
  im=im.convert('RGB')
  if channel=='height':
   import numpy as np
   im=im.resize((256,256),Image.Resampling.LANCZOS).convert('L').filter(ImageFilter.GaussianBlur(.7))
   values=np.array(im,dtype=float);lo,hi=np.percentile(values,[2,99])
   assert hi-lo>=2,(kind,'No usable geometric relief')
   im=Image.fromarray(np.uint8(np.clip((values-lo)/(hi-lo),0,1)*255))
  file=out/f'mariana_{kind}_hf_{channel}.webp';im.save(file,'WEBP',quality=90,method=6,lossless=channel=='height')
  r.append({'kind':kind,'channel':channel,'sourceBake':path.name,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'filledCoverage':missing,'dimensions':im.size,'output':str(file.relative_to(repo)),'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
print(r)
f=p/'packed_textures.json';old=json.loads(f.read_text()) if f.exists() else [];old=[v for v in old if v['kind'] not in kinds];f.write_text(json.dumps(old+r,indent=2)+'\n')
