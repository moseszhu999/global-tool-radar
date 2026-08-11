import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v21
# V20 proved six local adjacent-root lobes are topologically stable but their
# root-depth placement is visually invisible at phone scale. V21 freezes the
# exact V20 six-lobe topology, lobe dimensions, V10 peaks and V18 voxel-remesh
# method. The only controlled delta is the lobe depth profile: move the same six
# lobes forward/up into the visible lower inter-lock valley.

HERE = os.path.dirname(os.path.abspath(__file__))
V20_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v20.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v20', V20_PATH)
v20 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v20)

V20_FORWARD_OFFSET = v20.VALLEY_FORWARD_OFFSET
V20_UP_OFFSET = v20.VALLEY_UP_OFFSET
V21_FORWARD_OFFSET = -0.060
V21_UP_OFFSET = 0.120


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def geometry_v21(scene):
    # Freeze every V20 parameter except lobe center placement.
    v20.VALLEY_FORWARD_OFFSET = V21_FORWARD_OFFSET
    v20.VALLEY_UP_OFFSET = V21_UP_OFFSET
    union, components, roots = v20.build_local_root_web_union(scene)
    union.name = 'HairCrownVisibleValleyProfileUnionV21'
    union['sourceAuthoringMethod'] = 'V20_LOCAL_ROOT_WEB_WITH_VISIBLE_VALLEY_DEPTH_PROFILE'
    union['v20LocalWebTopologyFrozen'] = True
    union['v20LobeDimensionsFrozen'] = True
    union['v20ForwardOffset'] = V20_FORWARD_OFFSET
    union['v20UpOffset'] = V20_UP_OFFSET
    union['v21ForwardOffset'] = V21_FORWARD_OFFSET
    union['v21UpOffset'] = V21_UP_OFFSET

    scene['heroVersion'] = 'v21'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v20'
    scene['controlledVariable'] = 'HAIR_CROWN_VISIBLE_VALLEY_FILL_DEPTH_PROFILE'
    scene['hairSurfaceAuthoringMethod'] = 'V20_LOCAL_ROOT_WEB_WITH_VISIBLE_VALLEY_DEPTH_PROFILE'
    scene['v20LocalWebTopologyFrozen'] = True
    scene['v20LobeDimensionsFrozen'] = True
    scene['v20LobeAxisMarginFrozen'] = v20.LOBE_AXIS_MARGIN
    scene['v20LobeLateralRadiusFrozen'] = v20.LOBE_LATERAL_RADIUS
    scene['v20LobeVerticalRadiusFrozen'] = v20.LOBE_VERTICAL_RADIUS
    scene['v20ForwardOffset'] = V20_FORWARD_OFFSET
    scene['v20UpOffset'] = V20_UP_OFFSET
    scene['v21ForwardOffset'] = V21_FORWARD_OFFSET
    scene['v21UpOffset'] = V21_UP_OFFSET
    scene['localValleyLobes'] = v20.PAIR_COUNT
    scene['connectedComponentsAfterRemesh'] = components
    scene['crownObjectsAfterUnion'] = 1
    scene['v10CrownCenterlinesAndWidthsFrozen'] = v20.CROWN_COUNT
    scene['v18VoxelMethodFrozen'] = True
    scene['voxelSize'] = v20.VOXEL_SIZE
    scene['scalpCapShellUsed'] = False
    scene['singleRootArcUsed'] = False
    scene['broadEllipsoidBridgeUsed'] = False
    scene['separateVisibleFiberTubes'] = False
    return union, components, roots


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

    v20.v18.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v20.v18.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v20.v18.v10.v8.v6.v5.v2.geometry_v2(scene)
    v20.v18.v10.v8.v6.v5.geometry_v5(scene)
    union, components, roots = geometry_v21(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v21',
        'assetName': 'Radar Scout 3D Static Hero v21',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v20',
        'controlledVariable': 'HAIR_CROWN_VISIBLE_VALLEY_FILL_DEPTH_PROFILE',
        'hairSurfaceAuthoringMethod': 'V20_LOCAL_ROOT_WEB_WITH_VISIBLE_VALLEY_DEPTH_PROFILE',
        'v20LocalWebTopologyFrozen': True,
        'v20LobeDimensionsFrozen': True,
        'v20LobeAxisMarginFrozen': v20.LOBE_AXIS_MARGIN,
        'v20LobeLateralRadiusFrozen': v20.LOBE_LATERAL_RADIUS,
        'v20LobeVerticalRadiusFrozen': v20.LOBE_VERTICAL_RADIUS,
        'v20ForwardOffset': V20_FORWARD_OFFSET,
        'v20UpOffset': V20_UP_OFFSET,
        'v21ForwardOffset': V21_FORWARD_OFFSET,
        'v21UpOffset': V21_UP_OFFSET,
        'localValleyLobes': v20.PAIR_COUNT,
        'v10VisibleLockSilhouetteAuthority': True,
        'v10CrownCenterlinesAndWidthsFrozen': v20.CROWN_COUNT,
        'v18VoxelMethodFrozen': True,
        'voxelSize': v20.VOXEL_SIZE,
        'crownObjectsAfterUnion': 1,
        'connectedComponentsAfterRemesh': components,
        'scalpCapShellUsed': False,
        'singleRootArcUsed': False,
        'broadEllipsoidBridgeUsed': False,
        'separateVisibleFiberTubes': False,
        'rootPoints': [list(p) for p in roots],
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
