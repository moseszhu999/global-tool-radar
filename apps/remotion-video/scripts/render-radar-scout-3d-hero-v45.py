import bpy
import hashlib
import importlib.util
import json
import math
import os
import struct
import sys

# Radar Scout 3D Hero v45
# V44 established a visible and causally clean four-apex shoulder-envelope
# mechanism, but direct crown-only review showed that it over-filled the three
# inter-peak valleys and drifted toward a cap/helmet reading. V45 retains the
# same local hemispherical shoulder principle while deriving three separator
# planes from the actual V41 final-mesh apex X positions. A narrow valley core
# is frozen exactly; an outer band smoothly attenuates the shoulder gain.
# X/Y, V41 low/root coordinates, four apex coordinates, valley-core coordinates,
# topology/material response, V41 lighting/camera and non-crown assets stay frozen.

HERE = os.path.dirname(os.path.abspath(__file__))
V41_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v41.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v41_for_v45', V41_PATH)
v41 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v41)

V29_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v29.py')
spec29 = importlib.util.spec_from_file_location('radar_scout_hero_v29_for_v45', V29_PATH)
v29 = importlib.util.module_from_spec(spec29)
spec29.loader.exec_module(v29)

v10 = v41.v10
v1 = v41.v1

CREST_START_Z = 3.72
SHOULDER_FULL_WEIGHT_Z = 3.92
CAP_RADIUS_X = (0.30, 0.34, 0.34, 0.30)
CAP_RADIUS_Y = (0.34, 0.38, 0.38, 0.34)
CAP_DEPTH_Z = (0.24, 0.26, 0.26, 0.24)
CAP_RADIAL_LIMIT = 0.92
SHOULDER_GAIN = 0.82
MAX_Z_RAISE = 0.11
VALLEY_CORE_HALF_WIDTH = 0.10
VALLEY_OUTER_HALF_WIDTH = 0.22
PROFILE = 'FOUR_LOCAL_HEMISPHERICAL_APEX_SHOULDERS_WITH_INTERPEAK_VALLEY_CORE_FREEZE_AND_GUARD_FADE'


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def vertex_sha(mesh):
    h = hashlib.sha256()
    for v in mesh.vertices:
        h.update(struct.pack('<fff', *v.co))
    return h.hexdigest()


def xy_sha(mesh):
    h = hashlib.sha256()
    for v in mesh.vertices:
        h.update(struct.pack('<Iff', v.index, float(v.co.x), float(v.co.y)))
    return h.hexdigest()


def indexed_coord_sha(mesh, indices):
    h = hashlib.sha256()
    for i in indices:
        v = mesh.vertices[i]
        h.update(struct.pack('<Ifff', i, *v.co))
    return h.hexdigest()


def topology_material_sha(mesh):
    h = hashlib.sha256()
    for p in mesh.polygons:
        h.update(struct.pack('<II', p.material_index, len(p.vertices)))
        for vi in p.vertices:
            h.update(struct.pack('<I', vi))
    return h.hexdigest()


def material_slot_names(obj):
    return [m.name if m else None for m in obj.data.materials]


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def apex_hints():
    return [tuple(group[0][-1]) for group in v29.MACRO_GROUPS]


def derive_actual_apexes(mesh):
    out = []
    for gi, hint in enumerate(apex_hints()):
        hx, hy, _ = hint
        rx = CAP_RADIUS_X[gi] * 0.72
        ry = CAP_RADIUS_Y[gi] * 0.72
        candidates = []
        for v in mesh.vertices:
            if v.co.z <= CREST_START_Z:
                continue
            nx = (v.co.x - hx) / max(rx, 1e-9)
            ny = (v.co.y - hy) / max(ry, 1e-9)
            if nx * nx + ny * ny <= 1.0:
                candidates.append(v)
        if not candidates:
            raise RuntimeError(f'V45 could not derive apex for group {gi + 1}')
        apex = max(candidates, key=lambda v: (float(v.co.z), -abs(float(v.co.x) - hx), -abs(float(v.co.y) - hy)))
        out.append((apex.index, apex.co.copy()))
    if len({i for i, _ in out}) != 4:
        raise RuntimeError('V45 apex derivation did not produce four distinct vertices')
    xs = [float(co.x) for _, co in out]
    if xs != sorted(xs):
        raise RuntimeError('V45 apex order is not left-to-right as expected')
    return out


