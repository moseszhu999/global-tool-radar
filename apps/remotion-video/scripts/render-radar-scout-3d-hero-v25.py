import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v25
# V24 proved that tip-surface editing is visually powerful, but shrinking the
# final 24% turned the crown into a more regular small-tooth / comb silhouette.
# V25 returns to the preferred V23 root-continuity surface and changes only the
# terminal peak representation. The final 16% of each original terminal core is
# recessed inside a local rounded spheroid whose forward apex is anchored to the
# original V10 centerline endpoint. The rounded cap and the crown lock are then
# fused by the same V18 voxel-union representation.

HERE = os.path.dirname(os.path.abspath(__file__))
V23_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v23.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v23', V23_PATH)
v23 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v23)

CROWN_COUNT = v23.CROWN_COUNT
ROOT_OVERLAP_GAIN = v23.ROOT_OVERLAP_GAIN
ROOT_TAPER_ZONE_END_T = v23.ROOT_TAPER_ZONE_END_T
VOXEL_SIZE = v23.VOXEL_SIZE
TIP_CORE_RECESS_START_T = 0.84
TIP_CORE_TERMINAL_SCALE = 0.44
TIP_CAP_TRANSVERSE_SCALE = 0.64
TIP_CAP_LONGITUDINAL_SCALE = 0.78
TIP_CAP_COUNT = CROWN_COUNT


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def smoothstep01(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3.0 - 2.0 * x)


def terminal_core_scale(t):
    if t <= TIP_CORE_RECESS_START_T:
        return 1.0
    u = (t - TIP_CORE_RECESS_START_T) / (1.0 - TIP_CORE_RECESS_START_T)
    return 1.0 - (1.0 - TIP_CORE_TERMINAL_SCALE) * smoothstep01(u)


def add_recessed_v23_clump(name, points, widths, material, *, ci):
    centers, sampled_widths = v23.v18.v10.sample_centerline(points, widths, subdivisions=4)
    verts = []
    faces = []
    radial_segments = 16
    relief_lobes = 6 if ci % 2 else 5
    relief_amount = 0.050
    phase = (ci % 4) * 0.27
    root_mass = 1.18
    depth_bias = -0.004 if ci % 2 else 0.0

    for ri, (center, source_width) in enumerate(zip(centers, sampled_widths)):
        t = ri / max(1, len(centers) - 1)
        _, lateral, depth = v23.v18.v10.frame_axes(centers, ri, (0.0, -1.0, 0.0))
        root_visible_scale = v23.localized_width_scale(t)
        width = source_width * root_visible_scale
        root_gain = 1.0 + (root_mass - 1.0) * ((1.0 - t) ** 2.2)
        core_scale = terminal_core_scale(t)
        half_width = max(0.010, width * root_gain * core_scale)
        half_depth = max(0.009, width * 0.50 * root_gain * core_scale)
        relief_strength = relief_amount * (0.20 + 0.80 * (t ** 0.72)) * (0.25 + 0.75 * core_scale)

        for si in range(radial_segments):
            theta = 2.0 * math.pi * si / radial_segments
            flute = 1.0 + relief_strength * math.cos(relief_lobes * theta + phase)
            side = math.cos(theta) * half_width * flute
            deep = math.sin(theta) * half_depth * flute
            co = center + lateral * side + depth * deep + Vector((0.0, depth_bias, 0.0))
            verts.append(tuple(co))

    rings = len(centers)
    for ri in range(rings - 1):
        a0 = ri * radial_segments
        b0 = (ri + 1) * radial_segments
        for si in range(radial_segments):
            sj = (si + 1) % radial_segments
            faces.append((a0 + si, a0 + sj, b0 + sj, b0 + si))
    faces.append(tuple(reversed(tuple(range(radial_segments)))))
    last = (rings - 1) * radial_segments
    faces.append(tuple(last + i for i in range(radial_segments)))

    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for poly in mesh.polygons:
        poly.use_smooth = True
    subdiv = obj.modifiers.new(name='MassFirstSubdivision', type='SUBSURF')
    subdiv.subdivision_type = 'CATMULL_CLARK'
    subdiv.levels = 2
    subdiv.render_levels = 2
    obj['sourceAuthoringMethod'] = 'V23_ROOT_PROFILE_WITH_RECESSED_TERMINAL_CORE_FOR_ROUNDED_CAP'
    obj['v10CenterlineFrozen'] = True
    obj['v23RootContinuityProfileFrozen'] = True
    obj['tipCoreRecessStartT'] = TIP_CORE_RECESS_START_T
    obj['tipCoreTerminalScale'] = TIP_CORE_TERMINAL_SCALE
    obj['separateVisibleFiberTubes'] = False
    return obj


