import bpy
import hashlib
import importlib.util
import json
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v20
# V18 established CONNECTED_VOLUMETRIC_UNION as the preferred crown family.
# V19 proved a single root-following arc can satisfy connectivity but its visual
# delta is effectively invisible at phone scale. V20 therefore changes one
# connector-level variable only: six LOCAL adjacent-root valley lobes, one per
# neighboring V10 crown pair. Each lobe overlaps only its pair and rises slightly
# into that local valley before the exact V18 voxel-remesh profile is applied.
# This is intended to make root/valley continuity visible without creating a
# broad cap and without changing any V10 peak centerline or width.

HERE = os.path.dirname(os.path.abspath(__file__))
V18_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v18.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v18', V18_PATH)
v18 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v18)

CROWN_COUNT = 7
PAIR_COUNT = CROWN_COUNT - 1
VOXEL_SIZE = v18.VOXEL_SIZE
VALLEY_FORWARD_OFFSET = -0.025
VALLEY_UP_OFFSET = 0.055
LOBE_AXIS_MARGIN = 0.10
LOBE_LATERAL_RADIUS = 0.16
LOBE_VERTICAL_RADIUS = 0.13


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def exact_v10_crown_roots():
    return [Vector(points[0]) for points, _widths in v18.v10.v8.V6_PRIMARY[:CROWN_COUNT]]


def add_local_valley_lobe(index, a, b, material):
    delta = b - a
    distance = delta.length
    if distance <= 1e-6:
        raise RuntimeError('degenerate adjacent V10 crown roots')

    center = (a + b) * 0.5
    center.y += VALLEY_FORWARD_OFFSET
    center.z += VALLEY_UP_OFFSET

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=20,
        location=tuple(center),
    )
    obj = bpy.context.object
    obj.name = f'HairCrownLocalValleyLobeV20_{index:02d}'

    # Local X follows the adjacent-root axis. The lobe reaches into both root
    # volumes but remains narrow in its perpendicular directions, so six local
    # bridges cannot accidentally become one broad scalp cap before remesh.
    quat = delta.normalized().to_track_quat('X', 'Z')
    obj.rotation_euler = quat.to_euler()
    obj.scale = (
        distance * 0.5 + LOBE_AXIS_MARGIN,
        LOBE_LATERAL_RADIUS,
        LOBE_VERTICAL_RADIUS,
    )
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)

    obj['connectorMethod'] = 'LOCAL_ADJACENT_ROOT_VALLEY_LOBE'
    obj['adjacentRootPairIndex'] = index
    obj['visibleSilhouetteAuthority'] = False
    obj['localValleyFusionTarget'] = True
    obj['forwardOffset'] = VALLEY_FORWARD_OFFSET
    obj['upOffset'] = VALLEY_UP_OFFSET
    obj['axisMargin'] = LOBE_AXIS_MARGIN
    obj['lateralRadius'] = LOBE_LATERAL_RADIUS
    obj['verticalRadius'] = LOBE_VERTICAL_RADIUS
    return obj


