import bpy
import hashlib
import importlib.util
import json
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v28
# V27 proved height cadence has visible leverage but cannot reduce the perception
# of seven discrete crown teeth. V28 freezes V23 root continuity, V26 direct
# rounded terminal loft, V27 late Z cadence, widths/materials and all Y/Z rules.
# Only late-section X coordinates change: three neighboring peak pairs converge
# into visual groups while the seventh remains an outer singleton.

HERE = os.path.dirname(os.path.abspath(__file__))
V27_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v27.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v27', V27_PATH)
v27 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v27)
v26 = v27.v26
v23 = v27.v23

CROWN_COUNT = v27.CROWN_COUNT
VOXEL_SIZE = v27.VOXEL_SIZE
LATERAL_GROUP_START_T = 0.70
PEAK_X_OFFSETS = (0.14, -0.14, 0.08, -0.08, 0.09, -0.09, -0.03)
GROUPING_PATTERN = 'PAIR_12__PAIR_34__PAIR_56__SINGLE_7'


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def smoothstep01(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3.0 - 2.0 * x)


def lateral_group_weight(t):
    if t <= LATERAL_GROUP_START_T:
        return 0.0
    return smoothstep01((t - LATERAL_GROUP_START_T) / (1.0 - LATERAL_GROUP_START_T))


_original_shifted_centers = v27.shifted_centers


def grouped_shifted_centers(points, widths, ci):
    centers, sampled_widths = _original_shifted_centers(points, widths, ci)
    dx = PEAK_X_OFFSETS[ci - 1]
    grouped = []
    for i, center in enumerate(centers):
        t = i / max(1, len(centers) - 1)
        grouped.append(center + Vector((dx * lateral_group_weight(t), 0.0, 0.0)))
    return grouped, sampled_widths


def build_grouped_union(scene):
    # Monkey-patch only the sampled centerline provider used by V27's already
    # source-exact direct-terminal mesh builder. This keeps every width, terminal
    # profile, Z cadence, material and voxel rule byte-for-byte inherited.
    v27.shifted_centers = grouped_shifted_centers
    try:
        union, components = v27.build_cadenced_union(scene)
    finally:
        v27.shifted_centers = _original_shifted_centers

    union.name = 'HairCrownLateralClusterGroupingUnionV28'
    union.data.name = 'HairCrownLateralClusterGroupingUnionV28Mesh'
    union['sourceAuthoringMethod'] = 'V23_ROOT_PLUS_V26_TERMINAL_PLUS_V27_HEIGHT_PLUS_LATERAL_CLUSTER_GROUPING'
    union['v23RootContinuityProfileFrozen'] = True
    union['v26TerminalProfileFrozen'] = True
    union['v27PeakHeightCadenceFrozen'] = True
    union['lateralGroupStartT'] = LATERAL_GROUP_START_T
    union['peakXOffsets'] = tuple(PEAK_X_OFFSETS)
    union['groupingPattern'] = GROUPING_PATTERN
    union['widthProfilesFrozen'] = True
    union['yCenterlineCoordinatesFrozen'] = True
    union['v18VoxelMethodFrozen'] = True

    scene['heroVersion'] = 'v28'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['preferredRootContinuityInput'] = 'v23'
    scene['preferredTerminalInput'] = 'v26'
    scene['preferredPeakHeightInput'] = 'v27'
    scene['controlledVariable'] = 'HAIR_CROWN_LATERAL_PEAK_CONVERGENCE_AND_CLUSTER_GROUPING'
    scene['hairSurfaceAuthoringMethod'] = 'V23_ROOT_PLUS_V26_TERMINAL_PLUS_V27_HEIGHT_PLUS_LATERAL_CLUSTER_GROUPING'
    scene['v23RootContinuityProfileFrozen'] = True
    scene['v26TerminalProfileFrozen'] = True
    scene['v27PeakHeightCadenceFrozen'] = True
    scene['lateralGroupStartT'] = LATERAL_GROUP_START_T
    scene['peakXOffsets'] = tuple(PEAK_X_OFFSETS)
    scene['groupingPattern'] = GROUPING_PATTERN
    scene['widthProfilesFrozen'] = True
    scene['yCenterlineCoordinatesFrozen'] = True
    scene['v18VoxelMethodFrozen'] = True
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
    union, components = build_grouped_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v28',
        'assetName': 'Radar Scout 3D Static Hero v28',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'preferredRootContinuityInput': 'v23',
        'preferredTerminalInput': 'v26',
        'preferredPeakHeightInput': 'v27',
        'controlledVariable': 'HAIR_CROWN_LATERAL_PEAK_CONVERGENCE_AND_CLUSTER_GROUPING',
        'hairSurfaceAuthoringMethod': 'V23_ROOT_PLUS_V26_TERMINAL_PLUS_V27_HEIGHT_PLUS_LATERAL_CLUSTER_GROUPING',
        'v23RootContinuityProfileFrozen': True,
        'v26TerminalProfileFrozen': True,
        'v27PeakHeightCadenceFrozen': True,
        'lateralGroupStartT': LATERAL_GROUP_START_T,
        'peakXOffsets': list(PEAK_X_OFFSETS),
        'groupingPattern': GROUPING_PATTERN,
        'widthProfilesFrozen': True,
        'yCenterlineCoordinatesFrozen': True,
        'rootOverlapGain': v27.ROOT_OVERLAP_GAIN,
        'rootTaperZoneEndT': v27.ROOT_TAPER_ZONE_END_T,
        'terminalLoftStartT': v27.TERMINAL_LOFT_START_T,
        'terminalLoftProfile': v27.TERMINAL_LOFT_PROFILE,
        'peakCadenceStartT': v27.PEAK_CADENCE_START_T,
        'peakHeightOffsets': list(v27.PEAK_HEIGHT_OFFSETS),
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
