import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v26
# V24 showed that visible terminal-surface edits have real phone-scale leverage,
# but linear shrink taper creates comb teeth. V25 showed that a separate rounded
# overlay cap is visually swallowed by the original terminal surface. V26 removes
# both failure modes: it starts from V23 and directly replaces the visible final
# 20% of each crown lock with an integral rounded terminal loft. The loft follows
# the original V10 sampled centerline and ends at the exact V10 endpoint pole;
# no separate cap object exists.

HERE = os.path.dirname(os.path.abspath(__file__))
V23_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v23.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v23', V23_PATH)
v23 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v23)

CROWN_COUNT = v23.CROWN_COUNT
ROOT_OVERLAP_GAIN = v23.ROOT_OVERLAP_GAIN
ROOT_TAPER_ZONE_END_T = v23.ROOT_TAPER_ZONE_END_T
VOXEL_SIZE = v23.VOXEL_SIZE
TERMINAL_LOFT_START_T = 0.80
TERMINAL_LOFT_PROFILE = 'HEMI_ELLIPSE_ARC_LENGTH'
TERMINAL_DEPTH_RATIO = 0.50
TERMINAL_RELIEF_FADE_POWER = 1.7


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def cumulative_lengths(centers, start_idx):
    out = [0.0] * len(centers)
    acc = 0.0
    for i in range(start_idx + 1, len(centers)):
        acc += (centers[i] - centers[i - 1]).length
        out[i] = acc
    return out, max(acc, 1e-9)


def add_direct_terminal_loft_clump(name, points, widths, material, *, ci):
    centers, sampled_widths = v23.v18.v10.sample_centerline(points, widths, subdivisions=4)
    if len(centers) < 4:
        raise RuntimeError('V26 terminal loft requires at least four sampled centerline points')

    radial_segments = 16
    relief_lobes = 6 if ci % 2 else 5
    relief_amount = 0.050
    phase = (ci % 4) * 0.27
    root_mass = 1.18
    depth_bias = -0.004 if ci % 2 else 0.0

    terminal_start_idx = min(
        range(len(centers) - 1),
        key=lambda i: abs((i / max(1, len(centers) - 1)) - TERMINAL_LOFT_START_T),
    )
    terminal_start_idx = min(terminal_start_idx, len(centers) - 2)
    terminal_t = terminal_start_idx / max(1, len(centers) - 1)

    base_source_width = float(sampled_widths[terminal_start_idx])
    base_visible_scale = v23.localized_width_scale(terminal_t)
    base_root_gain = 1.0 + (root_mass - 1.0) * ((1.0 - terminal_t) ** 2.2)
    base_half_width = max(0.016, base_source_width * base_visible_scale * base_root_gain)
    base_half_depth = max(0.012, base_source_width * base_visible_scale * TERMINAL_DEPTH_RATIO * base_root_gain)

    arc_lengths, terminal_arc_total = cumulative_lengths(centers, terminal_start_idx)
    verts = []
    faces = []
    ring_center_indices = list(range(0, len(centers) - 1))

    for ring_index, ci_center in enumerate(ring_center_indices):
        center = centers[ci_center]
        t = ci_center / max(1, len(centers) - 1)
        _, lateral, depth = v23.v18.v10.frame_axes(centers, ci_center, (0.0, -1.0, 0.0))

        if ci_center <= terminal_start_idx:
            source_width = float(sampled_widths[ci_center])
            visible_scale = v23.localized_width_scale(t)
            root_gain = 1.0 + (root_mass - 1.0) * ((1.0 - t) ** 2.2)
            half_width = max(0.016, source_width * visible_scale * root_gain)
            half_depth = max(0.012, source_width * visible_scale * 0.50 * root_gain)
            relief_strength = relief_amount * (0.20 + 0.80 * (t ** 0.72))
        else:
            s = min(0.999, max(0.0, arc_lengths[ci_center] / terminal_arc_total))
            rounded_scale = math.sqrt(max(0.0, 1.0 - s * s))
            half_width = max(0.010, base_half_width * rounded_scale)
            half_depth = max(0.009, base_half_depth * rounded_scale)
            shoulder_relief = relief_amount * (0.20 + 0.80 * (terminal_t ** 0.72))
            relief_strength = shoulder_relief * ((1.0 - s) ** TERMINAL_RELIEF_FADE_POWER)

        for si in range(radial_segments):
            theta = 2.0 * math.pi * si / radial_segments
            flute = 1.0 + relief_strength * math.cos(relief_lobes * theta + phase)
            side = math.cos(theta) * half_width * flute
            deep = math.sin(theta) * half_depth * flute
            co = center + lateral * side + depth * deep + Vector((0.0, depth_bias, 0.0))
            verts.append(tuple(co))

    rings = len(ring_center_indices)
    for ri in range(rings - 1):
        a0 = ri * radial_segments
        b0 = (ri + 1) * radial_segments
        for si in range(radial_segments):
            sj = (si + 1) % radial_segments
            faces.append((a0 + si, a0 + sj, b0 + sj, b0 + si))

    # Root closure stays identical in spirit to V23; the terminal end is a true
    # integral pole at the exact V10 endpoint instead of a capped terminal ring.
    faces.append(tuple(reversed(tuple(range(radial_segments)))))
    endpoint = centers[-1] + Vector((0.0, depth_bias, 0.0))
    pole_index = len(verts)
    verts.append(tuple(endpoint))
    last_ring = (rings - 1) * radial_segments
    for si in range(radial_segments):
        sj = (si + 1) % radial_segments
        faces.append((last_ring + si, last_ring + sj, pole_index))

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

    obj['sourceAuthoringMethod'] = 'V23_ROOT_PROFILE_WITH_DIRECT_HEMI_ELLIPSE_TERMINAL_LOFT'
    obj['v10CenterlineFrozen'] = True
    obj['v10TipEndpointCenterFrozen'] = True
    obj['v23RootContinuityProfileFrozen'] = True
    obj['terminalLoftStartT'] = TERMINAL_LOFT_START_T
    obj['terminalLoftProfile'] = TERMINAL_LOFT_PROFILE
    obj['terminalDepthRatio'] = TERMINAL_DEPTH_RATIO
    obj['terminalReliefFadePower'] = TERMINAL_RELIEF_FADE_POWER
    obj['separateTipCapObject'] = False
    obj['separateVisibleFiberTubes'] = False
    return obj