def build_local_root_web_union(scene):
    # Exact V10 remains visible silhouette authority; exact V18 remains the
    # voxel-union method/profile authority.
    v18.v10.geometry_v10(scene)

    crown = []
    for ci in range(1, CROWN_COUNT + 1):
        obj = bpy.data.objects.get(f'HairMassPrimaryV10_{ci:02d}')
        if obj is None:
            raise RuntimeError(f'missing V10 crown object {ci}')
        v18.apply_all_modifiers(obj)
        obj['v10CrownCenterlineAndWidthsFrozen'] = True
        crown.append(obj)

    roots = exact_v10_crown_roots()
    pearl = bpy.data.materials['ScoutHairMassPearlV10']
    lobes = [
        add_local_valley_lobe(i + 1, roots[i], roots[i + 1], pearl)
        for i in range(PAIR_COUNT)
    ]

    union = v18.join_objects(crown + lobes, crown[0])
    union.name = 'HairCrownLocalRootWebUnionV20'
    union.data.name = 'HairCrownLocalRootWebUnionV20Mesh'

    union.data.remesh_mode = 'VOXEL'
    union.data.remesh_voxel_size = VOXEL_SIZE
    union.data.remesh_voxel_adaptivity = 0.0
    union.data.use_remesh_fix_poles = True
    union.data.use_remesh_preserve_volume = True
    union.data.use_remesh_preserve_attributes = True
    v18.set_active(union)
    if not hasattr(bpy.ops.object, 'voxel_remesh'):
        raise RuntimeError('Blender object.voxel_remesh operator unavailable')
    bpy.ops.object.voxel_remesh()

    for poly in union.data.polygons:
        poly.use_smooth = True

    components = v18.connected_component_count(union.data)
    if components != 1:
        raise RuntimeError(f'expected one connected crown after V20 voxel remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V10_CROWN_LOCKS_CONNECTED_BY_LOCAL_ROOT_WEB_VOXEL_UNION'
    union['v10VisibleLockSilhouetteAuthority'] = True
    union['v10CrownCenterlinesAndWidthsFrozen'] = CROWN_COUNT
    union['v18VoxelMethodFrozen'] = True
    union['voxelSize'] = VOXEL_SIZE
    union['connectorMethod'] = 'LOCAL_ADJACENT_ROOT_VALLEY_LOBES'
    union['localValleyLobes'] = PAIR_COUNT
    union['localRootWebUsed'] = True
    union['singleRootArcUsed'] = False
    union['broadEllipsoidBridgeUsed'] = False
    union['crownObjectsAfterUnion'] = 1
    union['connectedComponentsAfterRemesh'] = components
    union['scalpCapShellUsed'] = False
    union['separateVisibleFiberTubes'] = False

    scene['heroVersion'] = 'v20'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['controlledVariable'] = 'HAIR_CROWN_LOCAL_ROOT_WEB_AND_ADJACENT_VALLEY_FUSION'
    scene['hairSurfaceAuthoringMethod'] = 'V10_CROWN_LOCKS_CONNECTED_BY_LOCAL_ROOT_WEB_VOXEL_UNION'
    scene['v10VisibleLockSilhouetteAuthority'] = True
    scene['v10CrownCenterlinesAndWidthsFrozen'] = CROWN_COUNT
    scene['v18VoxelMethodFrozen'] = True
    scene['voxelSize'] = VOXEL_SIZE
    scene['connectorMethod'] = 'LOCAL_ADJACENT_ROOT_VALLEY_LOBES'
    scene['localValleyLobes'] = PAIR_COUNT
    scene['localRootWebUsed'] = True
    scene['singleRootArcUsed'] = False
    scene['broadEllipsoidBridgeUsed'] = False
    scene['valleyForwardOffset'] = VALLEY_FORWARD_OFFSET
    scene['valleyUpOffset'] = VALLEY_UP_OFFSET
    scene['lobeAxisMargin'] = LOBE_AXIS_MARGIN
    scene['lobeLateralRadius'] = LOBE_LATERAL_RADIUS
    scene['lobeVerticalRadius'] = LOBE_VERTICAL_RADIUS
    scene['crownObjectsAfterUnion'] = 1
    scene['connectedComponentsAfterRemesh'] = components
    scene['scalpCapShellUsed'] = False
    scene['voxelRemeshPerformed'] = True
    scene['v10MaterialPalettePreserved'] = True
    scene['frozenV10PrimaryClumps8Through14'] = 7
    scene['secondaryCenterlinesAndWidthsFrozen'] = True
    scene['sideFramingPrimaryFrozen'] = True
    scene['centralBangsFrozen'] = True
    scene['separateVisibleFiberTubes'] = False
    scene['primaryHairObjects'] = 8
    scene['secondaryMassClumps'] = 6
    scene['totalHairObjects'] = 14
    for key in ('ContinuousHead', 'EyeSocketAlignment', 'Body', 'Ears', 'Tablet', 'EnergyTail', 'Lighting', 'Camera', 'Renderer'):
        scene['v6' + key + 'Frozen'] = True
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

    v18.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v18.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v18.v10.v8.v6.v5.v2.geometry_v2(scene)
    v18.v10.v8.v6.v5.geometry_v5(scene)
    union, components, roots = build_local_root_web_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v20',
        'assetName': 'Radar Scout 3D Static Hero v20',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'controlledVariable': 'HAIR_CROWN_LOCAL_ROOT_WEB_AND_ADJACENT_VALLEY_FUSION',
        'hairSurfaceAuthoringMethod': 'V10_CROWN_LOCKS_CONNECTED_BY_LOCAL_ROOT_WEB_VOXEL_UNION',
        'v10VisibleLockSilhouetteAuthority': True,
        'v10CrownCenterlinesAndWidthsFrozen': CROWN_COUNT,
        'v18VoxelMethodFrozen': True,
        'voxelSize': VOXEL_SIZE,
        'connectorMethod': 'LOCAL_ADJACENT_ROOT_VALLEY_LOBES',
        'localValleyLobes': PAIR_COUNT,
        'localRootWebUsed': True,
        'singleRootArcUsed': False,
        'broadEllipsoidBridgeUsed': False,
        'valleyForwardOffset': VALLEY_FORWARD_OFFSET,
        'valleyUpOffset': VALLEY_UP_OFFSET,
        'lobeAxisMargin': LOBE_AXIS_MARGIN,
        'lobeLateralRadius': LOBE_LATERAL_RADIUS,
        'lobeVerticalRadius': LOBE_VERTICAL_RADIUS,
        'rootPoints': [list(p) for p in roots],
        'crownObjectsAfterUnion': 1,
        'connectedComponentsAfterRemesh': components,
        'scalpCapShellUsed': False,
        'voxelRemeshPerformed': True,
        'v10MaterialPalettePreserved': True,
        'frozenV10PrimaryClumps8Through14': 7,
        'secondaryCenterlinesAndWidthsFrozen': True,
        'sideFramingPrimaryFrozen': True,
        'centralBangsFrozen': True,
        'separateVisibleFiberTubes': False,
        'primaryHairObjects': 8,
        'secondaryMassClumps': 6,
        'totalHairObjects': 14,
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
