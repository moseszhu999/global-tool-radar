import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v22
# V18-V21 established CONNECTED_VOLUMETRIC_UNION and falsified hidden connector
# tuning as a visible lever. V22 changes the first actually visible crown-surface
# variable while keeping V10 peak identity: exact centerlines and outer/tip
# widths are frozen; only each of the seven crown locks' root and first-mid
# widths are enlarged before the exact V18 buried bridge + voxel remesh.

HERE = os.path.dirname(os.path.abspath(__file__))
V18_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v18.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v18', V18_PATH)
v18 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v18)

CROWN_COUNT = 7
ROOT_WIDTH_SCALE = 1.22
FIRST_MID_WIDTH_SCALE = 1.10
VOXEL_SIZE = v18.VOXEL_SIZE


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def remove_original_v10_crown():
    removed = 0
    for ci in range(1, CROWN_COUNT + 1):
        obj = bpy.data.objects.get(f'HairMassPrimaryV10_{ci:02d}')
        if obj is None:
            raise RuntimeError(f'missing V10 crown object {ci}')
        bpy.data.objects.remove(obj, do_unlink=True)
        removed += 1
    return removed


def widened_profile(widths):
    if len(widths) != 4:
        raise RuntimeError('expected four-point V10 crown width profile')
    return [
        widths[0] * ROOT_WIDTH_SCALE,
        widths[1] * FIRST_MID_WIDTH_SCALE,
        widths[2],
        widths[3],
    ]


def rebuild_visible_crown():
    pearl = bpy.data.materials['ScoutHairMassPearlV10']
    cyan = bpy.data.materials['ScoutHairMassCyanV10']
    crown = []
    profiles = []

    for ci, (points, widths) in enumerate(v18.v10.v8.V6_PRIMARY[:CROWN_COUNT], 1):
        new_widths = widened_profile(widths)
        material = pearl if ci % 3 != 0 else cyan
        obj = v18.v10.add_mass_clump(
            f'HairMassPrimaryV22_{ci:02d}', points, new_widths, material,
            front=(0.0, -1.0, 0.0), depth_scale=0.50,
            radial_segments=16, relief_lobes=6 if ci % 2 else 5,
            relief_amount=0.050, phase=(ci % 4) * 0.27,
            root_mass=1.18, depth_bias=-0.004 if ci % 2 else 0.0,
        )
        obj['v10CenterlineFrozen'] = True
        obj['v10OuterMidWidthFrozen'] = True
        obj['v10TipWidthFrozen'] = True
        obj['rootWidthScale'] = ROOT_WIDTH_SCALE
        obj['firstMidWidthScale'] = FIRST_MID_WIDTH_SCALE
        obj['sourceAuthoringMethod'] = 'V10_MASS_CLUMP_WITH_ROOT_WIDTH_OVERLAP_PROFILE'
        v18.apply_all_modifiers(obj)
        crown.append(obj)
        profiles.append({
            'index': ci,
            'v10Widths': list(widths),
            'v22Widths': list(new_widths),
        })
    return crown, profiles


