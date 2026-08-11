import bpy
import hashlib
import importlib.util
import json
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v19
# V18 established CONNECTED_VOLUMETRIC_UNION as the preferred crown
# representation family, but its broad hidden ellipsoid bridge produced only
# near-parity versus V10 because it did not visibly lift/fuse adjacent root
# valleys. V19 freezes V18's union/remesh method and exact V10 crown peak
# centerlines/widths, changing only the buried connector geometry: replace the
# broad ellipsoid with one narrow root-following arc through the seven V10 crown
# roots, slightly rearward/down so it fuses valleys without becoming a cap.

HERE = os.path.dirname(os.path.abspath(__file__))
V18_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v18.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v18', V18_PATH)
v18 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v18)

CROWN_COUNT = 7
VOXEL_SIZE = v18.VOXEL_SIZE
ROOT_ARC_REARWARD_OFFSET = 0.055
ROOT_ARC_DOWN_OFFSET = 0.055
ROOT_ARC_BEVEL_DEPTH = 0.17
ROOT_ARC_BEVEL_RESOLUTION = 5
ROOT_ARC_RESOLUTION_U = 24


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def crown_root_points():
    roots = []
    for points, _widths in v18.v10.v8.V6_PRIMARY[:CROWN_COUNT]:
        p = Vector(points[0])
        # Negative Y is camera/front in this asset. Positive Y buries the arc
        # rearward; negative Z keeps the connector just below the visible roots.
        p.y += ROOT_ARC_REARWARD_OFFSET
        p.z -= ROOT_ARC_DOWN_OFFSET
        roots.append(tuple(p))
    return roots


