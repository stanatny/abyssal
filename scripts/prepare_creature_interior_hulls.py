# 离线体素填实内腔，再向内收一格；原皮肤、纹理与碰撞不变。
import json, numpy as np, trimesh, time
from scipy import ndimage as nd
from scipy.spatial import cKDTree
from skimage.measure import marching_cubes
from pathlib import Path
import base64
import sys

root = Path(sys.argv[1])
out = {}
reports = []
manifest = root / "manifest.json"
paths = (
    [root / name for name in json.load(open(manifest))]
    if manifest.exists()
    else list(root.glob("*.json"))
)
for path in sorted(paths):
    t = time.time()
    d = json.load(open(path))
    if "positions" not in d:
        continue
    v = np.array(d["positions"]).reshape(-1, 3)
    f = np.array(d["indices"]).reshape(-1, 3)
    mesh = trimesh.Trimesh(v, f, process=False)
    pitch = max(mesh.extents) / 128
    vox = mesh.voxelized(pitch, method="subdivide")
    surface = np.pad(vox.matrix, 3)
    closed = nd.binary_closing(surface, iterations=1)
    solid = nd.binary_fill_holes(closed)
    inset = nd.binary_erosion(solid, iterations=1)
    vv, ff, nn, _ = marching_cubes(
        inset.astype(np.float32), 0.5, spacing=(pitch,) * 3, gradient_direction="ascent"
    )
    vv += vox.transform[:3, 3] - 3 * pitch
    # 只平滑辅助内部表面，不移动可见源皮肤。
    result = trimesh.Trimesh(vv, ff, process=False)
    trimesh.smoothing.filter_laplacian(result, iterations=2, volume_constraint=False)
    result = result.simplify_quadric_decimation(face_count=4000)
    vv = result.vertices
    ff = result.faces
    _, nearest = cKDTree(v).query(vv)
    report = {
        "kind": path.stem,
        "faces": len(ff),
        "vertices": len(vv),
        "source_volume": mesh.volume,
        "proxy_volume": result.volume,
        "closed": result.is_watertight,
        "surface": int(surface.sum()),
        "solid": int(solid.sum()),
        "seconds": time.time() - t,
    }
    reports.append(report)
    print(report, flush=True)

    def packed(a, dtype):
        return base64.b64encode(np.array(a, dtype=dtype).tobytes()).decode()

    low = vv.min(axis=0)
    span = np.maximum(vv.max(axis=0) - low, 1e-9)
    assert len(vv) < 65536 and len(v) < 65536
    out[d["key"]] = {
        "position": packed(np.rint((vv - low) / span * 65535), "<u2"),
        "index": packed(ff, "<u2"),
        "nearest": packed(nearest, "<u2"),
        "low": low.tolist(),
        "span": span.tolist(),
    }
json.dump(out, open(root / "hulls.json", "w"))
json.dump(reports, open(root / "hulls_report.json", "w"), indent=2)
