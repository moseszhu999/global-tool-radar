import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v32
# V31 showed width-only dominant/secondary hierarchy is visually negligible.
# V32 freezes V30's four macro X/Z centerlines, endpoints, and all width profiles,
# and changes only progressive Y depth ordering. Central primary groups move
# slightly forward; outer secondary groups move slightly backward, creating a
# real 3D occlusion/light hierarchy without changing the top silhouette design.

HERE = os.path.dirname(os.path.abspath(__file__))
V30_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v30.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v30', V30_PATH)
v30 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v30)
v29 = v30.v29
v26 = v29.v26
v23 = v29.v23
v18 = v29.v18
v10 = v29.v10

VOXEL_SIZE = v29.VOXEL_SIZE
MACRO_GROUP_COUNT = v29.MACRO_GROUP_COUNT
MACRO_GROUP_PATTERN = v29.MACRO_GROUP_PATTERN
DEPTH_OFFSETS = (0.040, -0.050, -0.025, 0.035)
DEPTH_PROGRESS = (0.0, 0.25, 0.65, 1.0)
DEPTH_ORDER = 'G2_FRONT__G3_MID_FRONT__G4_BACK__G1_BACK'


def depth_staggered_groups():
    out = []
    for gi, (points, widths) in enumerate(v30.V30_MACRO_GROUPS):
        offset = DEPTH_OFFSETS[gi]
        shifted = []
        for pi, p in enumerate(points):
            x, y, z = p
            shifted.append((x, y + offset * DEPTH_PROGRESS[pi], z))
        out.append((shifted, list(widths)))
    return tuple(out)


V32_MACRO_GROUPS = depth_staggered_groups()


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def build_depth_stagger_union(scene):
    original = v29.MACRO_GROUPS
    v29.MACRO_GROUPS = V32_MACRO_GROUPS
    try:
        union, components = v29.build_macro_group_union(scene)
    finally:
        v29.MACRO_GROUPS = original

    union.name = 'HairCrownMacroDepthStaggerUnionV32'
    union.data.name = 'HairCrownMacroDepthStaggerUnionV32Mesh'
    union['sourceAuthoringMethod'] = 'V30_FOUR_MACRO_GROUPS_WITH_PROGRESSIVE_Y_DEPTH_STAGGER'
    union['v30MacroXCoordinatesFrozen'] = True
    union['v30MacroZCoordinatesFrozen'] = True
    union['v30MacroWidthsFrozen'] = True
    union['v30MacroRootYFrozen'] = True
    union['depthOffsetsJson'] = json.dumps(list(DEPTH_OFFSETS))
    union['depthProgressJson'] = json.dumps(list(DEPTH_PROGRESS))
    union['depthOrder'] = DEPTH_ORDER

    scene['heroVersion'] = 'v32'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['preferredTerminalInput'] = 'v26'
    scene['preferredMacroArchitectureInput'] = 'v29'
    scene['preferredMacroWidthInput'] = 'v30'
    scene['controlledVariable'] = 'HAIR_CROWN_MACRO_GROUP_DEPTH_STAGGER_AND_OVERLAP_ORDER'
    scene['hairSurfaceAuthoringMethod'] = 'V30_FOUR_MACRO_GROUPS_WITH_PROGRESSIVE_Y_DEPTH_STAGGER'
    scene['v30MacroXCoordinatesFrozen'] = True
    scene['v30MacroZCoordinatesFrozen'] = True
    scene['v30MacroWidthsFrozen'] = True
    scene['v30MacroRootYFrozen'] = True
    scene['depthOffsetsJson'] = json.dumps(list(DEPTH_OFFSETS))
    scene['depthProgressJson'] = json.dumps(list(DEPTH_PROGRESS))
    scene['depthOrder'] = DEPTH_ORDER
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
    union, components = build_depth_stagger_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v32',
        'assetName': 'Radar Scout 3D Static Hero v32',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'preferredTerminalInput': 'v26',
        'preferredMacroArchitectureInput': 'v29',
        'preferredMacroWidthInput': 'v30',
        'controlledVariable': 'HAIR_CROWN_MACRO_GROUP_DEPTH_STAGGER_AND_OVERLAP_ORDER',
        'hairSurfaceAuthoringMethod': 'V30_FOUR_MACRO_GROUPS_WITH_PROGRESSIVE_Y_DEPTH_STAGGER',
        'v30MacroXCoordinatesFrozen': True,
        'v30MacroZCoordinatesFrozen': True,
        'v30MacroWidthsFrozen': True,
        'v30MacroRootYFrozen': True,
        'depthOffsets': list(DEPTH_OFFSETS),
        'depthProgress': list(DEPTH_PROGRESS),
        'depthOrder': DEPTH_ORDER,
        'authoredMacroGroupCount': MACRO_GROUP_COUNT,
        'macroGroupPattern': MACRO_GROUP_PATTERN,
        'macroGroupEndpoints': [list(group[0][-1]) for group in V32_MACRO_GROUPS],
        'v23RootContinuityProfileRetained': True,
        'v26TerminalProfileRetained': True,
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
