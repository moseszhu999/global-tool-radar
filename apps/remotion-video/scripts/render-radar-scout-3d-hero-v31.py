import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v31
# V30 proved uniform shoulder narrowing has only small phone-scale leverage.
# V31 freezes V29's four authored macro centerlines/endpoints/root footprints and
# terminal source widths, but introduces a clear dominant-secondary hierarchy:
# central groups 2/3 remain fuller, outer groups 1/4 become lighter through only
# their mid/shoulder width controls. No peak locations or root architecture move.

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
OUTER_MID_WIDTH_SCALE = 0.80
OUTER_SHOULDER_WIDTH_SCALE = 0.78
PRIMARY_MID_WIDTH_SCALE = 0.94
PRIMARY_SHOULDER_WIDTH_SCALE = 0.92
HIERARCHY_PATTERN = 'SECONDARY_G1__PRIMARY_G2__PRIMARY_G3__SECONDARY_G4'


def hierarchical_groups():
    out = []
    for gi, (points, widths) in enumerate(v29.MACRO_GROUPS, 1):
        w = list(widths)
        if gi in (2, 3):
            w[1] *= PRIMARY_MID_WIDTH_SCALE
            w[2] *= PRIMARY_SHOULDER_WIDTH_SCALE
        else:
            w[1] *= OUTER_MID_WIDTH_SCALE
            w[2] *= OUTER_SHOULDER_WIDTH_SCALE
        out.append((list(points), w))
    return tuple(out)


V31_MACRO_GROUPS = hierarchical_groups()


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def build_hierarchical_macro_union(scene):
    original = v29.MACRO_GROUPS
    v29.MACRO_GROUPS = V31_MACRO_GROUPS
    try:
        union, components = v29.build_macro_group_union(scene)
    finally:
        v29.MACRO_GROUPS = original

    union.name = 'HairCrownDominantSecondaryHierarchyUnionV31'
    union.data.name = 'HairCrownDominantSecondaryHierarchyUnionV31Mesh'
    union['sourceAuthoringMethod'] = 'V29_FOUR_MACRO_GROUPS_WITH_DOMINANT_SECONDARY_SHOULDER_HIERARCHY'
    union['v29MacroCenterlinesFrozen'] = True
    union['v29MacroEndpointsFrozen'] = True
    union['v29RootFootprintWidthsFrozen'] = True
    union['v29TerminalSourceWidthsFrozen'] = True
    union['hierarchyPattern'] = HIERARCHY_PATTERN
    union['outerMidWidthScale'] = OUTER_MID_WIDTH_SCALE
    union['outerShoulderWidthScale'] = OUTER_SHOULDER_WIDTH_SCALE
    union['primaryMidWidthScale'] = PRIMARY_MID_WIDTH_SCALE
    union['primaryShoulderWidthScale'] = PRIMARY_SHOULDER_WIDTH_SCALE

    scene['heroVersion'] = 'v31'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['preferredTerminalInput'] = 'v26'
    scene['preferredMacroArchitectureInput'] = 'v29'
    scene['controlledVariable'] = 'HAIR_CROWN_MACRO_GROUP_DOMINANT_SECONDARY_HIERARCHY'
    scene['hairSurfaceAuthoringMethod'] = 'V29_FOUR_MACRO_GROUPS_WITH_DOMINANT_SECONDARY_SHOULDER_HIERARCHY'
    scene['v29MacroCenterlinesFrozen'] = True
    scene['v29MacroEndpointsFrozen'] = True
    scene['v29RootFootprintWidthsFrozen'] = True
    scene['v29TerminalSourceWidthsFrozen'] = True
    scene['hierarchyPattern'] = HIERARCHY_PATTERN
    scene['outerMidWidthScale'] = OUTER_MID_WIDTH_SCALE
    scene['outerShoulderWidthScale'] = OUTER_SHOULDER_WIDTH_SCALE
    scene['primaryMidWidthScale'] = PRIMARY_MID_WIDTH_SCALE
    scene['primaryShoulderWidthScale'] = PRIMARY_SHOULDER_WIDTH_SCALE
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
    union, components = build_hierarchical_macro_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v31',
        'assetName': 'Radar Scout 3D Static Hero v31',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'preferredTerminalInput': 'v26',
        'preferredMacroArchitectureInput': 'v29',
        'controlledVariable': 'HAIR_CROWN_MACRO_GROUP_DOMINANT_SECONDARY_HIERARCHY',
        'hairSurfaceAuthoringMethod': 'V29_FOUR_MACRO_GROUPS_WITH_DOMINANT_SECONDARY_SHOULDER_HIERARCHY',
        'v29MacroCenterlinesFrozen': True,
        'v29MacroEndpointsFrozen': True,
        'v29RootFootprintWidthsFrozen': True,
        'v29TerminalSourceWidthsFrozen': True,
        'hierarchyPattern': HIERARCHY_PATTERN,
        'outerMidWidthScale': OUTER_MID_WIDTH_SCALE,
        'outerShoulderWidthScale': OUTER_SHOULDER_WIDTH_SCALE,
        'primaryMidWidthScale': PRIMARY_MID_WIDTH_SCALE,
        'primaryShoulderWidthScale': PRIMARY_SHOULDER_WIDTH_SCALE,
        'authoredMacroGroupCount': MACRO_GROUP_COUNT,
        'macroGroupPattern': MACRO_GROUP_PATTERN,
        'macroGroupEndpoints': [list(group[0][-1]) for group in V31_MACRO_GROUPS],
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
