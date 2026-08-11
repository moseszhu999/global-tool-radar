import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v29
# V28 proved that lateral grouping has real leverage, but the seven inherited
# V6/V10 crown endpoints remain an architectural ceiling. V29 stops perturbing
# those seven endpoints. It authors four first-class macro crown masses directly,
# while preserving the validated lower-level surface principles:
#   - V18 connected volumetric union + buried root bridge
#   - V23 root-local continuity profile
#   - V26 integral hemi-ellipse rounded terminal shoulder
# All non-crown geometry/material/camera/light/renderer boundaries stay frozen.

HERE = os.path.dirname(os.path.abspath(__file__))
V26_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v26.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v26', V26_PATH)
v26 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v26)
v23 = v26.v23
v18 = v23.v18
v10 = v18.v10

VOXEL_SIZE = v26.VOXEL_SIZE
MACRO_GROUP_COUNT = 4
MACRO_GROUP_PATTERN = 'LEFT_OUTER__LEFT_PRIMARY__RIGHT_PRIMARY__RIGHT_OUTER'

# Four authored masses replace the inherited seven top-fan locks as the visible
# crown architecture. Root footprints are broad and overlapping so the result
# still reads as one hair mass rather than four foam pieces. Endpoints intentionally
# form an asymmetric 4-peak rhythm instead of preserving seven old endpoints.
MACRO_GROUPS = (
    (
        [(-0.70, -0.09, 3.48), (-0.84, -0.28, 3.67), (-0.91, -0.43, 3.88), (-0.92, -0.52, 4.05)],
        [0.35, 0.31, 0.18, 0.018],
    ),
    (
        [(-0.27, -0.39, 3.60), (-0.30, -0.56, 3.84), (-0.23, -0.69, 4.06), (-0.13, -0.76, 4.22)],
        [0.39, 0.34, 0.19, 0.016],
    ),
    (
        [(0.25, -0.39, 3.60), (0.32, -0.56, 3.82), (0.43, -0.68, 4.03), (0.53, -0.72, 4.15)],
        [0.39, 0.34, 0.19, 0.016],
    ),
    (
        [(0.69, -0.14, 3.46), (0.83, -0.31, 3.66), (0.95, -0.42, 3.86), (1.02, -0.45, 4.00)],
        [0.34, 0.30, 0.17, 0.018],
    ),
)


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def add_macro_group(name, points, widths, material, *, gi):
    obj = v26.add_direct_terminal_loft_clump(name, points, widths, material, ci=gi)
    # V26's generic geometry helper sets provenance flags for its V10-centerline
    # use case. V29 intentionally authors new macro centerlines, so remove those
    # inherited metadata claims while retaining the actual validated profile math.
    for key in ('v10CenterlineFrozen', 'v10TipEndpointCenterFrozen'):
        if key in obj:
            del obj[key]
    obj['sourceAuthoringMethod'] = 'AUTHORED_MACRO_GROUP_WITH_V23_ROOT_AND_V26_TERMINAL_PROFILE'
    obj['macroGroupIndex'] = gi
    obj['macroGroupAuthoredCenterline'] = True
    obj['v23RootContinuityProfileRetained'] = True
    obj['v26TerminalProfileRetained'] = True
    obj['terminalLoftStartT'] = v26.TERMINAL_LOFT_START_T
    obj['terminalLoftProfile'] = v26.TERMINAL_LOFT_PROFILE
    obj['separateTipCapObject'] = False
    obj['separateVisibleFiberTubes'] = False
    return obj


