import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v30
# V29 proved that four first-class authored macro groups can reduce the visible
# crown architecture from the inherited multi-tooth rhythm to four principal
# peaks, but the complete phone-scale delta over V10 remained modest. V30 freezes
# every V29 macro centerline and endpoint and changes only the mid/shoulder width
# profile to increase inter-group valley depth without breaking the connected root.

HERE = os.path.dirname(os.path.abspath(__file__))
V29_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v29.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v29', V29_PATH)
v29 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v29)
v26 = v29.v26
v23 = v29.v23
v18 = v29.v18
v10 = v29.v10

VOXEL_SIZE = v29.VOXEL_SIZE
MACRO_GROUP_COUNT = v29.MACRO_GROUP_COUNT
MACRO_GROUP_PATTERN = v29.MACRO_GROUP_PATTERN
MID_WIDTH_SCALE = 0.88
SHOULDER_WIDTH_SCALE = 0.86


def refined_groups():
    out = []
    for points, widths in v29.MACRO_GROUPS:
        w = list(widths)
        # Root footprint and terminal source width remain exact V29 values.
        w[1] = w[1] * MID_WIDTH_SCALE
        w[2] = w[2] * SHOULDER_WIDTH_SCALE
        out.append((list(points), w))
    return tuple(out)


V30_MACRO_GROUPS = refined_groups()


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def build_refined_macro_union(scene):
    original = v29.MACRO_GROUPS
    v29.MACRO_GROUPS = V30_MACRO_GROUPS
    try:
        union, components = v29.build_macro_group_union(scene)
    finally:
        v29.MACRO_GROUPS = original

    union.name = 'HairCrownMacroShoulderSeparationUnionV30'
    union.data.name = 'HairCrownMacroShoulderSeparationUnionV30Mesh'
    union['sourceAuthoringMethod'] = 'V29_FOUR_MACRO_GROUPS_WITH_REFINED_MID_SHOULDER_WIDTHS'
    union['v29MacroCenterlinesFrozen'] = True
    union['v29MacroEndpointsFrozen'] = True
    union['v29RootFootprintWidthsFrozen'] = True
    union['v29TerminalSourceWidthsFrozen'] = True
    union['midWidthScale'] = MID_WIDTH_SCALE
    union['shoulderWidthScale'] = SHOULDER_WIDTH_SCALE
    union['authoredMacroGroupCount'] = MACRO_GROUP_COUNT
    union['macroGroupPattern'] = MACRO_GROUP_PATTERN

    scene['heroVersion'] = 'v30'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['preferredTerminalInput'] = 'v26'
    scene['preferredMacroArchitectureInput'] = 'v29'
    scene['controlledVariable'] = 'HAIR_CROWN_MACRO_GROUP_SHOULDER_SEPARATION_AND_VALLEY_DEPTH'
    scene['hairSurfaceAuthoringMethod'] = 'V29_FOUR_MACRO_GROUPS_WITH_REFINED_MID_SHOULDER_WIDTHS'
    scene['v29MacroCenterlinesFrozen'] = True
    scene['v29MacroEndpointsFrozen'] = True
    scene['v29RootFootprintWidthsFrozen'] = True
    scene['v29TerminalSourceWidthsFrozen'] = True
    scene['midWidthScale'] = MID_WIDTH_SCALE
    scene['shoulderWidthScale'] = SHOULDER_WIDTH_SCALE
    scene['authoredMacroGroupCount'] = MACRO_GROUP_COUNT
    scene['macroGroupPattern'] = MACRO_GROUP_PATTERN
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
    union, components = build_refined_macro_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v30',
        'assetName': 'Radar Scout 3D Static Hero v30',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'preferredTerminalInput': 'v26',
        'preferredMacroArchitectureInput': 'v29',
        'controlledVariable': 'HAIR_CROWN_MACRO_GROUP_SHOULDER_SEPARATION_AND_VALLEY_DEPTH',
        'hairSurfaceAuthoringMethod': 'V29_FOUR_MACRO_GROUPS_WITH_REFINED_MID_SHOULDER_WIDTHS',
        'v29MacroCenterlinesFrozen': True,
        'v29MacroEndpointsFrozen': True,
        'v29RootFootprintWidthsFrozen': True,
        'v29TerminalSourceWidthsFrozen': True,
        'midWidthScale': MID_WIDTH_SCALE,
        'shoulderWidthScale': SHOULDER_WIDTH_SCALE,
        'authoredMacroGroupCount': MACRO_GROUP_COUNT,
        'macroGroupPattern': MACRO_GROUP_PATTERN,
        'macroGroupEndpoints': [list(group[0][-1]) for group in V30_MACRO_GROUPS],
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
