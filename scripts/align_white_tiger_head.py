"""Correct the original White Tiger skull axis without moving its torso or paws.

Run with numpy/scipy and the project Node dependencies installed:
  python scripts/align_white_tiger_head.py ORIGINAL_MESH OUTPUT_MESH
The input must be the pre-alignment mesh; regenerate its interior core afterward.
"""

import argparse
import base64
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import factorized
from scipy.spatial.transform import Rotation


def align(data):
    if data.get("headAlignment"):
        raise ValueError("Input is already aligned; use the original asset")
    raw = np.frombuffer(base64.b64decode(data["position"]), dtype="<u2").reshape(-1, 3)
    unique, inverse = np.unique(raw, axis=0, return_inverse=True)
    points = unique / 65535 * (np.array(data["max"]) - data["min"]) + data["min"]
    faces = np.frombuffer(base64.b64decode(data["index"]), dtype="<u2").reshape(-1, 3)
    faces = inverse[faces]

    # 从原始头骨双侧表面拟合出的中线；只校正模型固有偏斜，不改战斗朝向。
    yaw, roll, offset = -0.4679605178, -0.0313414249, 0.20850588683704463
    normal = np.array([np.cos(yaw) * np.cos(roll), np.sin(roll), np.sin(yaw) * np.cos(roll)])
    axis = np.cross(normal, [1, 0, 0])
    rotation = Rotation.from_rotvec(axis / np.linalg.norm(axis) * np.arccos(normal[0])).as_matrix()
    target = points @ rotation.T
    target[:, 0] += 0.014 - offset
    target[:, 1] += 0.16 - (rotation @ [0.005, 0.16, -0.32])[1]
    target[:, 2] += -0.5 - target[(points[:, 2] < -0.35) & (points[:, 1] > 0.07), 2].min()

    # 头骨保持刚性，躯干与下肢固定；颈部使用局部刚性求解，避免拉出肩部尖角。
    head = ((points[:, 2] < -0.35) & (points[:, 1] > 0.07)) | (
        (points[:, 2] < -0.30) & (points[:, 1] > 0.19)
    )
    fixed = (points[:, 2] > -0.16) | (points[:, 1] < 0.03) | head
    edges = np.unique(np.sort(np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]), axis=1), axis=0)
    edges = edges[edges[:, 0] != edges[:, 1]]
    i, j = edges.T
    delta = points[i] - points[j]
    weights = 1 / np.maximum(np.linalg.norm(delta, axis=1), 0.002)
    laplacian = coo_matrix(
        (np.r_[weights, weights, -weights, -weights], (np.r_[i, j, i, j], np.r_[i, j, j, i])),
        shape=(len(points), len(points)),
    ).tocsc()
    free, anchors = np.where(~fixed)[0], np.where(fixed)[0]
    solve = factorized(laplacian[free][:, free])
    result = points.copy()
    result[head] = target[head]
    boundary = laplacian[free][:, anchors] @ result[anchors]
    for _ in range(16):
        covariance = np.zeros((len(points), 3, 3))
        outer = weights[:, None, None] * (result[i] - result[j])[:, :, None] * delta[:, None, :]
        np.add.at(covariance, i, outer)
        np.add.at(covariance, j, outer)
        u, _, vt = np.linalg.svd(covariance)
        u[:, :, -1] *= np.linalg.det(u @ vt)[:, None]
        rotations = u @ vt
        rhs = np.zeros_like(points)
        contribution = weights[:, None] * np.einsum("nij,nj->ni", (rotations[i] + rotations[j]) * 0.5, delta)
        np.add.at(rhs, i, contribution)
        np.add.at(rhs, j, -contribution)
        for dim in range(3):
            result[free, dim] = solve(rhs[free, dim] - boundary[:, dim])

    ratios = np.linalg.norm(result[i] - result[j], axis=1) / np.maximum(np.linalg.norm(delta, axis=1), 1e-9)
    if not np.isfinite(result).all() or ratios.min() < 0.50 or ratios.max() > 1.75:
        raise ValueError("Unexpected neck distortion; inspect source topology")
    normals = np.zeros_like(points)
    face_normals = np.cross(result[faces[:, 1]] - result[faces[:, 0]], result[faces[:, 2]] - result[faces[:, 0]])
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    normals /= np.maximum(np.linalg.norm(normals, axis=1)[:, None], 1e-12)
    low, high = result.min(0), result.max(0)

    def pack(array, dtype):
        return base64.b64encode(np.asarray(array, dtype=dtype).tobytes()).decode()

    data["position"] = pack(np.rint((result[inverse] - low) / (high - low) * 65535), "<u2")
    data["normal"] = pack(np.rint(normals[inverse] * 32767), "<i2")
    data["min"], data["max"] = low.tolist(), high.tolist()
    data["headAlignment"] = {
        "revision": "white_tiger_skull_axis_20261101",
        "planeYaw": yaw, "planeRoll": roll, "planeOffset": offset, "planeX": 0.014,
        "method": "Constrained as-rigid-as-possible neck deformation; fixed skull, torso and lower limbs",
        "head": [[0.014, 0.16, -0.32], [0.014, 0.15, -0.48]],
        "jaw": [0.014, 0.105, -0.43], "mouth": [0.014, 0.115, -0.49],
        "freeVertices": len(free), "edgeRatioRange": [float(ratios.min()), float(ratios.max())],
    }
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    aligned = align(json.loads(args.input.read_text()))
    args.output.write_text(json.dumps(aligned, separators=(",", ":")) + "\n")
    # 退化面可能留下零法线，复用项目的接缝/邻面修复，保留其余资产字段。
    subprocess.run(
        ["node", str(Path(__file__).with_name("repair_packed_normals.mjs")), str(args.output)],
        check=True,
    )
    print(json.dumps(aligned["headAlignment"], indent=2))