def build_macro_group_union(scene):
    # Start from exact V10 production geometry/materials, then replace only the
    # seven crown/top-fan locks. Side framing, bangs, secondary hair and all
    # non-hair geometry remain untouched.
    v10.geometry_v10(scene)
    for ci in range(1, 8):
        obj = bpy.data.objects.get(f'HairMassPrimaryV10_{ci:02d}')
        if obj is None:
            raise RuntimeError(f'missing V10 crown object {ci}')
        bpy.data.objects.remove(obj, do_unlink=True)

    pearl = bpy.data.materials['ScoutHairMassPearlV10']
    cyan = bpy.data.materials['ScoutHairMassCyanV10']
    crown = []
    for gi, (points, widths) in enumerate(MACRO_GROUPS, 1):
        material = cyan if gi == 3 else pearl
        obj = add_macro_group(f'HairMacroGroupV29_{gi:02d}', points, widths, material, gi=gi)
        v18.apply_all_modifiers(obj)
        crown.append(obj)

    bridge = v18.add_buried_root_bridge(pearl)
    union = v18.join_objects(crown + [bridge], crown[0])
    union.name = 'HairCrownAuthoredMacroGroupsUnionV29'
    union.data.name = 'HairCrownAuthoredMacroGroupsUnionV29Mesh'
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
        raise RuntimeError(f'expected one connected crown after V29 remesh, got {components}')

    union['sourceAuthoringMethod'] = 'FOUR_AUTHORED_MACRO_GROUPS_WITH_V18_V23_V26_PRINCIPLES'
    union['inheritedSevenPeakArchitectureUsed'] = False
    union['authoredMacroGroupCount'] = MACRO_GROUP_COUNT
    union['macroGroupPattern'] = MACRO_GROUP_PATTERN
    union['v23RootContinuityProfileRetained'] = True
    union['v26TerminalProfileRetained'] = True
    union['v18BuriedBridgeRetained'] = True
    union['v18VoxelMethodRetained'] = True
    union['connectedComponentsAfterRemesh'] = components
    union['crownObjectsAfterUnion'] = 1
    union['scalpCapShellUsed'] = False
    union['separateTipCapObjects'] = 0
    union['detachedTipSpikesUsed'] = False
    union['separateVisibleFiberTubes'] = False

    scene['heroVersion'] = 'v29'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['preferredTerminalInput'] = 'v26'
    scene['controlledVariable'] = 'HAIR_CROWN_AUTHORED_MACRO_GROUPS_4_MASS_COMPOSITION'
    scene['hairSurfaceAuthoringMethod'] = 'FOUR_AUTHORED_MACRO_GROUPS_WITH_V18_V23_V26_PRINCIPLES'
    scene['inheritedSevenPeakArchitectureUsed'] = False
    scene['authoredMacroGroupCount'] = MACRO_GROUP_COUNT
    scene['macroGroupPattern'] = MACRO_GROUP_PATTERN
    scene['macroGroupEndpointsJson'] = json.dumps([list(group[0][-1]) for group in MACRO_GROUPS])
    scene['v23RootContinuityProfileRetained'] = True
    scene['v26TerminalProfileRetained'] = True
    scene['rootOverlapGain'] = v26.ROOT_OVERLAP_GAIN
    scene['rootTaperZoneEndT'] = v26.ROOT_TAPER_ZONE_END_T
    scene['terminalLoftStartT'] = v26.TERMINAL_LOFT_START_T
    scene['terminalLoftProfile'] = v26.TERMINAL_LOFT_PROFILE
    scene['v18BuriedBridgeRetained'] = True
    scene['v18VoxelMethodRetained'] = True
    scene['voxelSize'] = VOXEL_SIZE
    scene['connectedComponentsAfterRemesh'] = components
    scene['crownObjectsAfterUnion'] = 1
    scene['scalpCapShellUsed'] = False
    scene['separateTipCapObjects'] = 0
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
    union, components = build_macro_group_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v29',
        'assetName': 'Radar Scout 3D Static Hero v29',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'preferredTerminalInput': 'v26',
        'controlledVariable': 'HAIR_CROWN_AUTHORED_MACRO_GROUPS_4_MASS_COMPOSITION',
        'hairSurfaceAuthoringMethod': 'FOUR_AUTHORED_MACRO_GROUPS_WITH_V18_V23_V26_PRINCIPLES',
        'inheritedSevenPeakArchitectureUsed': False,
        'authoredMacroGroupCount': MACRO_GROUP_COUNT,
        'macroGroupPattern': MACRO_GROUP_PATTERN,
        'macroGroupEndpoints': [list(group[0][-1]) for group in MACRO_GROUPS],
        'v23RootContinuityProfileRetained': True,
        'v26TerminalProfileRetained': True,
        'rootOverlapGain': v26.ROOT_OVERLAP_GAIN,
        'rootTaperZoneEndT': v26.ROOT_TAPER_ZONE_END_T,
        'terminalLoftStartT': v26.TERMINAL_LOFT_START_T,
        'terminalLoftProfile': v26.TERMINAL_LOFT_PROFILE,
        'v18BuriedBridgeRetained': True,
        'v18VoxelMethodRetained': True,
        'voxelSize': VOXEL_SIZE,
        'connectedComponentsAfterRemesh': components,
        'crownObjectsAfterUnion': 1,
        'scalpCapShellUsed': False,
        'separateTipCapObjects': 0,
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