def build_root_overlap_union(scene):
    # Build exact V10 authority first so all non-controlled hero objects stay exact.
    v18.v10.geometry_v10(scene)
    removed = remove_original_v10_crown()
    crown, profiles = rebuild_visible_crown()

    # Freeze V18's proven connectivity bridge + voxel profile exactly. Only the
    # visible crown root/first-mid widths are the V22 controlled variable.
    pearl = bpy.data.materials['ScoutHairMassPearlV10']
    bridge = v18.add_buried_root_bridge(pearl)
    union = v18.join_objects(crown + [bridge], crown[0])
    union.name = 'HairCrownRootWidthOverlapUnionV22'
    union.data.name = 'HairCrownRootWidthOverlapUnionV22Mesh'
    union.data.remesh_mode = 'VOXEL'
    union.data.remesh_voxel_size = VOXEL_SIZE
    union.data.remesh_voxel_adaptivity = 0.0
    union.data.use_remesh_fix_poles = True
    union.data.use_remesh_preserve_volume = True
    union.data.use_remesh_preserve_attributes = True
    v18.set_active(union)
    bpy.ops.object.voxel_remesh()

    for poly in union.data.polygons:
        poly.use_smooth = True

    components = v18.connected_component_count(union.data)
    if components != 1:
        raise RuntimeError(f'expected one connected crown after V22 voxel remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V10_CROWN_ROOT_WIDTH_OVERLAP_WITH_V18_VOXEL_UNION'
    union['v10CrownCenterlinesFrozen'] = CROWN_COUNT
    union['v10OuterMidAndTipWidthsFrozen'] = True
    union['v10PeakTipPositionsFrozen'] = True
    union['rootWidthScale'] = ROOT_WIDTH_SCALE
    union['firstMidWidthScale'] = FIRST_MID_WIDTH_SCALE
    union['v18BuriedBridgeFrozen'] = True
    union['v18VoxelMethodFrozen'] = True
    union['connectedComponentsAfterRemesh'] = components
    union['crownObjectsAfterUnion'] = 1
    union['scalpCapShellUsed'] = False
    union['separateVisibleFiberTubes'] = False

    scene['heroVersion'] = 'v22'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['controlledVariable'] = 'HAIR_CROWN_ROOT_WIDTH_OVERLAP_AND_VALLEY_SIDEWALL_BLEND'
    scene['hairSurfaceAuthoringMethod'] = 'V10_CROWN_ROOT_WIDTH_OVERLAP_WITH_V18_VOXEL_UNION'
    scene['v10CrownCenterlinesFrozen'] = CROWN_COUNT
    scene['v10OuterMidAndTipWidthsFrozen'] = True
    scene['v10PeakTipPositionsFrozen'] = True
    scene['rootWidthScale'] = ROOT_WIDTH_SCALE
    scene['firstMidWidthScale'] = FIRST_MID_WIDTH_SCALE
    scene['originalV10CrownObjectsReplaced'] = removed
    scene['v18BuriedBridgeFrozen'] = True
    scene['v18VoxelMethodFrozen'] = True
    scene['voxelSize'] = VOXEL_SIZE
    scene['connectedComponentsAfterRemesh'] = components
    scene['crownObjectsAfterUnion'] = 1
    scene['scalpCapShellUsed'] = False
    scene['separateVisibleFiberTubes'] = False
    scene['frozenV10PrimaryClumps8Through14'] = 7
    scene['secondaryCenterlinesAndWidthsFrozen'] = True
    scene['sideFramingPrimaryFrozen'] = True
    scene['centralBangsFrozen'] = True
    scene['primaryHairObjects'] = 8
    scene['secondaryMassClumps'] = 6
    scene['totalHairObjects'] = 14
    for key in ('ContinuousHead', 'EyeSocketAlignment', 'Body', 'Ears', 'Tablet', 'EnergyTail', 'Lighting', 'Camera', 'Renderer'):
        scene['v6' + key + 'Frozen'] = True
    return union, components, profiles


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

    v18.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v18.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v18.v10.v8.v6.v5.v2.geometry_v2(scene)
    v18.v10.v8.v6.v5.geometry_v5(scene)
    union, components, profiles = build_root_overlap_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v22',
        'assetName': 'Radar Scout 3D Static Hero v22',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'controlledVariable': 'HAIR_CROWN_ROOT_WIDTH_OVERLAP_AND_VALLEY_SIDEWALL_BLEND',
        'hairSurfaceAuthoringMethod': 'V10_CROWN_ROOT_WIDTH_OVERLAP_WITH_V18_VOXEL_UNION',
        'v10CrownCenterlinesFrozen': CROWN_COUNT,
        'v10OuterMidAndTipWidthsFrozen': True,
        'v10PeakTipPositionsFrozen': True,
        'rootWidthScale': ROOT_WIDTH_SCALE,
        'firstMidWidthScale': FIRST_MID_WIDTH_SCALE,
        'widthProfiles': profiles,
        'v18BuriedBridgeFrozen': True,
        'v18VoxelMethodFrozen': True,
        'voxelSize': VOXEL_SIZE,
        'connectedComponentsAfterRemesh': components,
        'crownObjectsAfterUnion': 1,
        'scalpCapShellUsed': False,
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