def build_direct_terminal_union(scene):
    v23.v18.v10.geometry_v10(scene)
    for ci in range(1, CROWN_COUNT + 1):
        obj = bpy.data.objects.get(f'HairMassPrimaryV10_{ci:02d}')
        if obj is None:
            raise RuntimeError(f'missing V10 crown object {ci}')
        bpy.data.objects.remove(obj, do_unlink=True)

    pearl = bpy.data.materials['ScoutHairMassPearlV10']
    cyan = bpy.data.materials['ScoutHairMassCyanV10']
    crown = []
    for ci, (points, widths) in enumerate(v23.v18.v10.v8.V6_PRIMARY[:CROWN_COUNT], 1):
        material = pearl if ci % 3 != 0 else cyan
        obj = add_direct_terminal_loft_clump(f'HairMassPrimaryV26_{ci:02d}', points, widths, material, ci=ci)
        v23.v18.apply_all_modifiers(obj)
        crown.append(obj)

    bridge = v23.v18.add_buried_root_bridge(pearl)
    union = v23.v18.join_objects(crown + [bridge], crown[0])
    union.name = 'HairCrownDirectRoundedTerminalUnionV26'
    union.data.name = 'HairCrownDirectRoundedTerminalUnionV26Mesh'
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
        raise RuntimeError(f'expected one connected crown after V26 remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V23_ROOT_PROFILE_PLUS_DIRECT_HEMI_ELLIPSE_TERMINAL_LOFT'
    union['v10CrownCenterlinesFrozen'] = CROWN_COUNT
    union['v10TipEndpointCentersFrozen'] = True
    union['v23RootContinuityProfileFrozen'] = True
    union['terminalLoftStartT'] = TERMINAL_LOFT_START_T
    union['terminalLoftProfile'] = TERMINAL_LOFT_PROFILE
    union['terminalDepthRatio'] = TERMINAL_DEPTH_RATIO
    union['terminalReliefFadePower'] = TERMINAL_RELIEF_FADE_POWER
    union['separateTipCapObjects'] = 0
    union['terminalShrinkTaperUsed'] = False
    union['v18BuriedBridgeFrozen'] = True
    union['v18VoxelMethodFrozen'] = True
    union['connectedComponentsAfterRemesh'] = components
    union['crownObjectsAfterUnion'] = 1
    union['scalpCapShellUsed'] = False
    union['detachedTipSpikesUsed'] = False
    union['separateVisibleFiberTubes'] = False

    scene['heroVersion'] = 'v26'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['controlledVariable'] = 'HAIR_CROWN_DIRECT_TERMINAL_LOFT_AND_ROUNDED_PEAK_PROFILE'
    scene['hairSurfaceAuthoringMethod'] = 'V23_ROOT_PROFILE_PLUS_DIRECT_HEMI_ELLIPSE_TERMINAL_LOFT'
    scene['v10CrownCenterlinesFrozen'] = CROWN_COUNT
    scene['v10TipEndpointCentersFrozen'] = True
    scene['v23RootContinuityProfileFrozen'] = True
    scene['rootOverlapGain'] = ROOT_OVERLAP_GAIN
    scene['rootTaperZoneEndT'] = ROOT_TAPER_ZONE_END_T
    scene['terminalLoftStartT'] = TERMINAL_LOFT_START_T
    scene['terminalLoftProfile'] = TERMINAL_LOFT_PROFILE
    scene['terminalDepthRatio'] = TERMINAL_DEPTH_RATIO
    scene['terminalReliefFadePower'] = TERMINAL_RELIEF_FADE_POWER
    scene['separateTipCapObjects'] = 0
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
    union, components = build_direct_terminal_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v26',
        'assetName': 'Radar Scout 3D Static Hero v26',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'controlledVariable': 'HAIR_CROWN_DIRECT_TERMINAL_LOFT_AND_ROUNDED_PEAK_PROFILE',
        'hairSurfaceAuthoringMethod': 'V23_ROOT_PROFILE_PLUS_DIRECT_HEMI_ELLIPSE_TERMINAL_LOFT',
        'v10CrownCenterlinesFrozen': CROWN_COUNT,
        'v10TipEndpointCentersFrozen': True,
        'v23RootContinuityProfileFrozen': True,
        'rootOverlapGain': ROOT_OVERLAP_GAIN,
        'rootTaperZoneEndT': ROOT_TAPER_ZONE_END_T,
        'terminalLoftStartT': TERMINAL_LOFT_START_T,
        'terminalLoftProfile': TERMINAL_LOFT_PROFILE,
        'terminalDepthRatio': TERMINAL_DEPTH_RATIO,
        'terminalReliefFadePower': TERMINAL_RELIEF_FADE_POWER,
        'separateTipCapObjects': 0,
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
