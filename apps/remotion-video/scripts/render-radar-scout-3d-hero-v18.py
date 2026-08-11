import bpy
import hashlib
import importlib.util
import json
import os
import sys
from collections import deque

# Radar Scout 3D Hero v18
# V14-V17 falsified scalp-cap/single-sheet crown silhouettes. V18 preserves the
# good part of V10 (seven distinct crown-lock centerlines/width silhouettes) and
# removes the bad part (seven independently capped crown objects): apply the V10
# crown meshes, overlap them through one buried root bridge, then voxel-remesh
# the entire crown into one connected volumetric manifold mesh.

HERE = os.path.dirname(os.path.abspath(__file__))
V10_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v10.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v10', V10_PATH)
v10 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v10)

CROWN_COUNT = 7
VOXEL_SIZE = 0.035
ROOT_BRIDGE_LOCATION = (0.0, -0.10, 3.47)
ROOT_BRIDGE_SCALE = (0.69, 0.43, 0.27)


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def set_active(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_all_modifiers(obj):
    set_active(obj)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def add_buried_root_bridge(material):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=40,
        ring_count=24,
        location=ROOT_BRIDGE_LOCATION,
    )
    obj = bpy.context.object
    obj.name = 'HairCrownBuriedRootBridgeV18'
    obj.scale = ROOT_BRIDGE_SCALE
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    obj['buriedRootBridge'] = True
    obj['visibleSilhouetteAuthority'] = False
    return obj


def join_objects(objects, active):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    return active


def connected_component_count(mesh):
    adjacency = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].append(b)
        adjacency[b].append(a)
    seen = set()
    count = 0
    for start in range(len(mesh.vertices)):
        if start in seen:
            continue
        count += 1
        q = deque([start])
        seen.add(start)
        while q:
            v = q.popleft()
            for n in adjacency[v]:
                if n not in seen:
                    seen.add(n)
                    q.append(n)
    return count


def build_connected_crown_union(scene):
    # Exact V10 remains the source authority for all hero geometry and hair.
    v10.geometry_v10(scene)

    crown = []
    for ci in range(1, CROWN_COUNT + 1):
        obj = bpy.data.objects.get(f'HairMassPrimaryV10_{ci:02d}')
        if obj is None:
            raise RuntimeError(f'missing V10 crown object {ci}')
        apply_all_modifiers(obj)
        obj['v10CrownCenterlineAndWidthsFrozen'] = True
        crown.append(obj)

    # The bridge exists only inside the lower/root overlap region. It gives the
    # voxel remesher one connected volume without replacing V10's visible peaks
    # with a scalp-cap shell.
    pearl = bpy.data.materials['ScoutHairMassPearlV10']
    bridge = add_buried_root_bridge(pearl)

    union = join_objects(crown + [bridge], crown[0])
    union.name = 'HairCrownConnectedVolumetricUnionV18'
    union.data.name = 'HairCrownConnectedVolumetricUnionV18Mesh'

    # Blender voxel remesh operates on the current mesh volume and creates one
    # manifold surface where the V10 locks and buried bridge overlap.
    union.data.remesh_mode = 'VOXEL'
    union.data.remesh_voxel_size = VOXEL_SIZE
    union.data.remesh_voxel_adaptivity = 0.0
    union.data.use_remesh_fix_poles = True
    union.data.use_remesh_preserve_volume = True
    union.data.use_remesh_preserve_attributes = True
    set_active(union)
    if not hasattr(bpy.ops.object, 'voxel_remesh'):
        raise RuntimeError('Blender object.voxel_remesh operator unavailable')
    bpy.ops.object.voxel_remesh()

    for poly in union.data.polygons:
        poly.use_smooth = True

    components = connected_component_count(union.data)
    if components != 1:
        raise RuntimeError(f'expected one connected crown after voxel remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V10_CROWN_LOCKS_CONNECTED_BY_BURIED_ROOT_VOXEL_UNION'
    union['v10VisibleLockSilhouetteAuthority'] = True
    union['v10CrownCenterlinesAndWidthsFrozen'] = CROWN_COUNT
    union['independentlyCappedCrownObjectsBeforeUnion'] = CROWN_COUNT
    union['crownObjectsAfterUnion'] = 1
    union['connectedComponentsAfterRemesh'] = components
    union['buriedRootBridge'] = True
    union['scalpCapShellUsed'] = False
    union['separateVisibleFiberTubes'] = False
    union['voxelSize'] = VOXEL_SIZE

    scene['heroVersion'] = 'v18'
    scene['preferredBaselineInput'] = 'v10'
    scene['controlledVariable'] = 'HAIR_CROWN_CONNECTED_VOLUMETRIC_CLUMP_UNION_WITH_REMESHED_ROOT_MASS'
    scene['hairSurfaceAuthoringMethod'] = 'V10_CROWN_LOCKS_CONNECTED_BY_BURIED_ROOT_VOXEL_UNION'
    scene['v10VisibleLockSilhouetteAuthority'] = True
    scene['v10CrownCenterlinesAndWidthsFrozen'] = CROWN_COUNT
    scene['independentlyCappedCrownObjectsBeforeUnion'] = CROWN_COUNT
    scene['crownObjectsAfterUnion'] = 1
    scene['connectedComponentsAfterRemesh'] = components
    scene['buriedRootBridge'] = True
    scene['scalpCapShellUsed'] = False
    scene['voxelRemeshPerformed'] = True
    scene['voxelSize'] = VOXEL_SIZE
    scene['v10MaterialPalettePreserved'] = True
    scene['frozenV10PrimaryClumps8Through14'] = 7
    scene['secondaryCenterlinesAndWidthsFrozen'] = True
    scene['sideFramingPrimaryFrozen'] = True
    scene['centralBangsFrozen'] = True
    scene['separateVisibleFiberTubes'] = False
    scene['primaryHairObjects'] = 8  # one crown union + frozen primaries 8-14
    scene['secondaryMassClumps'] = 6
    scene['totalHairObjects'] = 14
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

    v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v10.v8.v6.v5.v2.v1.build_scene(scene)
    v10.v8.v6.v5.v2.geometry_v2(scene)
    v10.v8.v6.v5.geometry_v5(scene)
    union, components = build_connected_crown_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v18',
        'assetName': 'Radar Scout 3D Static Hero v18',
        'preferredBaselineInput': 'v10',
        'controlledVariable': 'HAIR_CROWN_CONNECTED_VOLUMETRIC_CLUMP_UNION_WITH_REMESHED_ROOT_MASS',
        'hairSurfaceAuthoringMethod': 'V10_CROWN_LOCKS_CONNECTED_BY_BURIED_ROOT_VOXEL_UNION',
        'v10VisibleLockSilhouetteAuthority': True,
        'v10CrownCenterlinesAndWidthsFrozen': CROWN_COUNT,
        'independentlyCappedCrownObjectsBeforeUnion': CROWN_COUNT,
        'crownObjectsAfterUnion': 1,
        'connectedComponentsAfterRemesh': components,
        'buriedRootBridge': True,
        'rootBridgeLocation': list(ROOT_BRIDGE_LOCATION),
        'rootBridgeScale': list(ROOT_BRIDGE_SCALE),
        'scalpCapShellUsed': False,
        'voxelRemeshPerformed': True,
        'voxelSize': VOXEL_SIZE,
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