def add_root_following_arc(material):
    points = crown_root_points()
    curve = bpy.data.curves.new('HairCrownRootArcV19Curve', type='CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = ROOT_ARC_RESOLUTION_U
    curve.bevel_depth = ROOT_ARC_BEVEL_DEPTH
    curve.bevel_resolution = ROOT_ARC_BEVEL_RESOLUTION
    curve.resolution_u = ROOT_ARC_RESOLUTION_U
    curve.fill_mode = 'FULL'

    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
        bp.radius = 1.0

    obj = bpy.data.objects.new('HairCrownRootArcV19', curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    obj['rootConnectorMethod'] = 'V10_ROOT_FOLLOWING_ARC'
    obj['rootArcConnectorUsed'] = True
    obj['ellipsoidRootBridgeUsed'] = False
    obj['buriedBehindV10Roots'] = True
    obj['visibleSilhouetteAuthority'] = False
    obj['rearwardOffset'] = ROOT_ARC_REARWARD_OFFSET
    obj['downOffset'] = ROOT_ARC_DOWN_OFFSET
    obj['bevelDepth'] = ROOT_ARC_BEVEL_DEPTH

    v18.set_active(obj)
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.object
    obj.name = 'HairCrownRootArcV19Mesh'
    return obj, points


def build_connected_crown_with_root_arc(scene):
    # Exact V10 is still the visible silhouette authority. V18 is imported only
    # as the proven union/remesh method authority.
    v18.v10.geometry_v10(scene)

    crown = []
    for ci in range(1, CROWN_COUNT + 1):
        obj = bpy.data.objects.get(f'HairMassPrimaryV10_{ci:02d}')
        if obj is None:
            raise RuntimeError(f'missing V10 crown object {ci}')
        v18.apply_all_modifiers(obj)
        obj['v10CrownCenterlineAndWidthsFrozen'] = True
        crown.append(obj)

    pearl = bpy.data.materials['ScoutHairMassPearlV10']
    root_arc, roots = add_root_following_arc(pearl)

    union = v18.join_objects(crown + [root_arc], crown[0])
    union.name = 'HairCrownConnectedRootArcUnionV19'
    union.data.name = 'HairCrownConnectedRootArcUnionV19Mesh'

    # Freeze V18 voxel union method/profile exactly; only connector geometry is
    # the controlled variable.
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
        raise RuntimeError(f'expected one connected crown after V19 voxel remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V10_CROWN_LOCKS_CONNECTED_BY_ROOT_FOLLOWING_ARC_VOXEL_UNION'
    union['v10VisibleLockSilhouetteAuthority'] = True
    union['v10CrownCenterlinesAndWidthsFrozen'] = CROWN_COUNT
    union['v18VoxelMethodFrozen'] = True
    union['voxelSize'] = VOXEL_SIZE
    union['rootConnectorMethod'] = 'V10_ROOT_FOLLOWING_ARC'
    union['rootArcConnectorUsed'] = True
    union['ellipsoidRootBridgeUsed'] = False
    union['rootArcRearwardOffset'] = ROOT_ARC_REARWARD_OFFSET
    union['rootArcDownOffset'] = ROOT_ARC_DOWN_OFFSET
    union['rootArcBevelDepth'] = ROOT_ARC_BEVEL_DEPTH
    union['independentlyCappedCrownObjectsBeforeUnion'] = CROWN_COUNT
    union['crownObjectsAfterUnion'] = 1
    union['connectedComponentsAfterRemesh'] = components
    union['scalpCapShellUsed'] = False
    union['separateVisibleFiberTubes'] = False

    scene['heroVersion'] = 'v19'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v18'
    scene['controlledVariable'] = 'HAIR_CROWN_ADJACENT_ROOT_ARC_BRIDGE_AND_VISIBLE_VALLEY_CONTINUITY'
    scene['hairSurfaceAuthoringMethod'] = 'V10_CROWN_LOCKS_CONNECTED_BY_ROOT_FOLLOWING_ARC_VOXEL_UNION'
    scene['v10VisibleLockSilhouetteAuthority'] = True
    scene['v10CrownCenterlinesAndWidthsFrozen'] = CROWN_COUNT
    scene['v18VoxelMethodFrozen'] = True
    scene['voxelSize'] = VOXEL_SIZE
    scene['rootConnectorMethod'] = 'V10_ROOT_FOLLOWING_ARC'
    scene['rootArcConnectorUsed'] = True
    scene['ellipsoidRootBridgeUsed'] = False
    scene['rootArcRearwardOffset'] = ROOT_ARC_REARWARD_OFFSET
    scene['rootArcDownOffset'] = ROOT_ARC_DOWN_OFFSET
    scene['rootArcBevelDepth'] = ROOT_ARC_BEVEL_DEPTH
    scene['rootArcControlPoints'] = len(roots)
    scene['independentlyCappedCrownObjectsBeforeUnion'] = CROWN_COUNT
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
    union, components, roots = build_connected_crown_with_root_arc(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v19',
        'assetName': 'Radar Scout 3D Static Hero v19',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v18',
        'controlledVariable': 'HAIR_CROWN_ADJACENT_ROOT_ARC_BRIDGE_AND_VISIBLE_VALLEY_CONTINUITY',
        'hairSurfaceAuthoringMethod': 'V10_CROWN_LOCKS_CONNECTED_BY_ROOT_FOLLOWING_ARC_VOXEL_UNION',
        'v10VisibleLockSilhouetteAuthority': True,
        'v10CrownCenterlinesAndWidthsFrozen': CROWN_COUNT,
        'v18VoxelMethodFrozen': True,
        'voxelSize': VOXEL_SIZE,
        'rootConnectorMethod': 'V10_ROOT_FOLLOWING_ARC',
        'rootArcConnectorUsed': True,
        'ellipsoidRootBridgeUsed': False,
        'rootArcRearwardOffset': ROOT_ARC_REARWARD_OFFSET,
        'rootArcDownOffset': ROOT_ARC_DOWN_OFFSET,
        'rootArcBevelDepth': ROOT_ARC_BEVEL_DEPTH,
        'rootArcControlPoints': len(roots),
        'rootArcPoints': [list(p) for p in roots],
        'independentlyCappedCrownObjectsBeforeUnion': CROWN_COUNT,
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