def valley_separators(apexes):
    xs = [float(co.x) for _, co in apexes]
    return [(xs[i] + xs[i + 1]) * 0.5 for i in range(3)]


def valley_scale_for_x(x, separators):
    d = min(abs(float(x) - s) for s in separators)
    if d <= VALLEY_CORE_HALF_WIDTH:
        return 0.0
    if d >= VALLEY_OUTER_HALF_WIDTH:
        return 1.0
    return smoothstep((d - VALLEY_CORE_HALF_WIDTH) / (VALLEY_OUTER_HALF_WIDTH - VALLEY_CORE_HALF_WIDTH))


def apply_v45_valley_preserving_envelopes(union, scene):
    mesh = union.data
    before_vertex_count = len(mesh.vertices)
    before_polygon_count = len(mesh.polygons)
    before_vertex_sha = vertex_sha(mesh)
    before_xy_sha = xy_sha(mesh)
    before_topology_sha = topology_material_sha(mesh)
    before_materials = material_slot_names(union)

    original = {v.index: v.co.copy() for v in mesh.vertices}
    low_indices = [v.index for v in mesh.vertices if v.co.z <= CREST_START_Z]
    low_sha_before = indexed_coord_sha(mesh, low_indices)
    apexes = derive_actual_apexes(mesh)
    apex_indices = [i for i, _ in apexes]
    apex_sha_before = indexed_coord_sha(mesh, apex_indices)
    separators = valley_separators(apexes)
    valley_core_indices = [
        v.index for v in mesh.vertices
        if v.co.z > CREST_START_Z and min(abs(float(v.co.x) - s) for s in separators) <= VALLEY_CORE_HALF_WIDTH
    ]
    valley_core_sha_before = indexed_coord_sha(mesh, valley_core_indices)

    changed = []
    per_group_changed = [0, 0, 0, 0]
    per_group_max_raise = [0.0, 0.0, 0.0, 0.0]
    guard_attenuated = 0
    guard_frozen_candidates = 0

    for v in mesh.vertices:
        o = original[v.index]
        if o.z <= CREST_START_Z or v.index in apex_indices:
            continue

        vscale = valley_scale_for_x(o.x, separators)
        if vscale <= 0.0:
            guard_frozen_candidates += 1
            continue

        best = None
        for gi, (_, apex) in enumerate(apexes):
            dx = float(o.x - apex.x)
            dy = float(o.y - apex.y)
            nx = dx / CAP_RADIUS_X[gi]
            ny = dy / CAP_RADIUS_Y[gi]
            r2 = nx * nx + ny * ny
            if r2 > CAP_RADIAL_LIMIT * CAP_RADIAL_LIMIT:
                continue
            if best is None or r2 < best[0]:
                best = (r2, gi, apex)
        if best is None:
            continue

        r2, gi, apex = best
        radial = math.sqrt(max(0.0, r2))
        hemi = math.sqrt(max(0.0, 1.0 - min(1.0, r2)))
        target_z = float(apex.z) - CAP_DEPTH_Z[gi] * (1.0 - hemi)
        if target_z <= float(o.z):
            continue

        height_w = smoothstep((float(o.z) - CREST_START_Z) / max(1e-9, SHOULDER_FULL_WEIGHT_Z - CREST_START_Z))
        radial_w = smoothstep((CAP_RADIAL_LIMIT - radial) / max(1e-9, CAP_RADIAL_LIMIT - 0.18))
        gain = SHOULDER_GAIN * max(0.18, height_w) * max(0.28, radial_w) * vscale
        if vscale < 0.999:
            guard_attenuated += 1
        dz = min(MAX_Z_RAISE, (target_z - float(o.z)) * gain)
        if dz <= 1e-7:
            continue

        v.co.z = float(o.z) + dz
        changed.append((v.index, gi, dz, vscale))
        per_group_changed[gi] += 1
        per_group_max_raise[gi] = max(per_group_max_raise[gi], dz)

    mesh.update()

    after_vertex_count = len(mesh.vertices)
    after_polygon_count = len(mesh.polygons)
    after_vertex_sha = vertex_sha(mesh)
    after_xy_sha = xy_sha(mesh)
    after_topology_sha = topology_material_sha(mesh)
    after_materials = material_slot_names(union)
    low_sha_after = indexed_coord_sha(mesh, low_indices)
    apex_sha_after = indexed_coord_sha(mesh, apex_indices)
    valley_core_sha_after = indexed_coord_sha(mesh, valley_core_indices)

    if before_vertex_count != after_vertex_count:
        raise RuntimeError('V45 changed vertex count')
    if before_polygon_count != after_polygon_count:
        raise RuntimeError('V45 changed polygon count')
    if before_topology_sha != after_topology_sha:
        raise RuntimeError('V45 changed topology/material indices')
    if before_materials != after_materials:
        raise RuntimeError('V45 changed material slots')
    if before_xy_sha != after_xy_sha:
        raise RuntimeError('V45 changed X/Y coordinates')
    if low_sha_before != low_sha_after:
        raise RuntimeError('V45 changed low/root coordinates')
    if apex_sha_before != apex_sha_after:
        raise RuntimeError('V45 changed apex coordinates')
    if valley_core_sha_before != valley_core_sha_after:
        raise RuntimeError('V45 changed a valley-core coordinate')
    if before_vertex_sha == after_vertex_sha or not changed:
        raise RuntimeError('V45 valley-preserving envelope produced no coordinate change')

    for i, _, dz, _ in changed:
        if original[i].z <= CREST_START_Z or dz <= 0.0:
            raise RuntimeError('V45 changed a forbidden vertex')
        if abs(mesh.vertices[i].co.x - original[i].x) > 0.0 or abs(mesh.vertices[i].co.y - original[i].y) > 0.0:
            raise RuntimeError('V45 changed lateral coordinates')
        if min(abs(float(original[i].x) - s) for s in separators) <= VALLEY_CORE_HALF_WIDTH:
            raise RuntimeError('V45 changed a valley-core vertex')

    raises = [dz for _, _, dz, _ in changed]
    apex_records = [
        {'index': i, 'coord': [float(co.x), float(co.y), float(co.z)], 'sourceHint': list(apex_hints()[gi])}
        for gi, (i, co) in enumerate(apexes)
    ]

    scene['heroVersion'] = 'v45'
    scene['controlledVariable'] = 'HAIR_CROWN_FOUR_APEX_SHOULDER_ENVELOPE_WITH_INTERPEAK_VALLEY_EXCLUSION'
    scene['preferredDevelopmentInput'] = 'v41'
    scene['v44ShoulderEnvelopePrincipleRetained'] = True
    scene['interPeakValleyCoreFrozen'] = True
    scene['interPeakValleyGuardFade'] = True
    scene['allCrownXYCoordinatesFrozen'] = True
    scene['lowRootCoordinatesFrozen'] = True
    scene['fourApexCoordinatesFrozen'] = True
    scene['v34MaterialOwnershipFrozen'] = True
    scene['v36MaterialResponseFrozen'] = True
    scene['v41LightingFrozen'] = True
    scene['v6CameraFrozen'] = True
    scene['v6RendererFrozen'] = True
    scene['nonCrownAssetsFrozen'] = True
    scene['crestSurfaceProfile'] = PROFILE

    return {
        'beforeVertexCount': before_vertex_count,
        'afterVertexCount': after_vertex_count,
        'beforePolygonCount': before_polygon_count,
        'afterPolygonCount': after_polygon_count,
        'beforeVertexSha256': before_vertex_sha,
        'afterVertexSha256': after_vertex_sha,
        'xyShaBefore': before_xy_sha,
        'xyShaAfter': after_xy_sha,
        'lowZoneShaBefore': low_sha_before,
        'lowZoneShaAfter': low_sha_after,
        'apexShaBefore': apex_sha_before,
        'apexShaAfter': apex_sha_after,
        'valleyCoreShaBefore': valley_core_sha_before,
        'valleyCoreShaAfter': valley_core_sha_after,
        'topologyMaterialSha256': after_topology_sha,
        'materialSlots': after_materials,
        'lowZoneVertexCount': len(low_indices),
        'valleyCoreVertexCount': len(valley_core_indices),
        'valleySeparatorsX': separators,
        'apexes': apex_records,
        'changedVertexCount': len(changed),
        'perGroupChangedVertexCount': per_group_changed,
        'perGroupMaxZRaise': per_group_max_raise,
        'guardAttenuatedCandidateCount': guard_attenuated,
        'guardFrozenCandidateCount': guard_frozen_candidates,
        'maxZRaise': max(raises),
        'meanZRaise': sum(raises) / len(raises),
    }


