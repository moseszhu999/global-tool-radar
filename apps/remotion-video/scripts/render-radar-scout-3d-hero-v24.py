import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v24
# V23 established the preferred root-continuity profile: a +34% root-local
# width gain that decays exactly back to the V10 source width by t=0.30 while
# preserving the V18 connected volumetric-union representation. The remaining
# dominant phone-scale defect is the rigid wedge-like crown tip row.
#
# V24 therefore freezes V23 root behavior and every V10 crown centerline / peak
# position. Only the final 24% of each visible crown lock is reshaped: width and
# depth taper smoothly, embedded flute relief fades, and a small asymmetric
# cross-section bias breaks the mechanically identical wedge read. No detached
# spikes, scalp-cap shell, visible fiber tubes, rigging, animation, or canonical
# candidate changes are allowed.

HERE = os.path.dirname(os.path.abspath(__file__))
V23_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v23.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v23', V23_PATH)
v23 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v23)

CROWN_COUNT = v23.CROWN_COUNT
ROOT_OVERLAP_GAIN = v23.ROOT_OVERLAP_GAIN
ROOT_TAPER_ZONE_END_T = v23.ROOT_TAPER_ZONE_END_T
VOXEL_SIZE = v23.VOXEL_SIZE
TIP_PROFILE_START_T = 0.76
TIP_TERMINAL_WIDTH_SCALE = 0.56
TIP_TERMINAL_DEPTH_SCALE = 0.70
TIP_RELIEF_REDUCTION = 0.58
TIP_SECTION_ASYMMETRY = 0.10


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def smoothstep01(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3.0 - 2.0 * x)


def tip_strength(t):
    if t <= TIP_PROFILE_START_T:
        return 0.0
    return smoothstep01((t - TIP_PROFILE_START_T) / (1.0 - TIP_PROFILE_START_T))


def add_tip_softened_clump(name, points, widths, material, *, ci):
    centers, sampled_widths = v23.v18.v10.sample_centerline(points, widths, subdivisions=4)
    verts = []
    faces = []
    radial_segments = 16
    relief_lobes = 6 if ci % 2 else 5
    relief_amount = 0.050
    phase = (ci % 4) * 0.27
    root_mass = 1.18
    depth_bias = -0.004 if ci % 2 else 0.0
    asym_phase = 0.55 + ci * 0.63

    for ri, (center, source_width) in enumerate(zip(centers, sampled_widths)):
        t = ri / max(1, len(centers) - 1)
        _, lateral, depth = v23.v18.v10.frame_axes(centers, ri, (0.0, -1.0, 0.0))

        root_visible_scale = v23.localized_width_scale(t)
        root_gain = 1.0 + (root_mass - 1.0) * ((1.0 - t) ** 2.2)
        strength = tip_strength(t)
        width_scale = 1.0 - (1.0 - TIP_TERMINAL_WIDTH_SCALE) * strength
        depth_scale = 1.0 - (1.0 - TIP_TERMINAL_DEPTH_SCALE) * strength

        width = source_width * root_visible_scale
        half_width = max(0.014, width * root_gain * width_scale)
        half_depth = max(0.011, width * 0.50 * root_gain * depth_scale)

        base_relief = relief_amount * (0.20 + 0.80 * (t ** 0.72))
        relief_strength = base_relief * (1.0 - TIP_RELIEF_REDUCTION * strength)

        for si in range(radial_segments):
            theta = 2.0 * math.pi * si / radial_segments
            flute = 1.0 + relief_strength * math.cos(relief_lobes * theta + phase)
            asymmetric_section = 1.0 + TIP_SECTION_ASYMMETRY * strength * math.cos(theta + asym_phase)
            side = math.cos(theta) * half_width * flute * asymmetric_section
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

    obj['sourceAuthoringMethod'] = 'V23_ROOT_LOCAL_TAPER_WITH_TIP_PROFILE_SOFTENING'
    obj['v10CenterlineFrozen'] = True
    obj['v10PeakTipPositionFrozen'] = True
    obj['v23RootContinuityProfileFrozen'] = True
    obj['rootOverlapGain'] = ROOT_OVERLAP_GAIN
    obj['rootTaperZoneEndT'] = ROOT_TAPER_ZONE_END_T
    obj['tipProfileStartT'] = TIP_PROFILE_START_T
    obj['tipTerminalWidthScale'] = TIP_TERMINAL_WIDTH_SCALE
    obj['tipTerminalDepthScale'] = TIP_TERMINAL_DEPTH_SCALE
    obj['tipReliefReduction'] = TIP_RELIEF_REDUCTION
    obj['tipSectionAsymmetry'] = TIP_SECTION_ASYMMETRY
    obj['embeddedFiberRelief'] = True
    obj['separateVisibleFiberTubes'] = False
    return obj


