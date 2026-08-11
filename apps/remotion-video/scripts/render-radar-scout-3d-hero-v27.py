import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v27
# V26 established the preferred direct rounded terminal loft, but phone-scale
# review still shows a regularly repeating seven-peak rhythm. V27 freezes V23
# root continuity, V26 terminal loft geometry profile, widths, materials, and all
# lateral centerline coordinates. The only controlled variable is a small late-
# section Z cadence applied smoothly after t=0.68 so the seven peak heights group
# asymmetrically instead of reading as a uniform comb.

HERE = os.path.dirname(os.path.abspath(__file__))
V26_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v26.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v26', V26_PATH)
v26 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v26)
v23 = v26.v23

CROWN_COUNT = v26.CROWN_COUNT
ROOT_OVERLAP_GAIN = v26.ROOT_OVERLAP_GAIN
ROOT_TAPER_ZONE_END_T = v26.ROOT_TAPER_ZONE_END_T
VOXEL_SIZE = v26.VOXEL_SIZE
TERMINAL_LOFT_START_T = v26.TERMINAL_LOFT_START_T
TERMINAL_LOFT_PROFILE = v26.TERMINAL_LOFT_PROFILE
TERMINAL_DEPTH_RATIO = v26.TERMINAL_DEPTH_RATIO
TERMINAL_RELIEF_FADE_POWER = v26.TERMINAL_RELIEF_FADE_POWER
PEAK_CADENCE_START_T = 0.68
PEAK_HEIGHT_OFFSETS = (0.02, 0.10, -0.03, 0.14, -0.05, 0.06, -0.08)


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def smoothstep01(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3.0 - 2.0 * x)


def cadence_weight(t):
    if t <= PEAK_CADENCE_START_T:
        return 0.0
    return smoothstep01((t - PEAK_CADENCE_START_T) / (1.0 - PEAK_CADENCE_START_T))


def shifted_centers(points, widths, ci):
    centers, sampled_widths = v23.v18.v10.sample_centerline(points, widths, subdivisions=4)
    dz = PEAK_HEIGHT_OFFSETS[ci - 1]
    shifted = []
    for i, center in enumerate(centers):
        t = i / max(1, len(centers) - 1)
        shifted.append(center + Vector((0.0, 0.0, dz * cadence_weight(t))))
    return shifted, sampled_widths


def cumulative_lengths(centers, start_idx):
    out = [0.0] * len(centers)
    acc = 0.0
    for i in range(start_idx + 1, len(centers)):
        acc += (centers[i] - centers[i - 1]).length
        out[i] = acc
    return out, max(acc, 1e-9)


def add_cadenced_terminal_clump(name, points, widths, material, *, ci):
    centers, sampled_widths = shifted_centers(points, widths, ci)
    if len(centers) < 4:
        raise RuntimeError('V27 terminal loft requires at least four sampled centerline points')

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

    for ci_center in ring_center_indices:
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

    obj['sourceAuthoringMethod'] = 'V26_DIRECT_TERMINAL_WITH_LATE_Z_PEAK_CADENCE'
    obj['v23RootContinuityProfileFrozen'] = True
    obj['v26TerminalProfileFrozen'] = True
    obj['v10LateralCenterlineCoordinatesFrozen'] = True
    obj['peakCadenceStartT'] = PEAK_CADENCE_START_T
    obj['peakHeightOffset'] = PEAK_HEIGHT_OFFSETS[ci - 1]
    obj['separateTipCapObject'] = False
    obj['separateVisibleFiberTubes'] = False
    return obj


def build_cadenced_union(scene):
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
        obj = add_cadenced_terminal_clump(f'HairMassPrimaryV27_{ci:02d}', points, widths, material, ci=ci)
        v23.v18.apply_all_modifiers(obj)
        crown.append(obj)

    bridge = v23.v18.add_buried_root_bridge(pearl)
    union = v23.v18.join_objects(crown + [bridge], crown[0])
    union.name = 'HairCrownAsymmetricPeakCadenceUnionV27'
    union.data.name = 'HairCrownAsymmetricPeakCadenceUnionV27Mesh'
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
        raise RuntimeError(f'expected one connected crown after V27 remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V23_ROOT_PLUS_V26_TERMINAL_PLUS_ASYMMETRIC_PEAK_HEIGHT_CADENCE'
    union['v23RootContinuityProfileFrozen'] = True
    union['v26TerminalProfileFrozen'] = True
    union['v10LateralCenterlineCoordinatesFrozen'] = True
    union['peakCadenceStartT'] = PEAK_CADENCE_START_T
    union['peakHeightOffsets'] = tuple(PEAK_HEIGHT_OFFSETS)
    union['lateralPeakOffsetsUsed'] = False
    union['v18BuriedBridgeFrozen'] = True
    union['v18VoxelMethodFrozen'] = True
    union['connectedComponentsAfterRemesh'] = components
    union['crownObjectsAfterUnion'] = 1
    union['scalpCapShellUsed'] = False
    union['detachedTipSpikesUsed'] = False
    union['separateVisibleFiberTubes'] = False

    scene['heroVersion'] = 'v27'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['preferredTerminalInput'] = 'v26'
    scene['controlledVariable'] = 'HAIR_CROWN_PEAK_HEIGHT_CADENCE_AND_ASYMMETRIC_GROUPING'
    scene['hairSurfaceAuthoringMethod'] = 'V23_ROOT_PLUS_V26_TERMINAL_PLUS_ASYMMETRIC_PEAK_HEIGHT_CADENCE'
    scene['v23RootContinuityProfileFrozen'] = True
    scene['v26TerminalProfileFrozen'] = True
    scene['v10LateralCenterlineCoordinatesFrozen'] = True
    scene['peakCadenceStartT'] = PEAK_CADENCE_START_T
    scene['peakHeightOffsets'] = tuple(PEAK_HEIGHT_OFFSETS)
    scene['lateralPeakOffsetsUsed'] = False
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
    union, components = build_cadenced_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v27',
        'assetName': 'Radar Scout 3D Static Hero v27',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'preferredTerminalInput': 'v26',
        'controlledVariable': 'HAIR_CROWN_PEAK_HEIGHT_CADENCE_AND_ASYMMETRIC_GROUPING',
        'hairSurfaceAuthoringMethod': 'V23_ROOT_PLUS_V26_TERMINAL_PLUS_ASYMMETRIC_PEAK_HEIGHT_CADENCE',
        'v23RootContinuityProfileFrozen': True,
        'v26TerminalProfileFrozen': True,
        'v10LateralCenterlineCoordinatesFrozen': True,
        'peakCadenceStartT': PEAK_CADENCE_START_T,
        'peakHeightOffsets': list(PEAK_HEIGHT_OFFSETS),
        'lateralPeakOffsetsUsed': False,
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