def add_rounded_tip_cap(name, points, widths, material, *, ci):
    centers, sampled_widths = v23.v18.v10.sample_centerline(points, widths, subdivisions=4)
    if len(centers) < 2:
        raise RuntimeError('tip cap requires at least two sampled centerline points')
    endpoint = centers[-1].copy()
    tangent = (centers[-1] - centers[-2]).normalized()
    tip_width = max(0.05, float(sampled_widths[-1]))
    transverse_radius = tip_width * TIP_CAP_TRANSVERSE_SCALE
    longitudinal_radius = tip_width * TIP_CAP_LONGITUDINAL_SCALE
    center = endpoint - tangent * longitudinal_radius

    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1.0, location=center)
    cap = bpy.context.active_object
    cap.name = name
    cap.data.name = name + 'Mesh'
    cap.rotation_mode = 'QUATERNION'
    cap.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(tangent)
    cap.scale = (transverse_radius, transverse_radius, longitudinal_radius)
    cap.data.materials.append(material)
    for poly in cap.data.polygons:
        poly.use_smooth = True
    v23.v18.apply_all_modifiers(cap)
    bpy.context.view_layer.objects.active = cap
    cap.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    cap['sourceAuthoringMethod'] = 'LOCAL_INWARD_ROUNDED_TIP_CAP'
    cap['v10TipEndpointCenter'] = tuple(endpoint)
    cap['tipCapApexAnchoredToV10Endpoint'] = True
    cap['tipCapTransverseScale'] = TIP_CAP_TRANSVERSE_SCALE
    cap['tipCapLongitudinalScale'] = TIP_CAP_LONGITUDINAL_SCALE
    cap['detachedTipSpike'] = False
    return cap