def build_tip_softened_union(scene):
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
        obj = add_tip_softened_clump(f'HairMassPrimaryV24_{ci:02d}', points, widths, material, ci=ci)
        v23.v18.apply_all_modifiers(obj)
        crown.append(obj)

    bridge = v23.v18.add_buried_root_bridge(pearl)
    union = v23.v18.join_objects(crown + [bridge], crown[0])
    union.name = 'HairCrownTipSoftenedUnionV24'
    union.data.name = 'HairCrownTipSoftenedUnionV24Mesh'
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
        raise RuntimeError(f'expected one connected crown after V24 remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V23_ROOT_PROFILE_PLUS_CONNECTED_UNION_TIP_SOFTENING'
    union['v10CrownCenterlinesFrozen'] = CROWN_COUNT
    union['v10PeakTipPositionsFrozen'] = True
    union['v23RootContinuityProfileFrozen'] = True
    union['rootOverlapGain'] = ROOT_OVERLAP_GAIN
    union['rootTaperZoneEndT'] = ROOT_TAPER_ZONE_END_T
    union['tipProfileStartT'] = TIP_PROFILE_START_T
    union['tipTerminalWidthScale'] = TIP_TERMINAL_WIDTH_SCALE
    union['tipTerminalDepthScale'] = TIP_TERMINAL_DEPTH_SCALE
    union['tipReliefReduction'] = TIP_RELIEF_REDUCTION
    union['tipSectionAsymmetry'] = TIP_SECTION_ASYMMETRY
    union['v18BuriedBridgeFrozen'] = True
    union['v18VoxelMethodFrozen'] = True
    union['connectedComponentsAfterRemesh'] = components
    union['crownObjectsAfterUnion'] = 1
    union['scalpCapShellUsed'] = False
    union['detachedTipSpikesUsed'] = False
    union['separateVisibleFiberTubes'] = False

    scene['heroVersion'] = 'v24'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['controlledVariable'] = 'HAIR_CROWN_CONNECTED_UNION_TIP_PROFILE_AND_PEAK_SOFTENING'
    scene['hairSurfaceAuthoringMethod'] = 'V23_ROOT_PROFILE_PLUS_CONNECTED_UNION_TIP_SOFTENING'
    scene['v10CrownCenterlinesFrozen'] = CROWN_COUNT
    scene['v10PeakTipPositionsFrozen'] = True
    scene['v23RootContinuityProfileFrozen'] = True
    scene['rootOverlapGain'] = ROOT_OVERLAP_GAIN
    scene['rootTaperZoneEndT'] = ROOT_TAPER_ZONE_END_T
    scene['tipProfileStartT'] = TIP_PROFILE_START_T
    scene['tipTerminalWidthScale'] = TIP_TERMINAL_WIDTH_SCALE
    scene['tipTerminalDepthScale'] = TIP_TERMINAL_DEPTH_SCALE
    scene['tipReliefReduction'] = TIP_RELIEF_REDUCTION
    scene['tipSectionAsymmetry'] = TIP_SECTION_ASYMMETRY
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
    union, components = build_tip_softened_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v24',
        'assetName': 'Radar Scout 3D Static Hero v24',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'controlledVariable': 'HAIR_CROWN_CONNECTED_UNION_TIP_PROFILE_AND_PEAK_SOFTENING',
        'hairSurfaceAuthoringMethod': 'V23_ROOT_PROFILE_PLUS_CONNECTED_UNION_TIP_SOFTENING',
        'v10CrownCenterlinesFrozen': CROWN_COUNT,
        'v10PeakTipPositionsFrozen': True,
        'v23RootContinuityProfileFrozen': True,
        'rootOverlapGain': ROOT_OVERLAP_GAIN,
        'rootTaperZoneEndT': ROOT_TAPER_ZONE_END_T,
        'tipProfileStartT': TIP_PROFILE_START_T,
        'tipTerminalWidthScale': TIP_TERMINAL_WIDTH_SCALE,
        'tipTerminalDepthScale': TIP_TERMINAL_DEPTH_SCALE,
        'tipReliefReduction': TIP_RELIEF_REDUCTION,
        'tipSectionAsymmetry': TIP_SECTION_ASYMMETRY,
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