def main():
    output_png, output_blend, output_receipt = parse_args()
    for p in (output_png, output_blend, output_receipt):
        os.makedirs(os.path.dirname(p), exist_ok=True)

    v1.clear_scene()
    scene = bpy.context.scene
    v1.build_scene(scene)
    v10.v8.v6.v5.v2.geometry_v2(scene)
    v10.v8.v6.v5.geometry_v5(scene)
    union, components, counts, baseline, kicker_before, kicker_after = v41.build_v41(scene)
    crest = apply_v45_valley_preserving_envelopes(union, scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v45',
        'assetName': 'Radar Scout 3D Static Hero v45',
        'preferredBaselineInput': 'v10',
        'preferredDevelopmentInput': 'v41',
        'controlledVariable': 'HAIR_CROWN_FOUR_APEX_SHOULDER_ENVELOPE_WITH_INTERPEAK_VALLEY_EXCLUSION',
        'crestSurfaceProfile': PROFILE,
        'crestStartZ': CREST_START_Z,
        'shoulderFullWeightZ': SHOULDER_FULL_WEIGHT_Z,
        'capRadiusX': list(CAP_RADIUS_X),
        'capRadiusY': list(CAP_RADIUS_Y),
        'capDepthZ': list(CAP_DEPTH_Z),
        'capRadialLimit': CAP_RADIAL_LIMIT,
        'shoulderGain': SHOULDER_GAIN,
        'maxZRaiseLimit': MAX_Z_RAISE,
        'valleyCoreHalfWidth': VALLEY_CORE_HALF_WIDTH,
        'valleyOuterHalfWidth': VALLEY_OUTER_HALF_WIDTH,
        'v44ShoulderEnvelopePrincipleRetained': True,
        'interPeakValleyCoreFrozen': True,
        'interPeakValleyGuardFade': True,
        'allCrownXYCoordinatesFrozen': True,
        'lowRootCoordinatesFrozen': True,
        'fourApexCoordinatesFrozen': True,
        'v34MaterialOwnershipFrozen': True,
        'v36MaterialResponseFrozen': True,
        'v41LightingFrozen': True,
        'v6CameraFrozen': True,
        'v6RendererFrozen': True,
        'nonCrownAssetsFrozen': True,
        'crownTopologyMaterialIndicesFrozen': True,
        'crestAudit': crest,
        'materialRegionPolygonCounts': counts,
        'connectedComponentsAfterRemesh': components,
        'crownObjectsAfterUnion': 1,
        'renderSucceeded': True,
        'fileName': os.path.basename(output_png),
        'fileFormat': 'PNG',
        'width': width,
        'height': height,
        'channels': channels,
        'alphaPresent': channels == 4,
        'fileSizeBytes': os.path.getsize(output_png),
        'sha256': sha256_file(output_png),
        'blendSource': output_blend,
        'blendSha256': sha256_file(output_blend),
        'blenderExecutable': bpy.app.binary_path,
        'blenderVersion': bpy.app.version_string,
        'renderMode': 'background_cli',
        'renderEngine': scene.render.engine,
        'cameraName': scene.camera.name if scene.camera else None,
        'heroPixelsAuthority': 'BLENDER_RENDER',
        'remotionRedrawAllowed': False,
        'canonicalCandidateModified': False,
        'staticHeroVisualGate': 'PENDING_CONTROLLER_REVIEW',
        'humanSelectedForCanonical': False,
        'riggingPerformed': False,
        'animationPerformed': False,
        'publicationAllowed': False,
        'publicationPerformed': False,
        'analyticsObserved': False,
    }
    with open(output_receipt, 'w', encoding='utf-8') as f:
        json.dump(receipt, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