def build_rounded_tip_union(scene):
    v23.v18.v10.geometry_v10(scene)
    for ci in range(1, CROWN_COUNT + 1):
        obj = bpy.data.objects.get(f'HairMassPrimaryV10_{ci:02d}')
        if obj is None:
            raise RuntimeError(f'missing V10 crown object {ci}')
        bpy.data.objects.remove(obj, do_unlink=True)

    pearl = bpy.data.materials['ScoutHairMassPearlV10']
    cyan = bpy.data.materials['ScoutHairMassCyanV10']
    crown = []
    caps = []
    for ci, (points, widths) in enumerate(v23.v18.v10.v8.V6_PRIMARY[:CROWN_COUNT], 1):
        material = pearl if ci % 3 != 0 else cyan
        clump = add_recessed_v23_clump(f'HairMassPrimaryV25_{ci:02d}', points, widths, material, ci=ci)
        v23.v18.apply_all_modifiers(clump)
        crown.append(clump)
        cap = add_rounded_tip_cap(f'HairRoundedTipCapV25_{ci:02d}', points, widths, material, ci=ci)
        caps.append(cap)

    bridge = v23.v18.add_buried_root_bridge(pearl)
    union = v23.v18.join_objects(crown + caps + [bridge], crown[0])
    union.name = 'HairCrownRoundedTipCapUnionV25'
    union.data.name = 'HairCrownRoundedTipCapUnionV25Mesh'
    union.data.remesh_mode = 'VOXEL'
    union.data.remesh_voxel_size = VOXEL_SIZE
    union.data.remesh_voxel_adaptivity = 0.0
    union.data.use_remesh_fix_poles = True
    union.data.use_remesh_preserve_volume = True
    union.data.use_remesh_preserve_attributes = True
    v23.v18.set_active(union)
    bpy.ops.object.voxel_remesh()
    for poly in union.data.polygons:
        poly.use_smooth = True

    components = v23.v18.connected_component_count(union.data)
    if components != 1:
        raise RuntimeError(f'expected one connected crown after V25 remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V23_ROOT_PROFILE_PLUS_LOCAL_ROUNDED_TIP_CAPS'
    union['v10CrownCenterlinesFrozen'] = CROWN_COUNT
    union['v10TipEndpointCentersFrozen'] = True
    union['v23RootContinuityProfileFrozen'] = True
    union['tipCoreRecessStartT'] = TIP_CORE_RECESS_START_T
    union['tipCoreTerminalScale'] = TIP_CORE_TERMINAL_SCALE
    union['roundedTipCaps'] = TIP_CAP_COUNT
    union['tipCapApexAnchoredToV10Endpoint'] = True
    union['tipCapTransverseScale'] = TIP_CAP_TRANSVERSE_SCALE
    union['tipCapLongitudinalScale'] = TIP_CAP_LONGITUDINAL_SCALE
    union['terminalShrinkTaperUsed'] = False
    union['v18BuriedBridgeFrozen'] = True
    union['v18VoxelMethodFrozen'] = True
    union['connectedComponentsAfterRemesh'] = components
    union['crownObjectsAfterUnion'] = 1
    union['scalpCapShellUsed'] = False
    union['detachedTipSpikesUsed'] = False
    union['separateVisibleFiberTubes'] = False

    scene['heroVersion'] = 'v25'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['controlledVariable'] = 'HAIR_CROWN_LOCAL_ROUNDED_TIP_CAP_AND_PEAK_SHOULDER_BLEND'
    scene['hairSurfaceAuthoringMethod'] = 'V23_ROOT_PROFILE_PLUS_LOCAL_ROUNDED_TIP_CAPS'
    scene['v10CrownCenterlinesFrozen'] = CROWN_COUNT
    scene['v10TipEndpointCentersFrozen'] = True
    scene['v23RootContinuityProfileFrozen'] = True
    scene['rootOverlapGain'] = ROOT_OVERLAP_GAIN
    scene['rootTaperZoneEndT'] = ROOT_TAPER_ZONE_END_T
    scene['tipCoreRecessStartT'] = TIP_CORE_RECESS_START_T
    scene['tipCoreTerminalScale'] = TIP_CORE_TERMINAL_SCALE
    scene['roundedTipCaps'] = TIP_CAP_COUNT
    scene['tipCapApexAnchoredToV10Endpoint'] = True
    scene['tipCapTransverseScale'] = TIP_CAP_TRANSVERSE_SCALE
    scene['tipCapLongitudinalScale'] = TIP_CAP_LONGITUDINAL_SCALE
    scene['terminalShrinkTaperUsed'] = False
    scene['v18BuriedBridgeFrozen'] = True
    scene['v18VoxelMethodFrozen'] = True
    scene['voxelSize'] = VOXEL_SIZE
    scene['connectedComponentsAfterRemesh'] = components
    scene['crownObjectsAfterUnion'] = 1
    scene['scalpCapShellUsed'] = False
    scene['detachedTipSpikesUsed'] = False
    scene['separateVisibleFiberTubes'] = False
    scene['frozenV10PrimaryClumps8Through14'] = 7
    scene['secondaryCenterlinesAndWidthsFrozen'] = True
    scene['sideFramingPrimaryFrozen'] = True
    scene['centralBangsFrozen'] = True
    for key in ('ContinuousHead', 'EyeSocketAlignment', 'Body', 'Ears', 'Tablet', 'EnergyTail', 'Lighting', 'Camera', 'Renderer'):
        scene['v6' + key + 'Frozen'] = True
    return union, components


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    output_png, output_blend, output_receipt = parse_args()
    for p in (output_png, output_blend, output_receipt):
        os.makedirs(os.path.dirname(p), exist_ok=True)

    v23.v18.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v23.v18.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v23.v18.v10.v8.v6.v5.v2.geometry_v2(scene)
    v23.v18.v10.v8.v6.v5.geometry_v5(scene)
    union, components = build_rounded_tip_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v25',
        'assetName': 'Radar Scout 3D Static Hero v25',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'controlledVariable': 'HAIR_CROWN_LOCAL_ROUNDED_TIP_CAP_AND_PEAK_SHOULDER_BLEND',
        'hairSurfaceAuthoringMethod': 'V23_ROOT_PROFILE_PLUS_LOCAL_ROUNDED_TIP_CAPS',
        'v10CrownCenterlinesFrozen': CROWN_COUNT,
        'v10TipEndpointCentersFrozen': True,
        'v23RootContinuityProfileFrozen': True,
        'rootOverlapGain': ROOT_OVERLAP_GAIN,
        'rootTaperZoneEndT': ROOT_TAPER_ZONE_END_T,
        'tipCoreRecessStartT': TIP_CORE_RECESS_START_T,
        'tipCoreTerminalScale': TIP_CORE_TERMINAL_SCALE,
        'roundedTipCaps': TIP_CAP_COUNT,
        'tipCapApexAnchoredToV10Endpoint': True,
        'tipCapTransverseScale': TIP_CAP_TRANSVERSE_SCALE,
        'tipCapLongitudinalScale': TIP_CAP_LONGITUDINAL_SCALE,
        'terminalShrinkTaperUsed': False,
        'v18BuriedBridgeFrozen': True,
        'v18VoxelMethodFrozen': True,
        'voxelSize': VOXEL_SIZE,
        'connectedComponentsAfterRemesh': components,
        'crownObjectsAfterUnion': 1,
        'scalpCapShellUsed': False,
        'detachedTipSpikesUsed': False,
        'separateVisibleFiberTubes': False,
        'frozenV10PrimaryClumps8Through14': 7,
        'secondaryCenterlinesAndWidthsFrozen': True,
        'sideFramingPrimaryFrozen': True,
        'centralBangsFrozen': True,
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
